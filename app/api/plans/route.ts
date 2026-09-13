import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getOptionalDb } from "../../../db";
import { mealPlans } from "../../../db/schema";
import { type Config, type Day } from "../../planner";

async function userId() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-id");
}

function validPayload(value: unknown): value is { config: Config; days: Day[]; basketTotal: number } {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<{ config: Config; days: Day[]; basketTotal: number }>;
  return !!body.config && Array.isArray(body.days) && body.days.length === 7 &&
    typeof body.basketTotal === "number" && Number.isFinite(body.basketTotal) &&
    JSON.stringify(body).length < 500_000;
}

export async function GET() {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ plan: null, persisted: false });
  const result = await db.select().from(mealPlans).where(eq(mealPlans.userId, id)).orderBy(desc(mealPlans.createdAt)).limit(1);
  if (!result[0]) return Response.json({ plan: null, persisted: true });
  try {
    return Response.json({
      plan: { id: result[0].id, config: JSON.parse(result[0].config), days: JSON.parse(result[0].days), basketTotal: result[0].basketTotal, createdAt: result[0].createdAt },
      persisted: true,
    });
  } catch {
    return Response.json({ plan: null, persisted: true });
  }
}

export async function POST(request: Request) {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ error: "Sign in to save meal plans." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!validPayload(body)) return Response.json({ error: "Invalid meal plan." }, { status: 400 });
  const planId = crypto.randomUUID();
  await db.insert(mealPlans).values({ id: planId, userId: id, config: JSON.stringify(body.config), days: JSON.stringify(body.days), basketTotal: Math.round(body.basketTotal) });
  return Response.json({ id: planId, saved: true, persisted: true }, { status: 201 });
}
