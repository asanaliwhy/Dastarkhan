// Vercel has no Cloudflare bindings. Explicitly run in device-storage mode.
export const env: { DB?: D1Database } = {};
