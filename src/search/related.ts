import type Database from "better-sqlite3";
import { getAllChunksWithEmbeddings } from "../db/queries.js";
import { getFolderBoost } from "./rank.js";
import type { SearchResult } from "../types/index.js";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function findRelated(
  db: Database.Database,
  allChunks: { id: number; path: string; document_id: number; text: string; heading_path: string | null; embedding_json: string }[],
  sourcePath: string,
  topK: number
): SearchResult[] {
  const sourceChunks = allChunks.filter((c) => c.path === sourcePath);
  if (sourceChunks.length === 0) return [];

  const otherChunks = allChunks.filter((c) => c.path !== sourcePath);
  const docScores = new Map<string, { maxScore: number; bestChunk: typeof otherChunks[0] }>();

  for (const src of sourceChunks) {
    const srcEmb = JSON.parse(src.embedding_json) as number[];
    for (const other of otherChunks) {
      const otherEmb = JSON.parse(other.embedding_json) as number[];
      const sim = cosineSimilarity(srcEmb, otherEmb);
      const existing = docScores.get(other.path);
      if (!existing || sim > existing.maxScore) {
        docScores.set(other.path, { maxScore: sim, bestChunk: other });
      }
    }
  }

  const doc = db.prepare("SELECT path, folder, title FROM documents WHERE path = ?").get(sourcePath) as { path: string; folder: string; title: string | null } | undefined;
  const folder = doc?.folder ?? "inbox";

  const ranked = [...docScores.entries()]
    .map(([path, { maxScore, bestChunk }]) => ({
      path,
      title: null as string | null,
      headingPath: bestChunk.heading_path,
      text: bestChunk.text,
      score: maxScore * getFolderBoost(folder),
      folder: path.split("/")[0] ?? "inbox",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  for (const r of ranked) {
    const row = db.prepare("SELECT title FROM documents WHERE path = ?").get(r.path) as { title: string | null } | undefined;
    r.title = row?.title ?? null;
  }

  return ranked;
}
