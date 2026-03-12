/** Parsed frontmatter plus derived metadata from a vault file. */
export interface VaultFileMeta {
  title?: string;
  folder: string;
  path: string;
  frontmatter: Record<string, unknown>;
}

/** A chunk of markdown with heading context. */
export interface Chunk {
  headingPath: string;
  text: string;
  tokenEstimate: number;
  startLine?: number;
  endLine?: number;
}

/** Document row in SQLite. */
export interface DocumentRow {
  id: number;
  path: string;
  folder: string;
  title: string | null;
  sha256: string;
  mtime_ms: number;
  frontmatter_json: string | null;
  indexed_at: string;
}

/** Chunk row in SQLite. */
export interface ChunkRow {
  id: number;
  document_id: number;
  chunk_index: number;
  heading_path: string | null;
  text: string;
  text_hash: string;
  start_line: number | null;
  end_line: number | null;
  token_estimate: number;
  embedding_json: string;
}

/** Search result item. */
export interface SearchResult {
  path: string;
  title: string | null;
  headingPath: string | null;
  text: string;
  score: number;
  folder: string;
}
