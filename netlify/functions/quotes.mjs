// Live prices for the InvesTeen simulator and Market section (32 funds and starter stocks + 32 more popular stocks).
// Netlify caches the answer for a minute for every visitor. Each refresh asks Finnhub for at most 32 prices
// (the ones updated longest ago), so every price is at most about 2 minutes old and the free plan's
// 60 requests a minute isn't used up. Each refresh also records the day's candle for our own price charts.
import { getStore } from '@netlify/blobs';
import { addCandle } from '../lib/candles.mjs';

export const SYMBOLS = [
  'SPY','QQQ','IWV',
  'XLF','XLE','XLC','XLI','XLK','XLRE','XLV','XLP',
  'BND','TLT','LQD',
  'AAPL','MSFT','AMZN','GOOG','NVDA','TSLA','F','GM','PFE','JNJ','DIS','NKE','UAA','CMG','SBUX','HD','CVX','KHC',
  'META','NFLX','AMD','INTC','ADBE','CRM','ORCL','AVGO','PLTR','UBER','ABNB','SPOT','PYPL','V','MA','JPM',
  'BAC','GS','BRK.B','WMT','COST','TGT','MCD','KO','PEP','PG','LLY','UNH','XOM','BA','RBLX','LULU'
];
const PER_RUN = 32;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async () => {
  const key = (globalThis.Netlify && Netlify.env.get('FINNHUB_KEY')) || process.env.FINNHUB_KEY;
  if (!key) return Response.json({ error: 'FINNHUB_KEY is not set in Netlify environment variables' }, { status: 500 });
  const st = getStore({ name: 'market', consistency: 'strong' });
  let saved = {};
  try { saved = (await st.get('quotes-v2', { type: 'json' })) || {}; } catch (e) { /* first run */ }
  const due = SYMBOLS.slice().sort((a, b) => ((saved[a] && saved[a].at) || 0) - ((saved[b] && saved[b].at) || 0)).slice(0, PER_RUN);
  let busy = false, got = 0;
  for (let i = 0; i < due.length && !busy; i += 8) {
    await Promise.all(due.slice(i, i + 8).map(async (s) => {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(s)}&token=${key}`, { signal: AbortSignal.timeout(6000) });
        if (r.status === 429) { busy = true; return; }
        if (!r.ok) return;
        const j = await r.json();
        if (j && j.c > 0) { saved[s] = { c: j.c, d: j.d, dp: j.dp, h: j.h, l: j.l, o: j.o, pc: j.pc, t: j.t, at: Date.now() }; got++; }
      } catch (e) { /* skip */ }
    }));
    if (i + 8 < due.length) await sleep(300);
  }
  const quotes = {};
  for (const s of SYMBOLS) if (saved[s]) { const { at, ...q } = saved[s]; quotes[s] = q; }
  if (got) {
    try { await st.setJSON('quotes-v2', saved); } catch (e) { /* fine */ }
    try {
      const candles = (await st.get('candles-core', { type: 'json' })) || {};
      let changed = false;
      for (const s of SYMBOLS) if (saved[s]) { candles[s] = candles[s] || []; if (addCandle(candles[s], saved[s])) changed = true; }
      if (changed) await st.setJSON('candles-core', candles);
    } catch (e) { /* fine */ }
  }
  if (!Object.keys(quotes).length) {
    return Response.json({ error: 'No prices from Finnhub' }, { status: 502, headers: { 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
  const updated = Math.max(...Object.values(saved).map((x) => x.at || 0));
  return new Response(JSON.stringify({ updated, quotes }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=60'
    }
  });
};

export const config = { path: '/api/quotes' };
