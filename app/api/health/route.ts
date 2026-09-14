import { getOptionalDb } from '../../../db';
export const dynamic = 'force-dynamic';
export async function GET() {
  const db = getOptionalDb();
  let database = db ? 'configured' : 'not_configured';
  if (db) try { await db.run('SELECT 1'); } catch { database = 'unavailable'; }
  return Response.json({ status:database === 'unavailable' ? 'degraded' : 'ok', database, storage:db ? 'cloud' : 'device', ai:!!(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL && process.env.ENABLE_AI_CHAT === 'true') }, { status:database === 'unavailable' ? 503 : 200, headers:{'Cache-Control':'no-store'} });
}
