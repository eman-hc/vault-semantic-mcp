import type Database from "better-sqlite3";
import { getDocumentCount, getChunkCount } from "../db/queries.js";

export function vaultStatus(
  db: Database.Database,
  config: { vaultRoot: string; sqlitePath: string },
  watcherRunning: boolean
): {
  vaultRoot: string;
  sqlitePath: string;
  documentCount: number;
  chunkCount: number;
  watcherRunning: boolean;
} {
  return {
    vaultRoot: config.vaultRoot,
    sqlitePath: config.sqlitePath,
    documentCount: getDocumentCount(db),
    chunkCount: getChunkCount(db),
    watcherRunning,
  };
}
