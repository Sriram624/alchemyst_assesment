export interface JsonDiff {
  added: Set<string>;
  removed: Set<string>;
  changed: Set<string>;
}

export function shallowDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  maxComparisons = 25_000,
): JsonDiff {
  const added = new Set<string>();
  const removed = new Set<string>();
  const changed = new Set<string>();
  const budget = { remaining: maxComparisons };

  for (const key of Object.keys(current)) {
    if (!(key in previous)) {
      added.add(key);
    } else if (!valuesEqual(previous[key], current[key], budget)) {
      changed.add(key);
    }
  }

  for (const key of Object.keys(previous)) {
    if (!(key in current)) {
      removed.add(key);
    }
  }

  return { added, removed, changed };
}

export function valuesEqual(
  a: unknown,
  b: unknown,
  budget = { remaining: Number.POSITIVE_INFINITY },
): boolean {
  budget.remaining -= 1;
  if (budget.remaining < 0) {
    return false;
  }

  if (a === b) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a !== 'object' || a === null || b === null) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((value, index) => valuesEqual(value, b[index], budget));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => valuesEqual(left[key], right[key], budget));
}

export function payloadSizeBytes(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

export function truncatePreview(value: unknown, maxLength = 120): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}
