import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  const db = getOptionalDb();
  if (!db) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.",
    );
  }
  return db;
}

/** Optional adapter for public routes that can serve the bundled snapshot. */
export function getOptionalDb() {
  return env.DB ? drizzle(env.DB, { schema }) : null;
}
