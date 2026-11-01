// Our own daily price history. Every time the site fetches a price, it records that trading day's
// open, high, low and close. Charts start short and grow by one candle each trading day.
const NY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
export const nyDate = (t) => NY.format(new Date(t * 1000));
const r2 = (x) => Math.round(x * 100) / 100;
// days: [[YYYY-MM-DD, open, high, low, close], ...] oldest first. Returns true if it changed.
export function addCandle(days, q) {
  if (!q || !(q.c > 0) || !(q.t > 0) || !(q.o > 0) || !(q.h > 0) || !(q.l > 0)) return false;
  const row = [nyDate(q.t), r2(q.o), r2(Math.max(q.h, q.c, q.o)), r2(Math.min(q.l, q.c, q.o)), r2(q.c)];
  const last = days[days.length - 1];
  if (last && last[0] === row[0]) {
    if (last.join() === row.join()) return false;
    days[days.length - 1] = row;
  } else if (!last || last[0] < row[0]) {
    days.push(row);
    if (days.length > 1300) days.splice(0, days.length - 1300);
  } else return false;
  return true;
}
