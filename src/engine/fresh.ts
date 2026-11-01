// Fresh starts: new weeks, months, years and the dates you choose feel like clean pages, and people begin more easily on them.
export interface Landmark { id: string; label: string; date: string } // date = YYYY-MM-DD
const KEY = "lagomo.landmarks";
export const loadLandmarks = (): Landmark[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
export const saveLandmarks = (l: Landmark[]) => localStorage.setItem(KEY, JSON.stringify(l));
export const PRESETS = ["New semester", "New term", "New job", "New project", "Exam period", "My birthday"];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** The fresh-start phrase for today, or "" when it is an ordinary day. */
export function freshToday(now = new Date(), marks = loadLandmarks()): string {
  const k = key(now); const m = marks.find(x => x.date === k); if (m) return m.label + ".";
  if (now.getMonth() === 0 && now.getDate() === 1) return "New year.";
  if (now.getDate() === 1) return "New month."; if (now.getDay() === 1) return "New week."; return "";
}
export function nextLandmark(now = new Date(), marks = loadLandmarks()): { label: string; days: number } | null {
  const t = new Date(key(now) + "T12:00").getTime(); const up = marks.map(m => ({ label: m.label, days: Math.round((new Date(m.date + "T12:00").getTime() - t) / 864e5) })).filter(x => x.days > 0).sort((a, b) => a.days - b.days)[0];
  return up ?? null;
}
