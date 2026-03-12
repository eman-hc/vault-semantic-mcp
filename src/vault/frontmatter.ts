import matter from "gray-matter";
import type { VaultFileMeta } from "../types/index.js";
import { getFolder, toVaultPath } from "./paths.js";

export interface ParseResult {
  title?: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

export function parseFrontmatter(raw: string): ParseResult {
  const { data, content } = matter(raw);
  const frontmatter = (data as Record<string, unknown>) ?? {};
  const title = typeof frontmatter.title === "string" ? frontmatter.title : undefined;
  return { title, frontmatter, content };
}

/**
 * Derive title: frontmatter title > first H1 > filename without extension.
 */
export function deriveTitle(
  frontmatterTitle: string | undefined,
  content: string,
  filename: string
): string {
  if (frontmatterTitle?.trim()) return frontmatterTitle;
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1?.[1]?.trim()) return h1[1].trim();
  return filename.replace(/\.md$/i, "");
}

export interface ExtractedMeta extends VaultFileMeta {
  content: string;
}

export function extractMeta(
  vaultRoot: string,
  fullPath: string,
  raw: string
): ExtractedMeta {
  const { title: fmTitle, frontmatter, content } = parseFrontmatter(raw);
  const folder = getFolder(vaultRoot, fullPath);
  const vaultPath = toVaultPath(vaultRoot, fullPath);
  const filename = fullPath.split(/[/\\]/).pop() ?? vaultPath;
  const title = deriveTitle(fmTitle, content, filename);
  return { title, folder, path: vaultPath, frontmatter, content };
}
