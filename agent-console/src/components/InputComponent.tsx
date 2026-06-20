'use client';

import { useState } from 'react';
import { useAgentConsole } from '@/lib/agentConsoleContext';

export default function InputComponent() {
  const { sendUserMessage, canSend, connectionState } = useAgentConsole();
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || !canSend) {
      return;
    }
    sendUserMessage(trimmed);
    setValue('');
  };

  return (
    <div className="border-t border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-600">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            connectionState === 'connected' || connectionState === 'resuming'
              ? 'bg-emerald-500'
              : connectionState === 'reconnecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-rose-500'
          }`}
        />
        <span className="capitalize">{connectionState}</span>
        {connectionState === 'reconnecting' && (
          <span className="text-amber-700">reconnecting - chat history stays readable</span>
        )}
      </div>

      <div className="flex gap-2">
        <textarea
          rows={2}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Message the agent..."
          className="flex-1 resize-none rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend || !value.trim()}
          className="self-end rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:bg-zinc-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}
