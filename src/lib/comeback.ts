import { loadLog } from "@/lib/startlog";
// Comeback coin: one small reward for starting again after a gap of two or more days, at most once a week.
// It never depends on a streak and it is never taken away. (The best-performing arm in a 54-programme gym megastudy was a micro-reward for returning after a miss.)
const KEY = "lagomo.coin.ts"; const DAY = 864e5;
export function comebackCoin(now = Date.now()): boolean {
  try {
    const starts = loadLog().starts.filter(s => s.ts < now); if (!starts.length) return false; const last = Math.max(...starts.map(s => s.ts));
    const gap = Math.floor((now - last) / DAY); const given = +(localStorage.getItem(KEY) || 0);
    if (gap < 2 || gap > 60 || now - given < 6 * DAY) return false;
    localStorage.setItem(KEY, String(now)); return true;
  } catch { return false; }
}
