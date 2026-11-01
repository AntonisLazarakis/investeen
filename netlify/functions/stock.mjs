// GET /api/stock?s=AAPL -> company details, key numbers, live price and our own daily candles for any US stock or fund.
// Cached for a minute for everyone.
import { getStore } from '@netlify/blobs';
import { assetInfo, quote, SYM_RE } from '../lib/assets.mjs';
import { addCandle } from '../lib/candles.mjs';
import { SYMBOLS } from './quotes.mjs';
import { ALL } from '../lib/market.mjs';
const SIM = new Set(SYMBOLS);
const json = (o, status = 200, cdn = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Netlify-CDN-Cache-Control': cdn } });
export default async (req) => {
  const s = String(new URL(req.url).searchParams.get('s') || '').toUpperCase();
  if (!SYM_RE.test(s)) return json({ error: 'Unknown symbol' }, 400);
  const st = getStore({ name: 'market', consistency: 'strong' });
  try {
    const m = await assetInfo(s);
    if (!m) return json({ error: 'We couldn’t find ' + s + ' on the US market.' }, 404, 'public, durable, s-maxage=3600');
    let q = null, candles = [];
    if (SIM.has(s)) {
      const saved = (await st.get('quotes-v2', { type: 'json' })) || {};
      if (saved[s] && Date.now() - saved[s].at < 5 * 60e3) { const { at, ...rest } = saved[s]; q = rest; }
      candles = (((await st.get('candles-core', { type: 'json' })) || {})[s] || []).slice();
      if (!q) q = await quote(s);
      addCandle(candles, q);
    } else {
      q = await quote(s);
      const cs = getStore({ name: 'candles', consistency: 'strong' });
      candles = (await cs.get(s, { type: 'json' })) || [];
      if (addCandle(candles, q)) { try { await cs.setJSON(s, candles); } catch (e) { /* fine */ } }
    }
    if (!q) return json({ error: 'No price for ' + s + ' right now.' }, 404, 'public, s-maxage=300');
    const { at, v, ...asset } = m;
    if (ALL[s] && ALL[s].about) { asset.about = ALL[s].about; if (ALL[s].cls === 'stock') asset.name = ALL[s].name; }
    return json({ asset, quote: q, candles, inSim: SIM.has(s), updated: Date.now() }, 200, 'public, durable, s-maxage=60, stale-while-revalidate=60');
  } catch (e) {
    return json({ error: e.busy ? e.message : 'This stock isn’t available right now. Try again soon.' }, 503);
  }
};
export const config = { path: '/api/stock' };
