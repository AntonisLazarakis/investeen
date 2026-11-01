// Server-run "Simulate the future" games for the leaderboard.
// POST /api/game/start            -> { id, p0, d0 }
// POST /api/game/next { id, q, trades:[{s,side,n}] } -> next quarter's prices and news
// POST /api/game/add { id, s }           -> add any US stock or fund to a game (its simulated past comes from the game's seed)
// POST /api/game/challenge { id, name }  -> share code for a finished game (friends replay the same future)
// GET  /api/game/challenge?code=XXXX     -> the challenger's name and score
// Challenge games replay a known market, so they never count for the leaderboard.
// The market for each quarter is only generated after that quarter's trades are locked in,
// so nobody can see the future before trading, and scores can't be edited in the browser.
import { getStore } from '@netlify/blobs';
import { START, NQ, LIST, LIST2, A, ALL, simQuarter, applyTrades, dividends, worthOf, extraAsset, extraHistory } from '../lib/market.mjs';
import { assetInfo, quote, pub, SYM_RE } from '../lib/assets.mjs';
const MAX_EXTRA = 30;
const exObjs = (g) => { const o = {}; Object.keys(g.ex || {}).forEach((k) => { o[k] = extraAsset(g.ex[k]); }); return o; };

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const NAME = /^[A-Za-z0-9_.]{3,16}$/;
const CODE = /^[a-z0-9]{8}$/;
const newCode = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; const r = crypto.getRandomValues(new Uint8Array(8)); return Array.from(r, (x) => a[x % a.length]).join(''); };
const nyDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

