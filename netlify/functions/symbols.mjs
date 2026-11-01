// GET /api/symbols -> every US-listed stock and fund: [[symbol, name, 's' stock | 'e' fund], ...]
import { symbolList } from '../lib/assets.mjs';
export default async () => {
  try {
    const { at, list } = await symbolList();
    return new Response(JSON.stringify({ updated: at, list }), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=43200, stale-while-revalidate=86400' } });
  } catch (e) {
    return Response.json({ error: 'The list of stocks isn’t available right now.' }, { status: 503, headers: { 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
};
export const config = { path: '/api/symbols' };
