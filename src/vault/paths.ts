import path from "node:path";

/**
 * Get the folder name (first segment under vault root) from a full path.
 * e.g. /data/vault/projects/foo.md -> projects
 */
export function getFolder(vaultRoot: string, fullPath: string): string {
  const rel = path.relative(vaultRoot, fullPath);
  const parts = rel.split(path.sep);
  return parts[0] || "inbox";
}

/**
 * Convert full filesystem path to vault-relative path.
 * e.g. /data/vault/projects/foo.md -> projects/foo.md
 */
export function toVaultPath(vaultRoot: string, fullPath: string): string {
  return path.relative(vaultRoot, fullPath).replace(/\\/g, "/");
}
