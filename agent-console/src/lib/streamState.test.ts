import { describe, expect, it } from 'vitest';
import { appendToken, emptyStream, insertToolCall } from './streamState';
import { streamHasPendingTools, ToolCallMessage, ToolResultMessage } from '@/types/protocol';

function toolCall(callId: string, seq: number): ToolCallMessage {
  return {
    type: 'TOOL_CALL',
    seq,
    call_id: callId,
    tool_name: 'lookup_metric',
    args: { metric: 'revenue' },
    stream_id: 's1',
  };
}

function toolResult(callId: string, seq: number): ToolResultMessage {
  return {
    type: 'TOOL_RESULT',
    seq,
    call_id: callId,
    result: { value: '23%' },
    stream_id: 's1',
  };
}

describe('streamState', () => {
  it('freezes pre-tool text on the segment before the card', () => {
    const stream = emptyStream('s1');
    appendToken(stream, 'Before ');
    insertToolCall(stream, toolCall('tc1', 2));

    expect(stream.tokenSegments[0].tokens.join('')).toBe('Before ');
    expect(stream.tokenSegments[0].toolCallId).toBe('tc1');
    expect(stream.tokenSegments[1].tokens).toEqual([]);
  });

  it('appends post-tool tokens after the tool call segment', () => {
    const stream = emptyStream('s1');
    appendToken(stream, 'Before ');
    insertToolCall(stream, toolCall('tc1', 2));
    stream.toolResults.set('tc1', toolResult('tc1', 3));

    appendToken(stream, 'After');

    expect(stream.tokenSegments[1].tokens.join('')).toBe('After');
    expect(stream.tokenSegments[0].toolCallId).toBe('tc1');
  });

  it('stays paused until every pending tool has a result', () => {
    const stream = emptyStream('s1');
    insertToolCall(stream, toolCall('tc1', 1));
    insertToolCall(stream, toolCall('tc2', 2));

    expect(streamHasPendingTools(stream)).toBe(true);

    stream.toolResults.set('tc1', toolResult('tc1', 3));
    expect(streamHasPendingTools(stream)).toBe(true);

    stream.toolResults.set('tc2', toolResult('tc2', 4));
    expect(streamHasPendingTools(stream)).toBe(false);
  });

  it('ignores tokens while tools are pending', () => {
    const stream = emptyStream('s1');
    appendToken(stream, 'A');
    insertToolCall(stream, toolCall('tc1', 2));
    appendToken(stream, 'B');

    expect(stream.tokens).toEqual(['A']);
    expect(stream.tokenSegments[1].tokens).toEqual([]);
  });
});
