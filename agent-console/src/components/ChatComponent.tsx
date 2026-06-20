'use client';

import { useAgentConsole } from '@/lib/agentConsoleContext';
import { streamHasPendingTools, StreamState } from '@/types/protocol';
import ToolCallCard from './ToolCallCard';

function StreamView({ stream }: { stream: StreamState }) {
  const { selection, select, scrollRegistry } = useAgentConsole();

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
      <header className="flex items-center justify-between text-xs text-zinc-500">
        <span>{stream.stream_id}</span>
        <span>
          {stream.tokens.length} tokens - {stream.toolCalls.size} tools
          {stream.isEnded ? ' - ended' : ''}
          {streamHasPendingTools(stream) ? ' - paused' : ''}
        </span>
      </header>

      {stream.tokenSegments.map((segment, index) => {
        const text = segment.tokens.join('');
        const toolCall = segment.toolCallId
          ? stream.toolCalls.get(segment.toolCallId)
          : undefined;
        const result = segment.toolCallId
          ? stream.toolResults.get(segment.toolCallId)
          : undefined;

        const segmentSelected =
          selection?.kind === 'segment' &&
          selection.streamId === stream.stream_id &&
          selection.segmentIndex === index;

        const toolSelected =
          segment.toolCallId &&
          ((selection?.kind === 'tool' && selection.callId === segment.toolCallId) ||
            (selection?.kind === 'timeline' &&
              (selection.eventId === `tool-${segment.toolCallId}` ||
                selection.eventId === `result-${segment.toolCallId}`)));

        return (
          <div key={segment.id} className="space-y-2">
            {text && (
              <p
                ref={(node) =>
                  scrollRegistry.registerSegment(stream.stream_id, index, node)
                }
                onClick={() =>
                  select({ kind: 'segment', streamId: stream.stream_id, segmentIndex: index })
                }
                className={`font-mono text-[15px] leading-relaxed whitespace-pre-wrap break-words cursor-pointer rounded px-1 py-0.5 text-slate-900 ${
                  segmentSelected ? 'bg-amber-100 ring-1 ring-amber-300' : 'hover:bg-white'
                }`}
              >
                {text}
              </p>
            )}

            {toolCall && (
              <ToolCallCard
                toolCall={toolCall}
                result={result}
                highlighted={Boolean(toolSelected)}
                onSelect={() =>
                  select({ kind: 'tool', callId: toolCall.call_id })
                }
                registerRef={(node) =>
                  scrollRegistry.registerTool(toolCall.call_id, node)
                }
              />
            )}
          </div>
        );
      })}

      {stream.tokens.length === 0 && stream.toolCalls.size === 0 && (
        <p className="text-sm text-zinc-500">Waiting for tokens...</p>
      )}
    </section>
  );
}

export default function ChatComponent() {
  const { state } = useAgentConsole();

  if (state.userMessages.length === 0 && state.streamOrder.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 text-sm">
        Send a message to start a session.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.userMessages.map((message) => (
          <div key={message.id} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs text-blue-700 mb-1">you</p>
            <p className="whitespace-pre-wrap text-sm text-zinc-900">{message.content}</p>
          </div>
        ))}

        {state.streamOrder.map((streamId) => {
          const stream = state.streams.get(streamId);
          if (!stream) {
            return null;
          }
          return <StreamView key={streamId} stream={stream} />;
        })}
      </div>
    </div>
  );
}
