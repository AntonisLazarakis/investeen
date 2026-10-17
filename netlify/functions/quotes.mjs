// Live prices for the InvesTeen simulator.
// Calls Finnhub once a minute at most (Netlify caches the answer for every visitor),
// so the free plan's 60 requests per minute is never used up, however many people visit.
const SYMBOLS = [
  'SPY','QQQ','IWV',
  'XLF','XLE','XLC','XLI','XLK','XLRE','XLV','XLP',
  'BND','TLT','LQD',
  'AAPL','MSFT','AMZN','GOOG','NVDA','TSLA','F','GM','PFE','JNJ','DIS','NKE','UAA','CMG','SBUX','HD','CVX','KHC'
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async () => {
  const key = (globalThis.Netlify && Netlify.env.get('FINNHUB_KEY')) || process.env.FINNHUB_KEY;
  if (!key) {
    return Response.json({ error: 'FINNHUB_KEY is not set in Netlify environment variables' }, { status: 500 });
  }
  const quotes = {};
  // Finnhub free plan allows 30 requests per second, so ask in small groups.
  for (let i = 0; i < SYMBOLS.length; i += 8) {
    const group = SYMBOLS.slice(i, i + 8);
    await Promise.all(group.map(async (s) => {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${key}`);
        if (!r.ok) return;
        const j = await r.json();
        if (j && j.c > 0) quotes[s] = { c: j.c, d: j.d, dp: j.dp, h: j.h, l: j.l, o: j.o, pc: j.pc, t: j.t };
      } catch (e) { /* skip this symbol */ }
    }));
    if (i + 8 < SYMBOLS.length) await sleep(350);
  }
  if (!Object.keys(quotes).length) {
    return Response.json({ error: 'No prices from Finnhub' }, { status: 502, headers: { 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
  return new Response(JSON.stringify({ updated: Date.now(), quotes }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, durable, s-maxage=60, stale-while-revalidate=60'
    }
  });
};

export const config = { path: '/api/quotes' };
