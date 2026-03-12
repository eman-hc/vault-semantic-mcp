/**
 * Simple in-memory debounce queue for watcher events.
 * Deduplicates by path; only the latest event type per path is applied.
 */
export type QueueItem = { path: string; action: "index" | "delete" };

export class IndexQueue {
  private pending = new Map<string, QueueItem>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly process: (items: QueueItem[]) => void | Promise<void>;
  private readonly debounceMs: number;

  constructor(process: (items: QueueItem[]) => void | Promise<void>, debounceMs = 500) {
    this.process = process;
    this.debounceMs = debounceMs;
  }

  enqueue(path: string, action: "index" | "delete"): void {
    this.pending.set(path, { path, action });
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const items = [...this.pending.values()];
      this.pending.clear();
      if (items.length > 0) {
        void this.process(items);
      }
    }, this.debounceMs);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const items = [...this.pending.values()];
    this.pending.clear();
    if (items.length > 0) {
      await this.process(items);
    }
  }
}
