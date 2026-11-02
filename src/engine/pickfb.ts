/** Learns which Today suggestions you take or skip. Stored on this device only. */
const KEY = "lagomo.pickfb.v1";
export type PickFb = Record<string, { acc: number; skip: number; last: number; t?: string }>;
export function loadPickFb(): PickFb { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
export function recordPick(view: string, kind: "acc" | "skip", title?: string) {
  try { const f = loadPickFb(); const e = f[view] ?? { acc: 0, skip: 0, last: 0 }; e[kind]++; if (title) e.t = title; e.last = Date.now(); f[view] = e; localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* ignore */ }
}
/** Score above 0 = you tend to take it, below 0 = you tend to skip it. Needs 3+ answers. */
export function pickScore(fb: PickFb, view: string): number {
  const e = fb[view]; if (!e || e.acc + e.skip < 3) return 0;
  return (e.acc - e.skip) / (e.acc + e.skip + 2);
}
/** Stable re-order: liked first, disliked last. Keeps the first item if it is urgent (letter, light day). */
export function retune<T extends { view: string }>(items: T[], fb: PickFb, keepFirst = 0): T[] {
  const head = items.slice(0, keepFirst), rest = items.slice(keepFirst);
  return [...head, ...rest.map((p, i) => ({ p, i, s: pickScore(fb, p.view) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p)];
}
export function pickSummary(fb: PickFb): { view: string; title: string; acc: number; skip: number; score: number }[] {
  return Object.entries(fb).map(([view, e]) => ({ view, title: e.t ?? view, acc: e.acc, skip: e.skip, score: pickScore(fb, view) })).filter(x => x.acc + x.skip >= 3).sort((a, b) => b.score - a.score);
}
