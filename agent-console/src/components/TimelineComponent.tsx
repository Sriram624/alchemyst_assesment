'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useAgentConsole } from '@/lib/agentConsoleContext';
import {
  ContextSnapshotMessage,
  ErrorMessage,
  TimelineEvent,
  ToolCallMessage,
  ToolResultMessage,
} from '@/types/protocol';

const FILTERS = ['TOKEN', 'TOOL_CALL', 'TOOL_RESULT', 'CONTEXT_SNAPSHOT', 'PING', 'PONG', 'ERROR'] as const;
const filterButtonBase =
  'rounded border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400';
const filterButtonActive = 'border-sky-700 bg-sky-700 text-white';
const filterButtonInactive = 'border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100';

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function labelFor(event: TimelineEvent): string {
  if (event.type === 'TOKEN' && event.batchedTokenCount) {
    const duration = formatDuration(event.batchDurationMs ?? 0);
    return `Streamed ${event.batchedTokenCount} tokens (${duration})`;
  }

  switch (event.type) {
    case 'TOOL_CALL':
      return `Tool ${(event.message as ToolCallMessage).tool_name}`;
    case 'TOOL_RESULT':
      return `Result ${(event.message as ToolResultMessage).call_id}`;
    case 'CONTEXT_SNAPSHOT':
      return `Context ${(event.message as ContextSnapshotMessage).context_id}`;
    case 'ERROR':
      return `Error ${(event.message as ErrorMessage).code}`;
    case 'PING':
      return 'Ping';
    case 'PONG':
      return 'Pong';
    default:
      return event.type;
  }
}

const TimelineRow = memo(function TimelineRow({
  event,
  active,
  linked,
  expanded,
  onToggleExpand,
  onSelect,
  registerRef,
}: {
  event: TimelineEvent;
  active: boolean;
  linked: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  registerRef: (node: HTMLDivElement | null) => void;
}) {
  const isBatch = event.type === 'TOKEN' && Boolean(event.batchedTokenCount);

  return (
    <div
      ref={registerRef}
      className={`border-l-2 px-3 py-2 text-sm cursor-pointer ${
        linked ? 'ml-4 border-l-violet-300' : 'border-l-transparent'
      } ${active ? 'bg-sky-100 border-l-sky-500' : 'hover:bg-zinc-50'}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-zinc-900">{labelFor(event)}</p>
          <p className="text-xs text-zinc-500">
            seq {event.endSeq ? `${event.seq}-${event.endSeq}` : event.seq}
            {event.callId ? ` - ${event.callId}` : ''}
          </p>
        </div>
        {isBatch && (
          <button
            type="button"
            className="text-xs text-sky-700 hover:underline"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation();
              onToggleExpand();
            }}
          >
            {expanded ? 'hide' : 'expand'}
          </button>
        )}
      </div>

      {isBatch && expanded && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-white p-2 text-xs text-zinc-800 border border-zinc-100 whitespace-pre-wrap">
          {event.batchedText}
        </pre>
      )}
    </div>
  );
});

export default function TimelineComponent() {
  const { state, selection, select, scrollRegistry } = useAgentConsole();
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const toolCallIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of state.timelineEvents) {
      if (event.type === 'TOOL_CALL' && event.callId) {
        ids.add(event.callId);
      }
    }
    return ids;
  }, [state.timelineEvents]);

  const filtered = useMemo(() => {
    let rows = state.timelineEvents;

    if (filter) {
      rows = rows.filter((event) => event.type === filter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((event) => event.searchText.includes(q));
    }

    return rows;
  }, [state.timelineEvents, filter, query]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) {
      return;
    }
    node.scrollTop = node.scrollHeight;
  }, [filtered.length]);

  return (
    <div className="flex h-full flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-3 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Trace ({filtered.length})</h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search content or seq"
          className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
        />
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilter(null)}
            className={`${filterButtonBase} ${
              filter === null ? filterButtonActive : filterButtonInactive
            }`}
          >
            all
          </button>
          {FILTERS.map((type) => (
            <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
              className={`${filterButtonBase} ${
                filter === type ? filterButtonActive : filterButtonInactive
              }`}
            >
              {type.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-zinc-100">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No events yet.</p>
        ) : (
          filtered.map((event) => {
            const active = selection?.kind === 'timeline' && selection.eventId === event.id;
            const linked = event.type === 'TOOL_RESULT' && event.callId
              ? toolCallIds.has(event.callId)
              : false;

            return (
              <TimelineRow
                key={event.id}
                event={event}
                active={active}
                linked={linked}
                expanded={Boolean(expanded[event.id])}
                onToggleExpand={() =>
                  setExpanded((prev) => ({ ...prev, [event.id]: !prev[event.id] }))
                }
                onSelect={() => select({ kind: 'timeline', eventId: event.id })}
                registerRef={(node) => scrollRegistry.registerTimelineRow(event.id, node)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
