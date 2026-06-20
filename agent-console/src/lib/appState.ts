import {
  ContextSnapshotMessage,
  ServerMessage,
  StreamState,
  TimelineEvent,
  ToolCallMessage,
  ToolResultMessage,
  timelineFieldsFromMessage,
} from '@/types/protocol';
import {
  appendToken,
  applyToolResult,
  emptyStream,
  insertToolCall,
} from '@/lib/streamState';

export interface AppState {
  streams: Map<string, StreamState>;
  streamOrder: string[];
  userMessages: Array<{ id: string; content: string; timestamp: number }>;
  timelineEvents: TimelineEvent[];
  contextSnapshots: Map<string, import('@/types/protocol').ContextSnapshot[]>;
}

export type AppAction =
  | { type: 'ADD_TOKEN'; payload: { stream_id: string; text: string } }
  | { type: 'TOOL_CALL'; payload: ToolCallMessage }
  | { type: 'TOOL_RESULT'; payload: ToolResultMessage }
  | { type: 'STREAM_END'; payload: { stream_id: string } }
  | { type: 'ADD_CONTEXT_SNAPSHOT'; payload: ContextSnapshotMessage }
  | { type: 'APPEND_TIMELINE'; payload: TimelineEvent }
  | { type: 'ADD_USER_MESSAGE'; payload: { content: string } };

function cloneStream(stream: StreamState): StreamState {
  return {
    ...stream,
    tokens: [...stream.tokens],
    toolCalls: new Map(stream.toolCalls),
    toolResults: new Map(stream.toolResults),
    tokenSegments: stream.tokenSegments.map((segment) => ({
      ...segment,
      tokens: [...segment.tokens],
    })),
  };
}

function upsertStream(
  streams: Map<string, StreamState>,
  streamOrder: string[],
  streamId: string,
): [Map<string, StreamState>, StreamState] {
  const nextStreams = new Map(streams);
  let stream = nextStreams.get(streamId);

  if (!stream) {
    stream = emptyStream(streamId);
    nextStreams.set(streamId, stream);
    streamOrder.push(streamId);
  }

  return [nextStreams, cloneStream(stream)];
}

export function createInitialState(): AppState {
  return {
    streams: new Map(),
    streamOrder: [],
    userMessages: [],
    timelineEvents: [],
    contextSnapshots: new Map(),
  };
}

export function appStateReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TOKEN': {
      const { stream_id, text } = action.payload;
      const streamOrder = [...state.streamOrder];
      const [streams, stream] = upsertStream(state.streams, streamOrder, stream_id);
      appendToken(stream, text);
      streams.set(stream_id, stream);

      return { ...state, streams, streamOrder };
    }

    case 'TOOL_CALL': {
      const toolCall = action.payload;
      const { stream_id } = toolCall;
      const streamOrder = [...state.streamOrder];
      const [streams, stream] = upsertStream(state.streams, streamOrder, stream_id);
      insertToolCall(stream, toolCall);
      streams.set(stream_id, stream);

      return { ...state, streams, streamOrder };
    }

    case 'TOOL_RESULT': {
      const result = action.payload;
      const { stream_id, call_id } = result;
      const stream = state.streams.get(stream_id);
      if (!stream) {
        return state;
      }

      const streams = new Map(state.streams);
      const nextStream = cloneStream(stream);
      nextStream.toolResults.set(call_id, result);
      applyToolResult(nextStream, call_id);
      streams.set(stream_id, nextStream);

      return { ...state, streams };
    }

    case 'STREAM_END': {
      const { stream_id } = action.payload;
      const stream = state.streams.get(stream_id);
      if (!stream) {
        return state;
      }

      const streams = new Map(state.streams);
      const nextStream = cloneStream(stream);
      nextStream.isEnded = true;
      streams.set(stream_id, nextStream);

      return { ...state, streams };
    }

    case 'ADD_CONTEXT_SNAPSHOT': {
      const { context_id, seq, data } = action.payload;
      const snapshots = new Map(state.contextSnapshots);
      const history = [...(snapshots.get(context_id) ?? [])];
      history.push({ context_id, seq, data, timestamp: Date.now() });
      snapshots.set(context_id, history);

      return { ...state, contextSnapshots: snapshots };
    }

    case 'APPEND_TIMELINE': {
      return {
        ...state,
        timelineEvents: [...state.timelineEvents, action.payload],
      };
    }

    case 'ADD_USER_MESSAGE': {
      return {
        ...state,
        userMessages: [
          ...state.userMessages,
          {
            id: `user-${Date.now()}-${state.userMessages.length}`,
            content: action.payload.content,
            timestamp: Date.now(),
          },
        ],
      };
    }

    default:
      return state;
  }
}

export function buildTimelineEvent(
  message: ServerMessage | { type: 'PONG'; seq: number; echo: string },
  overrides: Partial<TimelineEvent> = {},
): TimelineEvent {
  const seq = 'seq' in message ? message.seq : 0;
  const fields = message.type !== 'PONG' ? timelineFieldsFromMessage(message as ServerMessage) : {};

  const id =
    overrides.id ??
    (message.type === 'TOOL_CALL'
      ? `tool-${(message as ToolCallMessage).call_id}`
      : message.type === 'TOOL_RESULT'
        ? `result-${(message as ToolResultMessage).call_id}`
        : message.type === 'PONG'
          ? `pong-${seq}-${Date.now()}`
          : `${message.type}-${seq}`);

  return {
    id,
    type: message.type,
    seq,
    timestamp: Date.now(),
    message,
    searchText: JSON.stringify(message).toLowerCase(),
    streamId: fields.streamId,
    callId: fields.callId,
    ...overrides,
  };
}
