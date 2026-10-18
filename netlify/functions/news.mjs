// Real market news for InvesTeen.
// /api/news            -> latest general market news (cached 5 minutes)
// /api/news?symbol=AAPL -> last 7 days of news about one company (cached 15 minutes)
const ALLOWED = new Set([
  'SPY','QQQ','IWV','XLF','XLE','XLC','XLI','XLK','XLRE','XLV','XLP','BND','TLT','LQD',
  'AAPL','MSFT','AMZN','GOOG','NVDA','TSLA','F','GM','PFE','JNJ','DIS','NKE','UAA','CMG','SBUX','HD','CVX','KHC'
]);

export default async (req) => {
  const key = (globalThis.Netlify && Netlify.env.get('FINNHUB_KEY')) || process.env.FINNHUB_KEY;
  if (!key) {
    return Response.json({ error: 'FINNHUB_KEY is not set in Netlify environment variables' }, { status: 500 });
  }
  const symbol = (new URL(req.url).searchParams.get('symbol') || '').toUpperCase();
  let api;
  if (symbol) {
    if (!ALLOWED.has(symbol)) return Response.json({ error: 'Unknown symbol' }, { status: 400 });
    const day = (d) => d.toISOString().slice(0, 10);
    const to = new Date();
    const from = new Date(Date.now() - 7 * 864e5);
    api = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${day(from)}&to=${day(to)}&token=${key}`;
  } else {
    api = `https://finnhub.io/api/v1/news?category=general&token=${key}`;
  }
  let raw;
  try {
    const r = await fetch(api);
    if (!r.ok) throw new Error('Finnhub ' + r.status);
    raw = await r.json();
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 502, headers: { 'Netlify-CDN-Cache-Control': 'no-store' } });
  }
  const items = (Array.isArray(raw) ? raw : [])
    .filter((n) => n && n.headline && n.url)
    .sort((a, b) => (b.datetime || 0) - (a.datetime || 0))
    .slice(0, 30)
    .map((n) => ({
      headline: n.headline,
      source: n.source,
      summary: (n.summary || '').slice(0, 1200),
      image: /^https:\/\//.test(n.image || '') ? n.image : '',
      url: n.url,
      datetime: n.datetime,
      related: n.related || ''
    }));
  return new Response(JSON.stringify({ updated: Date.now(), items }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': `public, durable, s-maxage=${symbol ? 900 : 300}, stale-while-revalidate=600`
    }
  });
};

export const config = { path: '/api/news' };
