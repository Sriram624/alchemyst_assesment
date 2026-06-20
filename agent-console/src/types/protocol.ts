export type ServerMessageType =
  | 'TOKEN'
  | 'TOOL_CALL'
  | 'TOOL_RESULT'
  | 'CONTEXT_SNAPSHOT'
  | 'PING'
  | 'STREAM_END'
  | 'ERROR';

export type ClientMessageType = 'USER_MESSAGE' | 'PONG' | 'RESUME' | 'TOOL_ACK';

export type MessageType = ServerMessageType | ClientMessageType | 'PONG';

export interface TokenMessage {
  type: 'TOKEN';
  seq: number;
  text: string;
  stream_id: string;
}

export interface ToolCallMessage {
  type: 'TOOL_CALL';
  seq: number;
  call_id: string;
  tool_name: string;
  args: Record<string, unknown>;
  stream_id: string;
}

export interface ToolResultMessage {
  type: 'TOOL_RESULT';
  seq: number;
  call_id: string;
  result: Record<string, unknown>;
  stream_id: string;
}

export interface ContextSnapshotMessage {
  type: 'CONTEXT_SNAPSHOT';
  seq: number;
  context_id: string;
  data: Record<string, unknown>;
}

export interface PingMessage {
  type: 'PING';
  seq: number;
  challenge: string;
}

export interface StreamEndMessage {
  type: 'STREAM_END';
  seq: number;
  stream_id: string;
}

export interface ErrorMessage {
  type: 'ERROR';
  seq: number;
  code: string;
  message: string;
}

export type ServerMessage =
  | TokenMessage
  | ToolCallMessage
  | ToolResultMessage
  | ContextSnapshotMessage
  | PingMessage
  | StreamEndMessage
  | ErrorMessage;

export interface UserMessageMessage {
  type: 'USER_MESSAGE';
  content: string;
}

export interface PongMessage {
  type: 'PONG';
  echo: string;
}

export interface ResumeMessage {
  type: 'RESUME';
  last_seq: number;
}

export interface ToolAckMessage {
  type: 'TOOL_ACK';
  call_id: string;
}

export type ClientMessage =
  | UserMessageMessage
  | PongMessage
  | ResumeMessage
  | ToolAckMessage;

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'resuming'
  | 'error';

export interface TokenSegment {
  id: string;
  tokens: string[];
  toolCallId?: string;
}

export interface StreamState {
  stream_id: string;
  tokens: string[];
  toolCalls: Map<string, ToolCallMessage>;
  toolResults: Map<string, ToolResultMessage>;
  isEnded: boolean;
  startTime: number;
  tokenSegments: TokenSegment[];
}

export interface ContextSnapshot {
  context_id: string;
  seq: number;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface TimelineEvent {
  id: string;
  type: MessageType;
  seq: number;
  endSeq?: number;
  timestamp: number;
  message: ServerMessage | { type: 'PONG'; seq: number; echo: string };
  searchText: string;
  streamId?: string;
  callId?: string;
  batchedTokenCount?: number;
  batchedText?: string;
  batchDurationMs?: number;
}

export type UiSelection =
  | { kind: 'tool'; callId: string }
  | { kind: 'segment'; streamId: string; segmentIndex: number }
  | { kind: 'timeline'; eventId: string }
  | null;

export function streamHasPendingTools(stream: StreamState): boolean {
  for (const callId of stream.toolCalls.keys()) {
    if (!stream.toolResults.has(callId)) {
      return true;
    }
  }
  return false;
}

export function timelineFieldsFromMessage(message: ServerMessage): {
  streamId?: string;
  callId?: string;
} {
  switch (message.type) {
    case 'TOKEN':
    case 'STREAM_END':
      return { streamId: message.stream_id };
    case 'TOOL_CALL':
    case 'TOOL_RESULT':
      return { streamId: message.stream_id, callId: message.call_id };
    default:
      return {};
  }
}
