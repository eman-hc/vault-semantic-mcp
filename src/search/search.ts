import type Database from "better-sqlite3";
import {
  ftsSearch,
  getChunkWithDocById,
  getAllChunksWithEmbeddings,
} from "../db/queries.js";
import { getFolderBoost } from "./rank.js";
import type { SearchResult } from "../types/index.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";

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

function escapeFtsQuery(query: string): string {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  return terms.map((t) => `"${t.replace(/"/g, '""')}"`).join(" ");
}

/**
 * Hybrid search: merge FTS keyword results with semantic similarity.
 * Uses reciprocal rank fusion for combining scores.
 */
export async function hybridSearch(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  query: string,
  topK: number,
  folders?: string[]
): Promise<SearchResult[]> {
  const k = 60;
  const scoreMap = new Map<number, number>();

  const allChunks = getAllChunksWithEmbeddings(db);
  let filteredChunks = allChunks;
  if (folders && folders.length > 0) {
    const folderSet = new Set(folders.map((f) => f.toLowerCase()));
    filteredChunks = allChunks.filter((c) => {
      const docPath = (c as { path?: string }).path ?? "";
      const folder = docPath.split("/")[0] ?? "";
      return folderSet.has(folder.toLowerCase());
    });
  }

  if (query.trim()) {
    const ftsQuery = escapeFtsQuery(query);
    const ftsBoost = 1.5;
    if (ftsQuery) {
      const ftsResults = ftsSearch(db, ftsQuery, topK * 3);
      ftsResults.forEach((r, rank) => {
        const s = (1 / (k + rank + 1)) * ftsBoost;
        scoreMap.set(r.rowid, (scoreMap.get(r.rowid) ?? 0) + s);
      });
    }

    const [queryEmb] = await embeddings.embed([query]);
    const semanticCandidates = filteredChunks.map((c) => {
      const emb = JSON.parse(c.embedding_json) as number[];
      const sim = cosineSimilarity(queryEmb, emb);
      return { chunk: c, score: sim };
    });
    semanticCandidates.sort((a, b) => b.score - a.score);
    semanticCandidates.slice(0, topK * 3).forEach(({ chunk, score }, rank) => {
      const rrf = 1 / (k + rank + 1);
      const combined = score * 0.5 + rrf * 0.5;
      scoreMap.set(chunk.id, (scoreMap.get(chunk.id) ?? 0) + combined);
    });
  } else {
    for (const c of filteredChunks.slice(0, topK)) {
      scoreMap.set(c.id, 1);
    }
  }

  const sorted = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1]);

  const results: SearchResult[] = [];
  const seenPaths = new Set<string>();
  for (const [chunkId] of sorted) {
    const row = getChunkWithDocById(db, chunkId);
    if (!row) continue;
    if (seenPaths.has(row.path)) continue;
    seenPaths.add(row.path);
    const fb = getFolderBoost(row.folder);
    const baseScore = scoreMap.get(chunkId) ?? 0;
    results.push({
      path: row.path,
      title: row.title,
      headingPath: row.heading_path,
      text: row.text,
      score: baseScore * fb,
      folder: row.folder,
    });
    if (results.length >= topK) break;
  }

  return results;
}
