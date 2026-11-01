// What your rabbit remembers, from your own start log and coach taps. All on this device.
import type { Log } from "@/engine/pattern";
import type { CoachEvent, Friction } from "@/engine/coach";
export const WHY: Record<Friction, string> = { unclear: "you did not know where to start", big: "it felt too big", boring: "it felt boring", scared: "you were afraid of doing it badly", tired: "you were tired", distract: "something else kept pulling you", meh: "it did not feel like it mattered" };
export const HOW: Record<Friction, string> = { unclear: "naming the first move", big: "shrinking it", boring: "pairing it with a treat", scared: "allowing a bad first draft", tired: "the reset and the smallest version", distract: "parking the other thing", meh: "finding your own reason" };
/** The idea that got you started most reliably after a Get unstuck: needs 2 tries and a start in at least 60% of them (within 30 minutes). */
export function whatWorked(log: Log, events: CoachEvent[]): { friction: Friction; tries: number; wins: number } | null {
  const t: Record<string, { tries: number; wins: number }> = {};
  for (const e of events) { const s = log.starts.find(x => x.ts >= e.ts && x.ts - e.ts < 30 * 60e3); const r = (t[e.friction] ??= { tries: 0, wins: 0 }); r.tries++; if (s && s.o !== "not") r.wins++; }
  let best: { friction: Friction; tries: number; wins: number } | null = null;
  for (const [f, v] of Object.entries(t)) if (v.tries >= 2 && v.wins / v.tries >= 0.6 && (!best || v.wins > best.wins)) best = { friction: f as Friction, ...v };
  return best;
}
const STOP = new Set(["the", "my", "a", "an", "to", "of", "and", "for", "with", "on", "in", "it", "this", "that", "some", "do", "start"]);
const words = (s: string) => new Set(s.toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
/** Have you started something like this before? */
export function taskMemory(log: Log, title: string): { count: number } | null {
  const a = words(title); if (a.size === 0) return null;
  let count = 0; for (const s of log.starts) { if (!s.task) continue; const b = words(s.task); if (b.size === 0) continue; let inter = 0; a.forEach(w => { if (b.has(w)) inter++; }); if (inter / (a.size + b.size - inter) >= 0.5) count++; }
  return count > 0 ? { count } : null;
}
