import chokidar from "chokidar";
import path from "node:path";

export type WatchEvent = "add" | "change" | "unlink";

export interface WatchHandler {
  onAdd(path: string): void;
  onChange(path: string): void;
  onUnlink(path: string): void;
}

export function createWatcher(
  vaultRoot: string,
  handler: WatchHandler,
  debounceMs: number = 300
): ReturnType<typeof chokidar.watch> {
  const pending = new Map<string, { event: WatchEvent; timer: ReturnType<typeof setTimeout> }>();

  function flush(key: string): void {
    const p = pending.get(key);
    if (!p) return;
    clearTimeout(p.timer);
    pending.delete(key);
    if (p.event === "unlink") {
      handler.onUnlink(key);
    } else {
      handler.onChange(key);
    }
  }

  function schedule(key: string, event: WatchEvent): void {
    const existing = pending.get(key);
    if (existing) {
      clearTimeout(existing.timer);
    }
    const timer = setTimeout(() => {
      flush(key);
    }, debounceMs);
    pending.set(key, { event, timer });
  }

  const watcher = chokidar.watch(vaultRoot, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("add", (filePath: string) => {
    if (!filePath.toLowerCase().endsWith(".md")) return;
    const normalized = path.resolve(filePath);
    handler.onAdd(normalized);
  });

  watcher.on("change", (filePath: string) => {
    if (!filePath.toLowerCase().endsWith(".md")) return;
    const normalized = path.resolve(filePath);
    schedule(normalized, "change");
  });

  watcher.on("unlink", (filePath: string) => {
    if (!filePath.toLowerCase().endsWith(".md")) return;
    const normalized = path.resolve(filePath);
    const p = pending.get(normalized);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(normalized);
    }
    handler.onUnlink(normalized);
  });

  return watcher;
}
