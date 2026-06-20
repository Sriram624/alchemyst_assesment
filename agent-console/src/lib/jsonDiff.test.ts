import { describe, expect, it } from 'vitest';
import { shallowDiff, valuesEqual } from './jsonDiff';

describe('jsonDiff', () => {
  it('detects added, removed, and changed keys', () => {
    const diff = shallowDiff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 });
    expect([...diff.added]).toEqual(['c']);
    expect([...diff.removed]).toEqual([]);
    expect([...diff.changed]).toEqual(['b']);
  });

  it('compares nested values', () => {
    expect(valuesEqual({ x: [1, 2] }, { x: [1, 2] })).toBe(true);
    expect(valuesEqual({ x: [1, 2] }, { x: [1, 3] })).toBe(false);
  });
});
