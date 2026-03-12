import fs from "node:fs";
import path from "node:path";

/**
 * Recursively find all .md files under root.
 */
export function scanMarkdownFiles(root: string): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
        results.push(full);
      }
    }
  }

  walk(root);
  return results;
}
