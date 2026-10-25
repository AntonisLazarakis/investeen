// Monthly leaderboard for finished "Simulate the future" games.
// GET  /api/leaderboard            -> this month's top 50 (usernames only, never emails) + last month's winners
// POST /api/leaderboard { id, name, email, age, parent, rules } -> enter a finished game
import { getStore } from '@netlify/blobs';
import { START } from '../lib/market.mjs';

const json = (o, status = 200, cache = 'no-store') => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });
const monthOf = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens', year: 'numeric', month: '2-digit' }).format(d).slice(0, 7);
const prevMonth = (m) => { const [y, mo] = m.split('-').map(Number); const d = new Date(Date.UTC(y, mo - 2, 15)); return d.toISOString().slice(0, 7); };
const NAME = /^[A-Za-z0-9_.]{3,16}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const BLOCK = ['admin', 'investeen', 'moderator', 'official'];

// Scores added by the site owner (played before the site went public).
const PINNED = {
  '2026-10': [{ name: 'Laz.trades', ret: 3.3636, worth: 436362.9, at: Date.UTC(2026, 9, 1), email: 'antonislazarakis11@icloud.com', age: '18+' }],
};
// Merge pinned scores in, keeping one best entry per email (same rule as normal entries).
// Entries the site owner removed (their own extra entries). Matched on exact name + score.
const HIDDEN = {
  '2026-10': [{ name: 'Laz.trades.', ret: 0.9945 }, { name: 'Laz', ret: 0.1114 }],
};
const visible = (m, list) => list.filter((e) => !(HIDDEN[m] || []).some((h) => h.name === e.name && h.ret === e.ret));
const withPinned = (m, list) => {
  const out = visible(m, list);
  for (const p of PINNED[m] || []) {
    const i = out.findIndex((e) => e.email === p.email);
    if (i < 0) out.push(p); else if (p.ret > out[i].ret) out[i] = { ...out[i], ...p };
  }
  return out;
};

const rank = (list) => list.slice().sort((a, b) => b.ret - a.ret || a.at - b.at);
const pub = (list, n) => rank(list).slice(0, n).map((e, i) => ({ rank: i + 1, name: e.name, ret: e.ret, worth: e.worth, at: e.at }));

export default async (req) => {
  const boards = getStore({ name: 'leaderboard', consistency: 'strong' });
  const month = monthOf();

  if (req.method === 'GET') {
    const cur = (await boards.get(month, { type: 'json' })) || { entries: [] };
    const pm = prevMonth(month);
    const prev = (await boards.get(pm, { type: 'json' })) || { entries: [] };
    const all = withPinned(month, cur.entries), pall = withPinned(pm, prev.entries);
    return json({ month, entries: pub(all, 50), players: all.length, prev: { month: pm, top: pub(pall, 3) } }, 200, 'public, max-age=0, must-revalidate');
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let b;
  try { b = await req.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
  const name = String(b.name || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  if (!NAME.test(name) || BLOCK.some((w) => name.toLowerCase().includes(w))) return json({ error: 'Pick a username of 3–16 letters, numbers, dots or underscores.' }, 400);
  if (!EMAIL.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (b.age !== '18+' && b.age !== '15-17') return json({ error: 'You must be 15 or older to enter.' }, 400);
  if (b.age === '15-17' && b.parent !== true) return json({ error: 'Players under 18 need a parent or guardian to agree.' }, 400);
  if (b.rules !== true) return json({ error: 'Please accept the contest rules.' }, 400);

  const games = getStore({ name: 'games', consistency: 'strong' });
  const g = typeof b.id === 'string' && b.id.length <= 64 ? await games.get(b.id, { type: 'json' }) : null;
  if (!g || !g.done) return json({ error: 'Finish all 3 years of a game first.' }, 400);
  if (g.submitted) return json({ error: 'This game is already on the leaderboard.' }, 409);

  const board = (await boards.get(month, { type: 'json' })) || { entries: [] };
  const lname = name.toLowerCase();
  if (withPinned(month, board.entries).some((e) => e.name.toLowerCase() === lname && e.email !== email)) return json({ error: 'That username is taken this month. Try another one.' }, 409);
  if (board.entries.length >= 20000) return json({ error: 'The leaderboard is full this month.' }, 503);

  const entry = { name, email, age: b.age, parent: b.age === '15-17', ret: Math.round((g.finalWorth / START - 1) * 10000) / 10000, worth: g.finalWorth, at: Date.now(), id: g.id };
  const i = board.entries.findIndex((e) => e.email === email);
  let kept = false;
  if (i >= 0) {
    if (entry.ret > board.entries[i].ret) board.entries[i] = entry;
    else { kept = true; board.entries[i].name = name; }
  } else board.entries.push(entry);
  await boards.setJSON(month, board);
  g.submitted = true; g.entryEmail = email;
  await games.setJSON(g.id, g);

  const ranked = rank(withPinned(month, board.entries));
  const me = ranked.findIndex((e) => e.email === email);
  return json({ ok: true, kept, month, rank: me + 1, players: ranked.length, ret: entry.ret, best: ranked[me].ret });
};

export const config = { path: '/api/leaderboard' };
