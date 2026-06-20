
import {
  ClientMessage,
  ConnectionState,
  PingMessage,
  ResumeMessage,
  ServerMessage,
} from '@/types/protocol';
import { ReorderingBuffer } from './reorderingBuffer';

export type MessageHandler = (message: ServerMessage) => void;
export type StateChangeHandler = (state: ConnectionState) => void;
export type PongSentHandler = (echo: string, seq: number) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private messageHandlers: MessageHandler[] = [];
  private stateChangeHandlers: StateChangeHandler[] = [];
  private pongSentHandlers: PongSentHandler[] = [];
  private lastProcessedSeq = 0;
  private reorderingBuffer = new ReorderingBuffer();
  private reconnectAttempt = 0;
  private readonly maxReconnectAttempts = 20;
  private readonly baseReconnectDelay = 500;
  private messageQueue: ClientMessage[] = [];
  private intentionalDisconnect = false;

  constructor(private readonly url: string) {
    this.reorderingBuffer.setLastProcessedSeq(0);
  }

  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting' || this.state === 'resuming') {
      return;
    }

    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempt = 0;

          if (this.lastProcessedSeq > 0) {
            this.setState('resuming');
            const resume: ResumeMessage = { type: 'RESUME', last_seq: this.lastProcessedSeq };
            this.sendRaw(resume);
          } else {
            this.setState('connected');
          }

          this.flushQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as ServerMessage;
            this.ingest(message);
          } catch (error) {
            console.error('[ws] bad frame', error);
          }
        };

        this.ws.onerror = (event) => {
          console.error('[ws] error', event);
          reject(new Error('WebSocket error'));
        };

        this.ws.onclose = () => {
          this.ws = null;
          if (!this.intentionalDisconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.setState('disconnected');
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.setState('disconnected');
    this.reconnectAttempt = 0;
    this.ws?.close();
    this.ws = null;
  }

  sendMessage(message: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    this.sendRaw(message);
  }

 
  sendCritical(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw(message);
    } else {
      
      this.messageQueue.unshift(message);
    }
  }

  
  private sendImmediate(message: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw(message);
    } else {
     
      this.messageQueue.unshift(message);
    }
  }

  private sendRaw(message: ClientMessage): void {
    this.ws?.send(JSON.stringify(message));
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendRaw(message);
      }
    }
  }

  private ingest(message: ServerMessage): void {
    this.reorderingBuffer.addMessage(message);
    for (const item of this.reorderingBuffer.drainReady()) {
      this.dispatch(item);
    }
  }

  private dispatch(message: ServerMessage): void {
    this.lastProcessedSeq = message.seq;

    if (this.state === 'resuming' && message.type !== 'PING') {
      this.setState('connected');
    }

    if (message.type === 'PING') {
      this.replyToPing(message as PingMessage);
    }

    for (const handler of this.messageHandlers) {
      handler(message);
    }
  }

  private replyToPing(message: PingMessage): void {
    const echo = message.challenge ?? '';
    this.sendImmediate({ type: 'PONG', echo });
    for (const handler of this.pongSentHandlers) {
      handler(echo, message.seq);
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalDisconnect) {
      return;
    }

    const delay = Math.min(this.baseReconnectDelay * 2 ** this.reconnectAttempt, 10_000);

    if (this.reconnectAttempt >= this.maxReconnectAttempts) {
      this.setState('error');
      return;
    }

    this.setState('reconnecting');

    setTimeout(() => {
      this.reconnectAttempt += 1;
      this.connect().catch(() => {
        if (this.state === 'reconnecting') {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  private setState(next: ConnectionState): void {
    if (this.state === next) {
      return;
    }

    this.state = next;
    for (const handler of this.stateChangeHandlers) {
      handler(next);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((item) => item !== handler);
    };
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.push(handler);
    return () => {
      this.stateChangeHandlers = this.stateChangeHandlers.filter((item) => item !== handler);
    };
  }

  onPongSent(handler: PongSentHandler): () => void {
    this.pongSentHandlers.push(handler);
    return () => {
      this.pongSentHandlers = this.pongSentHandlers.filter((item) => item !== handler);
    };
  }

  getState(): ConnectionState {
    return this.state;
  }

  getLastProcessedSeq(): number {
    return this.lastProcessedSeq;
  }

  isConnected(): boolean {
    return this.state === 'connected' || this.state === 'resuming';
  }
}
