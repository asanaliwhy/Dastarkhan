import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getOptionalDb } from "../../../db";
import { userProfiles } from "../../../db/schema";
import { defaults } from "../../planner";
import { configSchema } from '../../validation';
import { readJson } from '../../../server/http';

async function userId() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-id");
}

export async function GET() {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ config: null, persisted: false });
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).limit(1);
  if (!result[0]) return Response.json({ config: null, persisted: true });
  try {
    const config = JSON.parse(result[0].config) as unknown;
    const parsed=configSchema.safeParse(config);
    return Response.json({ config: parsed.success ? parsed.data : null, persisted: true });
  } catch {
    return Response.json({ config: null, persisted: true });
  }
}

export async function PUT(request: Request) {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ error: "Sign in to sync your preferences." }, { status: 401 });
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Cross-origin request rejected.'},{status:403});
  const body = await readJson(request).catch(() => null) as { config?: unknown } | null;
  const parsed = configSchema.safeParse(body?.config);
  if (!parsed.success) return Response.json({ error: "Invalid planner preferences." }, { status: 400 });
  const config=parsed.data;
  await db.insert(userProfiles).values({ userId: id, config: JSON.stringify({ ...defaults, ...config }), updatedAt: new Date().toISOString() }).onConflictDoUpdate({
    target: userProfiles.userId,
    set: { config: JSON.stringify({ ...defaults, ...config }), updatedAt: new Date().toISOString() },
  });
  return Response.json({ saved: true, persisted: true });
}
