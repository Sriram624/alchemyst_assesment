'use client';

import { useMemo, useState } from 'react';
import { LazyJsonTree } from '@/components/JsonTree';
import { useAgentConsole } from '@/lib/agentConsoleContext';
import { payloadSizeBytes, shallowDiff } from '@/lib/jsonDiff';

export default function ContextInspectorComponent() {
  const { state } = useAgentConsole();
  const [selectedContextId, setSelectedContextId] = useState<string>('');
  const [index, setIndex] = useState(0);

  const contextIds = useMemo(
    () => Array.from(state.contextSnapshots.keys()),
    [state.contextSnapshots],
  );

  const contextId = selectedContextId || contextIds[0] || '';
  const snapshots = useMemo(
    () => (contextId ? state.contextSnapshots.get(contextId) ?? [] : []),
    [contextId, state.contextSnapshots],
  );
  const safeIndex = Math.min(index, Math.max(snapshots.length - 1, 0));
  const snapshot = snapshots[safeIndex];

  const diff = useMemo(() => {
    if (safeIndex < 1 || !snapshots[safeIndex - 1] || !snapshots[safeIndex]) {
      return undefined;
    }

    const previous = snapshots[safeIndex - 1].data;
    const current = snapshots[safeIndex].data;
    const comparisonBudget = payloadSizeBytes(current) > 200_000 ? 5_000 : 25_000;
    return shallowDiff(previous, current, comparisonBudget);
  }, [safeIndex, snapshots]);

  return (
    <div className="flex h-full flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 p-3 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-900">Context</h2>
        {contextIds.length === 0 ? (
          <p className="text-sm text-zinc-500">No snapshots yet.</p>
        ) : (
          <select
            value={contextId}
            onChange={(event) => {
              setSelectedContextId(event.target.value);
              setIndex(0);
            }}
            className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            {contextIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        )}
      </div>

      {snapshots.length > 0 && (
        <div className="border-b border-zinc-200 bg-zinc-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => setIndex((value) => Math.max(0, value - 1))}
              className="rounded bg-zinc-200 px-2 py-1 text-xs disabled:opacity-40"
            >
              prev
            </button>
            <input
              type="range"
              min={0}
              max={Math.max(snapshots.length - 1, 0)}
              value={safeIndex}
              onChange={(event) => setIndex(Number(event.target.value))}
              className="flex-1"
            />
            <button
              type="button"
              disabled={safeIndex >= snapshots.length - 1}
              onClick={() => setIndex((value) => Math.min(snapshots.length - 1, value + 1))}
              className="rounded bg-zinc-200 px-2 py-1 text-xs disabled:opacity-40"
            >
              next
            </button>
          </div>
          <p className="text-xs text-zinc-600">
            Snapshot {safeIndex + 1}/{snapshots.length}
            {snapshot ? ` - seq ${snapshot.seq}` : ''}
            {snapshot ? ` - ${Math.round(payloadSizeBytes(snapshot.data) / 1024)} KB` : ''}
          </p>
          {diff && safeIndex > 0 && (
            <p className="text-xs text-zinc-600">
              added {diff.added.size} - changed {diff.changed.size} - removed {diff.removed.size}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {snapshot ? (
          <LazyJsonTree data={snapshot.data} diff={diff} />
        ) : (
          <p className="text-sm text-zinc-500">Pick a context to inspect.</p>
        )}
      </div>
    </div>
  );
}
