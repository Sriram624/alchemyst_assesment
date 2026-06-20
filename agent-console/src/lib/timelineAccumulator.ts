import { TimelineEvent, TokenMessage } from '@/types/protocol';

interface TokenBatchEntry {
  seq: number;
  text: string;
  streamId: string;
  timestamp: number;
}

const FLUSH_MS = 200;

export class TimelineAccumulator {
  private batch: TokenBatchEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private emit: (event: TimelineEvent) => void) {}

  pushToken(message: TokenMessage): void {
    this.batch.push({
      seq: message.seq,
      text: message.text,
      streamId: message.stream_id,
      timestamp: Date.now(),
    });

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), FLUSH_MS);
    }
  }

  flushBefore(eventSeq: number): void {
    if (this.batch.length === 0) {
      return;
    }

    const lastSeq = this.batch[this.batch.length - 1].seq;
    if (lastSeq >= eventSeq) {
      this.flush();
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.batch.length === 0) {
      return;
    }

    const entries = this.batch;
    this.batch = [];

    const first = entries[0];
    const last = entries[entries.length - 1];
    const batchedText = entries.map((entry) => entry.text).join('');
    const durationMs = Math.max(last.timestamp - first.timestamp, 0);

    this.emit({
      id: `token-batch-${first.seq}-${last.seq}`,
      type: 'TOKEN',
      seq: first.seq,
      endSeq: last.seq,
      timestamp: first.timestamp,
      message: {
        type: 'TOKEN',
        seq: first.seq,
        text: batchedText,
        stream_id: first.streamId,
      },
      searchText: `token ${first.seq} ${last.seq} ${first.streamId} ${batchedText}`.toLowerCase(),
      streamId: first.streamId,
      batchedTokenCount: entries.length,
      batchedText,
      batchDurationMs: durationMs,
    });
  }

  dispose(): void {
    this.flush();
  }
}
