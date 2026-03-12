import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const Schema = z.object({
  path: z.string().min(1),
});

export function vaultGet(vaultRoot: string, args: unknown): { content: string; path: string } | { error: string } {
  const parsed = Schema.parse(args);
  const fullPath = path.join(vaultRoot, parsed.path);
  if (!fullPath.startsWith(path.resolve(vaultRoot))) {
    return { error: "Path escapes vault root" };
  }
  try {
    const content = fs.readFileSync(fullPath, "utf8");
    return { content, path: parsed.path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
