import type Database from "better-sqlite3";
import type { DocumentRow, ChunkRow } from "../types/index.js";

export function getDocumentByPath(db: Database.Database, path: string): DocumentRow | undefined {
  return db.prepare("SELECT * FROM documents WHERE path = ?").get(path) as DocumentRow | undefined;
}

export function getDocumentById(db: Database.Database, id: number): DocumentRow | undefined {
  return db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as DocumentRow | undefined;
}

export function upsertDocument(
  db: Database.Database,
  row: Omit<DocumentRow, "id">
): { id: number } {
  const stmt = db.prepare(`
    INSERT INTO documents (path, folder, title, sha256, mtime_ms, frontmatter_json, indexed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(path) DO UPDATE SET
      folder = excluded.folder,
      title = excluded.title,
      sha256 = excluded.sha256,
      mtime_ms = excluded.mtime_ms,
      frontmatter_json = excluded.frontmatter_json,
      indexed_at = excluded.indexed_at
  `);
  stmt.run(row.path, row.folder, row.title, row.sha256, row.mtime_ms, row.frontmatter_json, row.indexed_at);
  const doc = getDocumentByPath(db, row.path)!;
  return { id: doc.id };
}

export function deleteDocumentByPath(db: Database.Database, path: string): void {
  db.prepare("DELETE FROM documents WHERE path = ?").run(path);
}

export function deleteChunksByDocumentId(db: Database.Database, documentId: number): void {
  db.prepare("DELETE FROM chunks WHERE document_id = ?").run(documentId);
}

export function insertChunk(
  db: Database.Database,
  row: Omit<ChunkRow, "id">
): number {
  const stmt = db.prepare(`
    INSERT INTO chunks (document_id, chunk_index, heading_path, text, text_hash, start_line, end_line, token_estimate, embedding_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    row.document_id,
    row.chunk_index,
    row.heading_path,
    row.text,
    row.text_hash,
    row.start_line,
    row.end_line,
    row.token_estimate,
    row.embedding_json
  );
  return (result as { lastInsertRowid: bigint }).lastInsertRowid as unknown as number;
}

export function getChunksByDocumentId(db: Database.Database, documentId: number): ChunkRow[] {
  return db.prepare("SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index").all(documentId) as ChunkRow[];
}

export function getChunksByPath(db: Database.Database, path: string): ChunkRow[] {
  const doc = getDocumentByPath(db, path);
  if (!doc) return [];
  return getChunksByDocumentId(db, doc.id);
}

export function getRecentDocuments(
  db: Database.Database,
  folder?: string,
  limit: number = 20
): DocumentRow[] {
  if (folder) {
    return db.prepare("SELECT * FROM documents WHERE folder = ? ORDER BY indexed_at DESC LIMIT ?").all(folder, limit) as DocumentRow[];
  }
  return db.prepare("SELECT * FROM documents ORDER BY indexed_at DESC LIMIT ?").all(limit) as DocumentRow[];
}

export function getAllChunksWithEmbeddings(db: Database.Database): (ChunkRow & { path: string })[] {
  return db
    .prepare(`
      SELECT c.*, d.path FROM chunks c
      JOIN documents d ON c.document_id = d.id
    `)
    .all() as (ChunkRow & { path: string })[];
}

export function ftsSearch(db: Database.Database, query: string, limit: number): { rowid: number; text: string }[] {
  const stmt = db.prepare(`
    SELECT rowid, text FROM chunks_fts WHERE chunks_fts MATCH ? LIMIT ?
  `);
  try {
    return stmt.all(query, limit) as { rowid: number; text: string }[];
  } catch {
    return [];
  }
}

export function getDocumentCount(db: Database.Database): number {
  return (db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number }).c;
}

export function getChunkCount(db: Database.Database): number {
  return (db.prepare("SELECT COUNT(*) as c FROM chunks").get() as { c: number }).c;
}

export function getChunkWithDocById(db: Database.Database, chunkId: number): (ChunkRow & { path: string; folder: string; title: string | null }) | undefined {
  return db
    .prepare(`
      SELECT c.*, d.path, d.folder, d.title FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE c.id = ?
    `)
    .get(chunkId) as (ChunkRow & { path: string; folder: string; title: string | null }) | undefined;
}
