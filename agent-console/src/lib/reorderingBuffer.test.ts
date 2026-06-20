import { describe, expect, it } from 'vitest';
import { ReorderingBuffer } from './reorderingBuffer';
import { TokenMessage } from '@/types/protocol';

function token(seq: number, text: string): TokenMessage {
  return { type: 'TOKEN', seq, text, stream_id: 's1' };
}

function ingest(buffer: ReorderingBuffer, message: TokenMessage): TokenMessage[] {
  buffer.addMessage(message);
  return buffer.drainReady() as TokenMessage[];
}

describe('ReorderingBuffer', () => {
  it('returns nothing from an empty buffer', () => {
    const buffer = new ReorderingBuffer();
    expect(buffer.drainReady()).toEqual([]);
  });

  it('processes a single in-order message', () => {
    const batch = ingest(new ReorderingBuffer(), token(1, 'a'));
    expect(batch.map((item) => item.seq)).toEqual([1]);
  });

  it('buffers out-of-order messages until the gap closes', () => {
    const buffer = new ReorderingBuffer();
    expect(ingest(buffer, token(3, 'c'))).toEqual([]);
    expect(buffer.getPendingCount()).toBe(1);

    expect(ingest(buffer, token(1, 'a')).map((item) => item.seq)).toEqual([1]);
    expect(buffer.getPendingCount()).toBe(1);
  });

  it('fills contiguous sequences after an out-of-order insert', () => {
    const buffer = new ReorderingBuffer();
    ingest(buffer, token(3, 'c'));
    ingest(buffer, token(1, 'a'));
    const tail = ingest(buffer, token(2, 'b'));
    expect(tail.map((item) => item.seq)).toEqual([2, 3]);
  });

  it('drops duplicates', () => {
    const buffer = new ReorderingBuffer();
    ingest(buffer, token(1, 'a'));
    expect(ingest(buffer, token(1, 'a'))).toEqual([]);
  });

  it('rejects already processed seq values', () => {
    const buffer = new ReorderingBuffer();
    ingest(buffer, token(1, 'a'));
    ingest(buffer, token(2, 'b'));
    expect(ingest(buffer, token(1, 'a'))).toEqual([]);
  });

  it('handles a fully reversed batch', () => {
    const buffer = new ReorderingBuffer();
    ingest(buffer, token(5, 'e'));
    ingest(buffer, token(4, 'd'));
    ingest(buffer, token(3, 'c'));
    ingest(buffer, token(2, 'b'));
    const batch = ingest(buffer, token(1, 'a'));
    expect(batch.map((item) => item.seq)).toEqual([1, 2, 3, 4, 5]);
  });

  it('reports gaps only when pending seq is ahead of expected', () => {
    const buffer = new ReorderingBuffer();
    expect(buffer.hasGaps()).toBe(false);
    buffer.addMessage(token(3, 'c'));
    expect(buffer.hasGaps()).toBe(true);
  });
});
