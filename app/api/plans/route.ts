import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getOptionalDb } from "../../../db";
import { mealPlans } from "../../../db/schema";
import { initialProducts, restorePlan, groceries } from "../../planner";
import { readJson } from '../../../server/http';

async function userId() {
  const requestHeaders = await headers();
  return requestHeaders.get("oai-authenticated-user-id");
}

export async function GET() {
  const id = await userId();
  const db = getOptionalDb();
  if (!id || !db) return Response.json({ plan: null, persisted: false });
  const result = await db.select().from(mealPlans).where(eq(mealPlans.userId, id)).orderBy(desc(mealPlans.createdAt)).limit(1);
  if (!result[0]) return Response.json({ plan: null, persisted: true });
  try {
    const plan=restorePlan({config:JSON.parse(result[0].config),days:JSON.parse(result[0].days)},initialProducts);
    return Response.json({
      plan: plan ? { ...plan, id: result[0].id, basketTotal: groceries(plan.days,initialProducts,plan.config.stores).reduce((s,item)=>s+item.cost,0), createdAt: result[0].createdAt } : null,
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
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'Cross-origin request rejected.'},{status:403});
  const body = restorePlan(await readJson(request,500000).catch(() => null),initialProducts);
  if (!body) return Response.json({ error: "Invalid meal plan." }, { status: 400 });
  const basketTotal=groceries(body.days,initialProducts,body.config.stores).reduce((sum,item)=>sum+item.cost,0);
  const planId = crypto.randomUUID();
  await db.insert(mealPlans).values({ id: planId, userId: id, config: JSON.stringify(body.config), days: JSON.stringify(body.days), basketTotal: Math.round(basketTotal) });
  return Response.json({ id: planId, saved: true, persisted: true }, { status: 201 });
}
