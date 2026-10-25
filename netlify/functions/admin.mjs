// Private admin tools for the leaderboard. Every request needs header  x-admin-key: <ADMIN_KEY set in Netlify>
// GET    /api/admin?month=YYYY-MM          -> that month's entries WITH emails (for contacting winners)
// GET    /api/admin?games=1                -> finished "Simulate the future" games that were never entered
// POST   /api/admin { id, name, email }    -> enter one of those finished games (same checks as the public form)
// DELETE /api/admin?month=YYYY-MM&email=.. -> remove one entry (e.g. a deletion request or a cheater)
import { getStore } from '@netlify/blobs';
import { START } from '../lib/market.mjs';
import enterLeaderboard from './leaderboard.mjs';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function okKey(req) {
  const key = (globalThis.Netlify && Netlify.env.get('ADMIN_KEY')) || process.env.ADMIN_KEY || '';
  const got = req.headers.get('x-admin-key') || '';
  if (key.length < 12 || got.length !== key.length) return false;
  let d = 0; for (let i = 0; i < key.length; i++) d |= key.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

async function unenteredGames() {
  const games = getStore({ name: 'games', consistency: 'strong' });
  const { blobs } = await games.list();
  const out = [];
  for (let i = 0; i < blobs.length; i += 25) {
    const batch = await Promise.all(blobs.slice(i, i + 25).map((b) => games.get(b.key, { type: 'json' }).catch(() => null)));
    batch.forEach((g) => {
      if (g && g.done && !g.submitted && typeof g.finalWorth === 'number') {
        out.push({ id: g.id, finalWorth: g.finalWorth, ret: Math.round((g.finalWorth / START - 1) * 10000) / 10000, started: g.created, finishedAt: g.finishedAt || null });
      }
    });
  }
  return out.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0)).slice(0, 100);
}

export default async (req) => {
  if (!okKey(req)) return json({ error: 'Wrong or missing admin key' }, 401);
  const boards = getStore({ name: 'leaderboard', consistency: 'strong' });
  const u = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(u.searchParams.get('month') || '') ? u.searchParams.get('month') : null;

  if (req.method === 'GET' && u.searchParams.get('games')) {
    return json({ games: await unenteredGames() });
  }
  if (req.method === 'GET') {
    const { blobs } = await boards.list();
    const months = blobs.map((x) => x.key).sort().reverse();
    const m = month || months[0];
    const board = m ? (await boards.get(m, { type: 'json' })) || { entries: [] } : { entries: [] };
    const entries = board.entries.slice().sort((a, b) => b.ret - a.ret || a.at - b.at).map((e, i) => ({ rank: i + 1, ...e }));
    return json({ month: m || null, months, entries });
  }
  if (req.method === 'POST') {
    // Enter a finished game the player forgot to submit. Goes through the normal leaderboard checks,
    // so only a real, finished, never-entered game can be added, with its real score.
    let b;
    try { b = await req.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
    const body = JSON.stringify({ id: b.id, name: b.name, email: b.email, age: '18+', parent: false, rules: true });
    return enterLeaderboard(new Request(new URL('/api/leaderboard', req.url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
  }
  if (req.method === 'DELETE') {
    const email = (u.searchParams.get('email') || '').toLowerCase();
    if (!month || !email) return json({ error: 'month and email are required' }, 400);
    const board = (await boards.get(month, { type: 'json' })) || { entries: [] };
    const before = board.entries.length;
    board.entries = board.entries.filter((e) => e.email !== email);
    await boards.setJSON(month, board);
    return json({ removed: before - board.entries.length });
  }
  return json({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin' };
