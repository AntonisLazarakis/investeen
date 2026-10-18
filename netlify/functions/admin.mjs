// Private list of leaderboard entries WITH emails, for contacting winners.
// GET /api/admin?month=YYYY-MM  with header  x-admin-key: <ADMIN_KEY set in Netlify environment variables>
// DELETE /api/admin?month=YYYY-MM&email=...  removes one entry (e.g. a deletion request or a cheater)
import { getStore } from '@netlify/blobs';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function okKey(req) {
  const key = (globalThis.Netlify && Netlify.env.get('ADMIN_KEY')) || process.env.ADMIN_KEY || '';
  const got = req.headers.get('x-admin-key') || '';
  if (key.length < 12 || got.length !== key.length) return false;
  let d = 0; for (let i = 0; i < key.length; i++) d |= key.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

export default async (req) => {
  if (!okKey(req)) return json({ error: 'Wrong or missing admin key' }, 401);
  const boards = getStore({ name: 'leaderboard', consistency: 'strong' });
  const u = new URL(req.url);
  const month = /^\d{4}-\d{2}$/.test(u.searchParams.get('month') || '') ? u.searchParams.get('month') : null;
  if (req.method === 'GET') {
    const { blobs } = await boards.list();
    const months = blobs.map((x) => x.key).sort().reverse();
    const m = month || months[0];
    const board = m ? (await boards.get(m, { type: 'json' })) || { entries: [] } : { entries: [] };
    const entries = board.entries.slice().sort((a, b) => b.ret - a.ret || a.at - b.at).map((e, i) => ({ rank: i + 1, ...e }));
    return json({ month: m || null, months, entries });
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
