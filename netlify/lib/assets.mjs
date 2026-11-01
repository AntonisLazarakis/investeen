// The whole US market: list of every US-listed stock and fund, plus details and prices for any one of them.
// Uses Finnhub. The symbol list is refreshed every few days and kept in Netlify Blobs.
// Each stock's details (industry, dividend, how much it swings) are kept for a week.
import { getStore } from '@netlify/blobs';

export const SYM_RE = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;
const MICS = new Set(['XNYS', 'XNAS', 'ARCX', 'BATS', 'XASE']);
const TYPES = { 'Common Stock': 's', 'ADR': 's', 'REIT': 's', 'ETP': 'e' };
const KEEP_UP = new Set(['ETF', 'ETN', 'US', 'USA', 'S&P', 'SPDR', 'AI', 'REIT', 'ADR', 'PLC', 'NV', 'SA', 'AG', 'LP', 'ESG', 'II', 'III', 'IV', 'NYSE', 'MSCI', 'FTSE', 'CRSP', 'AMD', 'IBM', 'ASML', 'TSMC', 'NASDAQ', 'UK', 'EM', 'SE', 'SPA', 'AB', 'ASA', 'NA', 'NYC', 'DBA', 'HP', 'UBS', 'BHP', 'BP', 'ING', 'JPM', 'GE']);
export const SEC_LABEL = { tech: 'Technology', comm: 'Communication', cons: 'Consumer', auto: 'Cars', energy: 'Energy', health: 'Health care', staples: 'Consumer staples', fin: 'Financials', ind: 'Industrials', re: 'Real estate' };

const key = () => (globalThis.Netlify && Netlify.env.get('FINNHUB_KEY')) || process.env.FINNHUB_KEY || '';
export async function fh(path) {
  const r = await fetch(`https://finnhub.io/api/v1/${path}${path.includes('?') ? '&' : '?'}token=${key()}`, { signal: AbortSignal.timeout(8000) });
  if (r.status === 429) { const e = new Error('The price service is busy. Try again in a minute.'); e.busy = true; throw e; }
  if (!r.ok) throw new Error('Finnhub ' + r.status);
  return r.json();
}
function nice(n) {
  return String(n || '').trim().split(/\s+/).map((w) => {
    const u = w.toUpperCase();
    if (KEEP_UP.has(u.replace(/[^A-Z&]/g, ''))) return u;
    if (/\d/.test(w)) return u;
    if (u === 'ISHARES') return 'iShares';
    return u.charAt(0) + u.slice(1).toLowerCase();
  }).join(' ');
}

let MEM = null;
export async function symbolList() {
  if (MEM && Date.now() - MEM.at < 6 * 36e5) return MEM;
  const st = getStore({ name: 'market', consistency: 'strong' });
  let cached = null;
  try { cached = await st.get('symbols-v1', { type: 'json' }); } catch (e) { /* none */ }
  if (cached && Date.now() - cached.at < 3 * 864e5) { MEM = cached; return MEM; }
  try {
    const raw = await fh('stock/symbol?exchange=US');
    const list = [];
    for (const x of raw) {
      const t = TYPES[x.type];
      const s = String(x.symbol || '');
      if (!t || !MICS.has(x.mic) || (x.currency && x.currency !== 'USD') || !SYM_RE.test(s) || !x.description) continue;
      list.push([s, nice(x.description), t]);
    }
    if (list.length < 1000) throw new Error('Symbol list looks incomplete');
    list.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    MEM = { at: Date.now(), list };
    await st.setJSON('symbols-v1', MEM);
    return MEM;
  } catch (e) {
    if (cached) { MEM = cached; return MEM; }
    throw e;
  }
}
async function findSym(sym) {
  const { list } = await symbolList();
  let lo = 0, hi = list.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (list[m][0] === sym) return list[m]; if (list[m][0] < sym) lo = m + 1; else hi = m - 1; }
  return null;
}

