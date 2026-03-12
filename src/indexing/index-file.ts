import fs from "node:fs";
import type Database from "better-sqlite3";
import {
  upsertDocument,
  deleteChunksByDocumentId,
  insertChunk,
  getDocumentByPath,
} from "../db/queries.js";
import { extractMeta } from "../vault/frontmatter.js";
import { toVaultPath } from "../vault/paths.js";
import { chunkMarkdown } from "../vault/chunk.js";
import { sha256 } from "./hash.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";

export interface IndexResult {
  path: string;
  action: "indexed" | "skipped" | "error";
  chunks?: number;
  reason?: string;
}

export async function indexFile(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  vaultRoot: string,
  fullPath: string
): Promise<IndexResult> {
  const vaultPath = toVaultPath(vaultRoot, fullPath);

  let raw: string;
  try {
    raw = fs.readFileSync(fullPath, "utf8");
  } catch (err) {
    return { path: vaultPath, action: "error", reason: String(err) };
  }

  const fileHash = sha256(raw);
  const stat = fs.statSync(fullPath);
  const mtimeMs = stat.mtimeMs;

  const existing = getDocumentByPath(db, vaultPath);
  if (existing && existing.sha256 === fileHash) {
    return { path: vaultPath, action: "skipped", reason: "hash unchanged" };
  }

  const meta = extractMeta(vaultRoot, fullPath, raw);
  const chunks = chunkMarkdown(meta.content);

  if (chunks.length === 0) {
    return { path: vaultPath, action: "indexed", chunks: 0 };
  }

  const texts = chunks.map((c) => c.text);
  const embeddingVectors = await embeddings.embed(texts);

  const docId = upsertDocument(db, {
    path: vaultPath,
    folder: meta.folder,
    title: meta.title ?? null,
    sha256: fileHash,
    mtime_ms: mtimeMs,
    frontmatter_json: JSON.stringify(meta.frontmatter),
    indexed_at: new Date().toISOString(),
  }).id;

  deleteChunksByDocumentId(db, docId);

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const textHash = sha256(c.text);
    insertChunk(db, {
      document_id: docId,
      chunk_index: i,
      heading_path: c.headingPath || null,
      text: c.text,
      text_hash: textHash,
      start_line: c.startLine ?? null,
      end_line: c.endLine ?? null,
      token_estimate: c.tokenEstimate,
      embedding_json: JSON.stringify(embeddingVectors[i] ?? []),
    });
  }

  return { path: vaultPath, action: "indexed", chunks: chunks.length };
}
