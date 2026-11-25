import type { RangeQuery } from '../validators/schemas';
export const BUSINESS_TIMEZONE = 'Asia/Karachi';
export function businessDay(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: BUSINESS_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
export function range(query: RangeQuery, now = new Date()) {
  const today = businessDay(now);
  let from = query.from;
  const to = query.to || today;
  if (!from) {
    const start = new Date(`${today}T00:00:00Z`);
    if (query.period === 'This year') from = `${today.slice(0, 4)}-01-01`;
    else if (query.period === 'Last 6 months') { const day = start.getUTCDate(); start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 6); const last = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate(); start.setUTCDate(Math.min(day, last)); from = start.toISOString().slice(0, 10); }
    else { start.setUTCDate(start.getUTCDate() - (Number(query.period.match(/\d+/)?.[0]) - 1)); from = start.toISOString().slice(0, 10); }
  }
  return { from, to, start: new Date(`${from}T00:00:00+05:00`), end: new Date(new Date(`${to}T00:00:00+05:00`).getTime() + 86400000) };
}