function sectorOf(ind) {
  const s = String(ind || '').toLowerCase();
  if (!s) return '';
  if (/real estate|reit/.test(s)) return 're';
  if (/auto/.test(s)) return 'auto';
  if (/semicon|technolog|software|hardware|electronic|computer|communications equip|it services/.test(s)) return 'tech';
  if (/media|telecom|entertain|internet|interactive|publishing|broadcast/.test(s)) return 'comm';
  if (/energy|oil|gas|coal|fuel/.test(s)) return 'energy';
  if (/pharma|biotech|health|medical|life science|drug/.test(s)) return 'health';
  if (/food|beverage|tobacco|household|personal|staple/.test(s)) return 'staples';
  if (/bank|financ|insurance|capital market|brokerage|asset management/.test(s)) return 'fin';
  if (/aerospace|defense|machinery|industrial|construction|transport|airline|logistic|building|electrical equip|engineering|trading compan|commercial service|marine|road|rail/.test(s)) return 'ind';
  if (/retail|consumer|hotel|restaurant|leisure|textile|apparel|travel|luxury|distribut|education|diversified consumer/.test(s)) return 'cons';
  if (/utilit/.test(s)) return 'staples';
  if (/chemical|metal|mining|material|paper|packag|steel/.test(s)) return 'ind';
  return '';
}
const BOND_RE = /bond|treasur|t-bill|fixed income|aggregate|muni|corporate debt|income etf|high yield|mortgage-backed/i;

// Details for one symbol (not including the live price). Returns null if it isn't a US stock or fund.
export async function assetInfo(sym) {
  if (!SYM_RE.test(sym)) return null;
  const st = getStore({ name: 'assets', consistency: 'strong' });
  let m = null;
  try { m = await st.get(sym, { type: 'json' }); } catch (e) { /* none */ }
  if (m && Date.now() - m.at < 7 * 864e5) return m;
  const row = await findSym(sym);
  if (!row) return m || null;
  let prof = {}, met = {};
  try { prof = (await fh(`stock/profile2?symbol=${encodeURIComponent(sym)}`)) || {}; } catch (e) { if (e.busy && !m) throw e; }
  try { met = ((await fh(`stock/metric?symbol=${encodeURIComponent(sym)}&metric=all`)) || {}).metric || {}; } catch (e) { if (e.busy && !m) throw e; }
  const etf = row[2] === 'e';
  const name = prof.name ? nice(prof.name) === prof.name.toUpperCase() ? nice(prof.name) : prof.name : row[1];
  const cls = etf ? (BOND_RE.test(row[1]) ? 'bond' : 'fund') : 'stock';
  const sk = etf ? sectorOf(row[1]) : sectorOf(prof.finnhubIndustry);
  let sig = 0;
  const sd = +met['3MonthADReturnStd'];
  if (sd > 3 && sd < 400) sig = sd / 100;
  else if (+met.beta > 0) sig = 0.12 + 0.2 * +met.beta;
  let yld = +(met.dividendYieldIndicatedAnnual ?? met.currentDividendYieldTTM ?? 0) / 100;
  if (!(yld >= 0 && yld < 0.25)) yld = 0;
  if (etf && !yld) yld = cls === 'bond' ? 0.04 : 0.012;
  const ind = prof.finnhubIndustry || '';
  const about = etf
    ? (cls === 'bond' ? 'A bond fund: one share holds many loans to governments or companies. Calmer than stocks.' : 'An exchange-traded fund (ETF): one share holds a whole basket of investments.')
    : `${ind ? ind + ' company' : 'A company'}${prof.country && prof.country !== 'US' ? ' based in ' + prof.country : ''}, traded on the US stock market.`;
  m = { sym, name, cls, sk, sec: SEC_LABEL[sk] || '', yld: Math.round(yld * 10000) / 10000, sig: Math.round(sig * 1000) / 1000, about, at: Date.now() };
  try { await st.setJSON(sym, m); } catch (e) { /* fine */ }
  return m;
}
export async function quote(sym) {
  const j = await fh(`quote?symbol=${encodeURIComponent(sym)}`);
  return j && j.c > 0 ? { c: j.c, d: j.d, dp: j.dp, h: j.h, l: j.l, o: j.o, pc: j.pc, t: j.t } : null;
}
export const pub = (m) => ({ sym: m.sym, name: m.name, cls: m.cls, sk: m.sk, sec: m.sec, yld: m.yld, sig: m.sig, about: m.about });
