import { z } from 'zod';

export async function readJson(request: Request, maxBytes = 16000): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > maxBytes) throw new Error('BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('INVALID_JSON');
  let bytes = 0; const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
    chunks.push(value);
  }
  const all = new Uint8Array(bytes); let offset = 0;
  for (const c of chunks) { all.set(c, offset); offset += c.length; }
  return JSON.parse(new TextDecoder().decode(all));
}
export const contextSchema = z.object({
  stores: z.array(z.string().max(60)).max(12), diet: z.enum(['Balanced','High protein','Plant-based','Vegetarian']),
  allergens: z.array(z.string().max(40)).max(12), tools: z.array(z.string().max(40)).max(12),
  budget: z.number().finite().min(0).max(10000000), calories: z.number().finite().min(1500).max(4000).nullable(),
  plan: z.array(z.string().max(150)).max(28),
}).strict();
// Per-instance guard only. Public AI requires platform-wide firewall limits too.
const buckets = new Map<string, { until: number; count: number }>();
export function allowRequest(key: string, limit = 10, now = Date.now()) {
  for (const [id, bucket] of buckets) if (bucket.until <= now) buckets.delete(id);
  const bucket = buckets.get(key) ?? { until: now + 60000, count: 0 };
  if (buckets.size >= 2000 && !buckets.has(key)) return false;
  bucket.count++; buckets.set(key, bucket); return bucket.count <= limit;
}
