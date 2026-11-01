// GET /api/symbols -> every US-listed stock and fund: [[symbol, name, 's' stock | 'e' fund], ...]
import { symbolList } from '../lib/assets.mjs';
export default async () => {
  try {
    const { at, list, complete } = await symbolList();
    return new Response(JSON.stringify({ updated: at, list, complete }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': complete ? 'public, max-age=3600' : 'no-store', 'Netlify-CDN-Cache-Control': complete ? 'public, durable, s-maxage=43200, stale-while-revalidate=86400' : 'public, s-maxage=20' } });
  } catch (e) {
    return Response.json({ error: 'The list of stocks isn’t available right now.', detail: String(e && e.message || e).slice(0, 120) }, { status: 503, headers: { 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
};
export const config = { path: '/api/symbols' };
