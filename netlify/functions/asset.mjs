// GET /api/asset?s=COST -> details and live price for any US stock or fund (price cached 1 minute for everyone)
import { assetInfo, quote, pub, SYM_RE } from '../lib/assets.mjs';
const json = (o, status = 200, cdn = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': cdn } });
export default async (req) => {
  const s = String(new URL(req.url).searchParams.get('s') || '').toUpperCase();
  if (!SYM_RE.test(s)) return json({ error: 'Unknown symbol' }, 400);
  try {
    const m = await assetInfo(s);
    if (!m) return json({ error: 'We couldn’t find ' + s + ' on the US market.' }, 404, 'public, durable, s-maxage=3600');
    const q = await quote(s);
    if (!q) return json({ error: 'No price for ' + s + ' right now.' }, 404, 'public, s-maxage=300');
    return json({ asset: pub(m), quote: q, updated: Date.now() }, 200, 'public, durable, s-maxage=60, stale-while-revalidate=60');
  } catch (e) {
    return json({ error: e.busy ? e.message : 'Prices aren’t available right now. Try again soon.' }, 503);
  }
};
export const config = { path: '/api/asset' };
