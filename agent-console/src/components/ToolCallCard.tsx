'use client';

import { ToolCallMessage, ToolResultMessage } from '@/types/protocol';

interface Props {
  toolCall: ToolCallMessage;
  result?: ToolResultMessage;
  highlighted?: boolean;
  onSelect?: () => void;
  registerRef?: (node: HTMLDivElement | null) => void;
}

export default function ToolCallCard({
  toolCall,
  result,
  highlighted,
  onSelect,
  registerRef,
}: Props) {
  const waiting = !result;

  return (
    <div
      ref={registerRef}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onSelect?.();
        }
      }}
      className={`rounded-md border text-sm transition-colors ${
        highlighted
          ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
          : 'border-sky-200 bg-sky-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-sky-100">
        <div>
          <p className="font-medium text-sky-950">{toolCall.tool_name}</p>
          <p className="text-xs text-sky-700">{toolCall.call_id}</p>
        </div>
        <span className={`text-xs font-medium ${waiting ? 'text-amber-700' : 'text-emerald-700'}`}>
          {waiting ? 'waiting' : 'done'}
        </span>
      </div>

      <div className="px-3 py-2 space-y-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">args</p>
          <pre className="overflow-x-auto rounded bg-white p-2 text-xs text-zinc-800 border border-zinc-100">
            {JSON.stringify(toolCall.args, null, 2)}
          </pre>
        </div>

        {result && (
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 mb-1">result</p>
            <pre className="overflow-x-auto rounded bg-white p-2 text-xs text-zinc-800 border border-zinc-100">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
