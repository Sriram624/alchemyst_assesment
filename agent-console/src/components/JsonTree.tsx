'use client';

import { useState } from 'react';

interface TreeNodeProps {
  name: string;
  value: unknown;
  depth: number;
  diff?: { added: Set<string>; removed: Set<string>; changed: Set<string> };
}

function tone(diff: TreeNodeProps['diff'], key: string): string {
  if (!diff) {
    return 'text-zinc-900';
  }
  if (diff.added.has(key)) {
    return 'bg-emerald-50 text-emerald-900';
  }
  if (diff.removed.has(key)) {
    return 'bg-rose-50 text-rose-900 line-through';
  }
  if (diff.changed.has(key)) {
    return 'bg-amber-50 text-amber-900';
  }
  return 'text-zinc-900';
}

function preview(value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 100 ? `${value.slice(0, 100)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  return Array.isArray(value) ? `[${value.length} items]` : '{...}';
}

function TreeNode({ name, value, depth, diff }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const indent = { paddingLeft: depth * 14 };

  if (value === null || typeof value !== 'object') {
    return (
      <div className={`font-mono text-sm py-0.5 ${tone(diff, name)}`} style={indent}>
        <span className="text-zinc-500">{name}: </span>
        {preview(value)}
      </div>
    );
  }

  if (Array.isArray(value)) {
    const slice = open ? value.slice(0, 60) : [];
    return (
      <div style={indent}>
        <button
          type="button"
          className={`font-mono text-sm py-0.5 hover:bg-zinc-100 rounded ${tone(diff, name)}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'v' : '>'} {name}: [{value.length}]
        </button>
        {open &&
          slice.map((item, index) => (
            <TreeNode key={index} name={`[${index}]`} value={item} depth={depth + 1} />
          ))}
      </div>
    );
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const visible = open ? entries.slice(0, 80) : [];

  return (
    <div style={indent}>
      <button
        type="button"
        className={`font-mono text-sm py-0.5 hover:bg-zinc-100 rounded ${tone(diff, name)}`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'v' : '>'} {name}: {'{'}
        {entries.length}
        {'}'}
      </button>
      {open &&
        visible.map(([key, child]) => (
          <TreeNode key={key} name={key} value={child} depth={depth + 1} diff={diff} />
        ))}
    </div>
  );
}

export function LazyJsonTree({
  data,
  diff,
}: {
  data: Record<string, unknown>;
  diff?: { added: Set<string>; removed: Set<string>; changed: Set<string> };
}) {
  return (
    <div>
      {Object.entries(data).map(([key, value]) => (
        <TreeNode key={key} name={key} value={value} depth={0} diff={diff} />
      ))}
    </div>
  );
}
