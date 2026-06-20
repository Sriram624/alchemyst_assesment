import { ServerMessage } from '@/types/protocol';

export class ReorderingBuffer {
  private buffer = new Map<number, ServerMessage>();
  private nextExpectedSeq = 1;
  private readonly maxBufferSize = 10_000;

  setLastProcessedSeq(seq: number): void {
    this.nextExpectedSeq = seq + 1;
  }

  addMessage(message: ServerMessage): void {
    const { seq } = message;

    if (seq < this.nextExpectedSeq || this.buffer.has(seq)) {
      return;
    }

    if (this.buffer.size >= this.maxBufferSize) {
      const oldest = Math.min(...this.buffer.keys());
      this.buffer.delete(oldest);
    }

    this.buffer.set(seq, message);
  }

  drainReady(): ServerMessage[] {
    const ready: ServerMessage[] = [];

    while (this.buffer.has(this.nextExpectedSeq)) {
      ready.push(this.buffer.get(this.nextExpectedSeq)!);
      this.buffer.delete(this.nextExpectedSeq);
      this.nextExpectedSeq += 1;
    }

    return ready;
  }

  hasGaps(): boolean {
    if (this.buffer.size === 0) {
      return false;
    }
    const minSeq = Math.min(...this.buffer.keys());
    return minSeq > this.nextExpectedSeq;
  }

  getPendingCount(): number {
    return this.buffer.size;
  }

  clear(): void {
    this.buffer.clear();
  }

  getDebugState(): {
    nextExpectedSeq: number;
    bufferSize: number;
    pendingSeqs: number[];
  } {
    return {
      nextExpectedSeq: this.nextExpectedSeq,
      bufferSize: this.buffer.size,
      pendingSeqs: [...this.buffer.keys()].sort((a, b) => a - b),
    };
  }
}
