import "dotenv/config";
import { z } from "zod";

const ConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  VAULT_ROOT: z.string().min(1).transform((v) => v.replace(/\/$/, "")),
  SQLITE_PATH: z.string().min(1),
  EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  TOP_K_DEFAULT: z.coerce.number().int().positive().default(8),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    VAULT_ROOT: process.env.VAULT_ROOT ?? "/data/vault",
    SQLITE_PATH: process.env.SQLITE_PATH ?? "/data/index/vault.db",
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    TOP_K_DEFAULT: process.env.TOP_K_DEFAULT ?? "8",
  });

  if (!parsed.success) {
    const msg = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    throw new Error(`Invalid config: ${msg}`);
  }

  return parsed.data;
}
