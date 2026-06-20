export class ScrollRegistry {
  private tools = new Map<string, HTMLElement>();
  private segments = new Map<string, HTMLElement>();
  private timelineRows = new Map<string, HTMLElement>();

  toolKey(callId: string): string {
    return `tool:${callId}`;
  }

  segmentKey(streamId: string, index: number): string {
    return `segment:${streamId}:${index}`;
  }

  registerTool(callId: string, node: HTMLElement | null): void {
    this.set(this.tools, this.toolKey(callId), node);
  }

  registerSegment(streamId: string, index: number, node: HTMLElement | null): void {
    this.set(this.segments, this.segmentKey(streamId, index), node);
  }

  registerTimelineRow(eventId: string, node: HTMLElement | null): void {
    this.set(this.timelineRows, eventId, node);
  }

  scrollToTool(callId: string): void {
    this.scroll(this.tools.get(this.toolKey(callId)));
  }

  scrollToSegment(streamId: string, index: number): void {
    this.scroll(this.segments.get(this.segmentKey(streamId, index)));
  }

  scrollToTimelineRow(eventId: string): void {
    this.scroll(this.timelineRows.get(eventId));
  }

  private set(map: Map<string, HTMLElement>, key: string, node: HTMLElement | null): void {
    if (node) {
      map.set(key, node);
    } else {
      map.delete(key);
    }
  }

  private scroll(node: HTMLElement | undefined): void {
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}
