'use client';

import { useState } from 'react';
import ChatComponent from '@/components/ChatComponent';
import ContextInspectorComponent from '@/components/ContextInspectorComponent';
import InputComponent from '@/components/InputComponent';
import TimelineComponent from '@/components/TimelineComponent';

const panelToggleBase =
  'rounded border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400';
const panelToggleActive = 'border-sky-700 bg-sky-700 text-white';
const panelToggleInactive = 'border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100';

export default function HomePage() {
  const [showTimeline, setShowTimeline] = useState(true);
  const [showContext, setShowContext] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Agent Console</h1>
          <p className="text-xs text-zinc-500">WebSocket session against ws://localhost:4747/ws</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowTimeline((value) => !value)}
            className={`${panelToggleBase} ${
              showTimeline ? panelToggleActive : panelToggleInactive
            }`}
          >
            {showTimeline ? 'Hide trace' : 'Show trace'}
          </button>
          <button
            type="button"
            onClick={() => setShowContext((value) => !value)}
            className={`${panelToggleBase} ${
              showContext ? panelToggleActive : panelToggleInactive
            }`}
          >
            {showContext ? 'Hide context' : 'Show context'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          <ChatComponent />
        </main>

        {showTimeline && (
          <aside className="w-80 shrink-0">
            <TimelineComponent />
          </aside>
        )}

        {showContext && (
          <aside className="w-96 shrink-0">
            <ContextInspectorComponent />
          </aside>
        )}
      </div>

      <InputComponent />
    </div>
  );
}
