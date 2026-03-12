import Database from "better-sqlite3";
import { SCHEMA } from "./schema.js";

export function migrate(db: Database.Database): void {
  db.exec(SCHEMA);
}
