import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getOptionalDb } from "../../../db";
import { userProfiles } from "../../../db/schema";
import { defaults, type Config } from "../../planner";

async function userId() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-id");
}

function validConfig(value: unknown): value is Config {
  if (!value || typeof value !== "object") return false;
  const config = value as Partial<Config>;
  return Array.isArray(config.tools) && Array.isArray(config.stores) &&
    typeof config.min === "number" && typeof config.max === "number" &&
    typeof config.diet === "string" && typeof config.weight === "number" &&
    typeof config.goal === "number" && typeof config.height === "number" &&
    typeof config.age === "number" && typeof config.sex === "string" &&
    typeof config.activity === "number" && Array.isArray(config.allergens) &&
    typeof config.eligible === "boolean";
}

export async function GET() {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ config: null, persisted: false });
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
  if (!result[0]) return Response.json({ config: null, persisted: true });
  try {
    const config = JSON.parse(result[0].config) as unknown;
    return Response.json({ config: validConfig(config) ? config : null, persisted: true });
  } catch {
    return Response.json({ config: null, persisted: true });
  }
}

export async function PUT(request: Request) {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ error: "Sign in to sync your preferences." }, { status: 401 });
  const body = await request.json().catch(() => null) as { config?: unknown } | null;
  const config = body?.config;
  if (!validConfig(config)) return Response.json({ error: "Invalid planner preferences." }, { status: 400 });
  await db.insert(userProfiles).values({ userId: id, config: JSON.stringify({ ...defaults, ...config }), updatedAt: new Date().toISOString() }).onConflictDoUpdate({
    target: userProfiles.userId,
    set: { config: JSON.stringify({ ...defaults, ...config }), updatedAt: new Date().toISOString() },
  });
  return Response.json({ saved: true, persisted: true });
}
