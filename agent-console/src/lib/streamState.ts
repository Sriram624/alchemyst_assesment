import { StreamState, TokenSegment, ToolCallMessage, streamHasPendingTools } from '@/types/protocol';

let segmentCounter = 0;

function nextSegmentId(): string {
  segmentCounter += 1;
  return `seg-${segmentCounter}`;
}

export function emptyStream(streamId: string): StreamState {
  return {
    stream_id: streamId,
    tokens: [],
    toolCalls: new Map(),
    toolResults: new Map(),
    isEnded: false,
    startTime: Date.now(),
    tokenSegments: [{ id: nextSegmentId(), tokens: [] }],
  };
}

export function appendToken(stream: StreamState, text: string): void {
  if (streamHasPendingTools(stream)) {
    return;
  }

  stream.tokens.push(text);
  const tail = stream.tokenSegments[stream.tokenSegments.length - 1];
  tail.tokens.push(text);
}

export function insertToolCall(stream: StreamState, toolCall: ToolCallMessage): void {
  const { call_id } = toolCall;
  stream.toolCalls.set(call_id, toolCall);

  if (stream.tokenSegments.length === 0) {
    stream.tokenSegments.push({ id: nextSegmentId(), tokens: [], toolCallId: call_id });
    stream.tokenSegments.push({ id: nextSegmentId(), tokens: [] });
    return;
  }

  const tail = stream.tokenSegments[stream.tokenSegments.length - 1];
  tail.toolCallId = call_id;
  stream.tokenSegments.push({ id: nextSegmentId(), tokens: [] });
}

export function applyToolResult(stream: StreamState, callId: string): void {
  // pause state is derived from pending tools; nothing else required here
  void callId;
}

export function segmentDomId(streamId: string, segment: TokenSegment, index: number): string {
  return `${streamId}:${segment.id}:${index}`;
}