async function startPrices(req) {
  const p0 = {};
  LIST.concat(LIST2).forEach((o) => { p0[o.sym] = o.p0; });
  try {
    const r = await fetch(new URL('/api/quotes', req.url), { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = await r.json();
      LIST.concat(LIST2).forEach((o) => { const q = j.quotes && j.quotes[o.sym]; if (q && q.c > 0) p0[o.sym] = q.c; });
    }
  } catch (e) { /* use fallback prices */ }
  return p0;
}

export default async (req) => {
  const games = getStore({ name: 'games', consistency: 'strong' });
  const chals = getStore({ name: 'challenges', consistency: 'strong' });
  const url = new URL(req.url), path = url.pathname;
  if (req.method === 'GET' && path.endsWith('/challenge')) {
    const code = String(url.searchParams.get('code') || '').toLowerCase();
    const c = CODE.test(code) ? await chals.get(code, { type: 'json' }) : null;
    if (!c) return json({ error: 'This challenge link doesn\u2019t work anymore.' }, 404);
    return json({ code, name: c.name || null, ret: c.ret, worth: c.worth });
  }
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  let body = {};
  try { body = await req.json(); } catch (e) { /* empty body is fine for start */ }

  if (path.endsWith('/start')) {
    const id = crypto.randomUUID();
    let c = null;
    if (body.challenge != null) {
      const code = String(body.challenge).toLowerCase();
      c = CODE.test(code) ? await chals.get(code, { type: 'json' }) : null;
      if (!c) return json({ error: 'This challenge link doesn\u2019t work anymore.' }, 404);
      c.code = code;
    }
    const seed = c ? c.seed : crypto.getRandomValues(new Uint32Array(1))[0];
    const p0 = c ? c.p0 : await startPrices(req);
    const v = c ? (c.v || 1) : 2;
    const g = { id, seed, v, created: Date.now(), d0: c ? c.d0 : nyDay(), q: 0, cash: START, hold: {}, p0, last: { ...p0 }, div: 0, done: false };
    if (c) { g.challenge = c.code; if (c.exP0) g.exP0 = c.exP0; }
    await games.setJSON(id, g);
    const out = { id, p0, d0: g.d0, v: g.v };
    if (c) out.vs = { code: c.code, name: c.name || null, ret: c.ret, worth: c.worth };
    return json(out);
  }

  if (path.endsWith('/add')) {
    const s = String(body.s || '').toUpperCase();
    if (typeof body.id !== 'string' || body.id.length > 64 || !SYM_RE.test(s)) return json({ error: 'Bad request' }, 400);
    const g = await games.get(body.id, { type: 'json' });
    if (!g) return json({ error: 'Game not found' }, 404);
    if (g.done) return json({ error: 'This game is finished.' }, 409);
    if (A[s] || (g.v >= 2 && ALL[s])) return json({ core: true });
    g.ex = g.ex || {};
    if (!g.ex[s] && Object.keys(g.ex).length >= MAX_EXTRA) return json({ error: 'You can add up to ' + MAX_EXTRA + ' extra investments in one game.' }, 400);
    let m = g.ex[s];
    if (!m) {
      try {
        const info = await assetInfo(s);
        if (!info) return json({ error: 'We couldn’t find ' + s + ' on the US market.' }, 404);
        let p0 = g.exP0 && g.exP0[s];
        if (!p0) { const q = await quote(s); p0 = q && q.c; }
        if (!(p0 > 0)) return json({ error: 'No price for ' + s + ' right now.' }, 404);
        if (p0 < 1) return json({ error: s + ' costs under $1 a share. Penny stocks aren’t part of the simulator.' }, 400);
        m = { ...pub(info), p0: Math.round(p0 * 100) / 100 };
      } catch (e) { return json({ error: e.busy ? e.message : 'Couldn’t load ' + s + ' right now. Try again soon.' }, 503); }
    }
    const fresh = await games.get(body.id, { type: 'json' });
    if (!fresh || fresh.done) return json({ error: 'This game is finished.' }, 409);
    fresh.ex = fresh.ex || {};
    if (!fresh.ex[s]) fresh.ex[s] = m;
    m = fresh.ex[s];
    const pathArr = extraHistory(fresh.seed, fresh.q, extraAsset(m), m.p0, fresh.v);
    if (fresh.last[s] == null || !fresh.hold[s]) fresh.last[s] = pathArr[pathArr.length - 1];
    await games.setJSON(fresh.id, fresh);
    const { p0, ...asset } = m;
    return json({ asset, path: pathArr });
  }

  if (path.endsWith('/challenge')) {
    if (typeof body.id !== 'string' || body.id.length > 64) return json({ error: 'Missing game id' }, 400);
    const g = await games.get(body.id, { type: 'json' });
    if (!g || !g.done || !g.p0) return json({ error: 'Finish a "Simulate the future" game first.' }, 400);
    const name = NAME.test(String(body.name || '').trim()) ? String(body.name).trim() : null;
    const code = g.chal || newCode();
    const ret = Math.round((g.finalWorth / START - 1) * 10000) / 10000;
    const exP0 = {}; Object.keys(g.ex || {}).forEach((k) => { exP0[k] = g.ex[k].p0; }); Object.assign(exP0, g.exP0 || {});
    await chals.setJSON(code, { seed: g.seed, v: g.v || 1, p0: g.p0, d0: g.d0, exP0, ret, worth: g.finalWorth, name, game: g.id, created: Date.now() });
    if (!g.chal) { g.chal = code; await games.setJSON(g.id, g); }
    return json({ code, name, ret });
  }

  if (path.endsWith('/next')) {
    if (typeof body.id !== 'string' || body.id.length > 64) return json({ error: 'Missing game id' }, 400);
    const g = await games.get(body.id, { type: 'json' });
    if (!g) return json({ error: 'Game not found' }, 404);
    // A retry of the quarter we already played: send the same result again.
    if (body.q === g.q - 1 && g.lastRes) return json(g.lastRes);
    if (g.done || body.q !== g.q) return json({ error: 'This game is out of sync. Start a new game to enter the leaderboard.' }, 409);
    try { applyTrades(g, body.trades || [], g.last); } catch (e) { return json({ error: e.message }, 400); }
    const r = simQuarter(g.seed, g.q, g.last, exObjs(g), g.v);
    const div = dividends(g.hold, r.last, g.ex);
    g.cash = Math.round((g.cash + div) * 100) / 100;
    g.div = Math.round((g.div + div) * 100) / 100;
    g.last = r.last;
    const res = { q: g.q, paths: r.paths, news: r.news, div, cash: g.cash, hold: g.hold };
    g.q += 1;
    if (g.q >= NQ) { g.done = true; g.finalWorth = worthOf(g, g.last); g.finishedAt = Date.now(); res.finalWorth = g.finalWorth;
      if (g.challenge) { const c = await chals.get(g.challenge, { type: 'json' }); if (c) res.vs = { name: c.name || null, ret: c.ret, worth: c.worth }; } }
    g.lastRes = res;
    await games.setJSON(g.id, g);
    return json(res);
  }
  return json({ error: 'Not found' }, 404);
};

export const config = { path: ['/api/game/start', '/api/game/next', '/api/game/add', '/api/game/challenge'] };
