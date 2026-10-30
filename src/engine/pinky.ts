/** Pinky: a small promise between two friends. Everything is derived from the encrypted chat messages, so the server never sees a promise.
 *  Rules: a missed window never "fails". It rolls over, can be made smaller, or can be let go. Nothing is ever lost. */
export type PinkyMode = "side" | "same" | "cheer";
export type PinkyOp = "make" | "join" | "done" | "keep" | "smaller" | "letgo";
export type Receipt = "tap" | "timer" | "photo";
export interface PinkyEvt { id: string; op: PinkyOp; mode?: PinkyMode; text?: string; end?: number; receipt?: Receipt }
/** A photo receipt travels as an encrypted chat file. It vanishes from our server after 48 hours. */
export interface PhotoRef { id: string; name: string; type: string; size: number; iv?: string }
export interface PinkyPart { text: string; doneAt?: number; receipt?: Receipt; letGo?: boolean; photo?: PhotoRef }
export const PHOTO_HOURS = 48;
export interface Pact { id: string; mode: PinkyMode; creator: string; parts: Record<string, PinkyPart>; end: number; madeAt: number }
export type MyState = "join" | "open" | "done" | "rolled" | "letgo" | "watching";

export const HOUR = 3600000;
export interface Evt { from: string; ts: number; pinky?: PinkyEvt; file?: PhotoRef }

/** Builds every pact in a chat from its messages, oldest first. Unknown ids and impossible moves are ignored. */
export function reducePacts(msgs: Evt[]): Pact[] {
  const map = new Map<string, Pact>();
  for (const m of [...msgs].sort((a, b) => a.ts - b.ts)) {
    const e = m.pinky; if (!e || !e.id) continue;
    if (e.op === "make") { if (map.has(e.id) || !e.text || !e.end) continue; map.set(e.id, { id: e.id, mode: e.mode ?? "side", creator: m.from, parts: { [m.from]: { text: e.text } }, end: e.end, madeAt: m.ts }); continue; }
    const p = map.get(e.id); if (!p) continue;
    const mine = p.parts[m.from];
    if (e.op === "join") { if (m.from === p.creator || mine || p.mode === "cheer") continue; p.parts[m.from] = { text: p.mode === "same" ? p.parts[p.creator].text : (e.text || p.parts[p.creator].text) }; if (e.end && e.end > p.end) p.end = e.end; }
    else if (!mine) continue;
    else if (e.op === "done") { if (!mine.doneAt) { mine.doneAt = m.ts; mine.receipt = e.receipt ?? "tap"; if (e.receipt === "photo" && m.file) mine.photo = m.file; } }
    else if (e.op === "keep") { if (e.end && e.end > p.end) p.end = e.end; mine.letGo = false; }
    else if (e.op === "smaller") { if (e.text && !mine.doneAt && p.mode !== "same") mine.text = e.text; if (e.end && e.end > p.end) p.end = e.end; mine.letGo = false; }
    else if (e.op === "letgo") { if (!mine.doneAt) mine.letGo = true; }
  }
  return [...map.values()].sort((a, b) => a.madeAt - b.madeAt);
}
/** Who has to keep it. In "cheer" mode only the person who promised. */
export const required = (p: Pact): string[] => (p.mode === "cheer" ? [p.creator] : Object.keys(p.parts));
/** Kept together: everyone required has actually done it (and in side-by-side or same mode both friends took part). */
export function keptTogether(p: Pact): boolean {
  if (p.mode === "cheer") return !!p.parts[p.creator]?.doneAt;
  const ids = Object.keys(p.parts); return ids.length >= 2 && ids.every(i => !!p.parts[i].doneAt);
}
/** This pact no longer needs anything from anyone. */
export function closed(p: Pact): boolean {
  if (keptTogether(p)) return true;
  const ids = required(p); return ids.length > 0 && ids.every(i => p.parts[i].doneAt || p.parts[i].letGo) && ids.some(i => p.parts[i].letGo);
}
export function myState(p: Pact, me: string, now: number): MyState {
  const part = p.parts[me];
  if (!part) return p.mode === "cheer" ? "watching" : "join";
  if (part.doneAt) return "done";
  if (part.letGo) return "letgo";
  return now > p.end ? "rolled" : "open";
}
/** The pact the pair is working on right now (at most one is open). */
export function activePact(pacts: Pact[]): Pact | undefined { return [...pacts].reverse().find(p => !closed(p)); }
export const keptCount = (pacts: Pact[]) => pacts.filter(keptTogether).length;
export const keptByMe = (pacts: Pact[], me: string) => pacts.filter(p => p.parts[me]?.doneAt).length;

const at = (d: Date, h: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0, 0).getTime();
export type WindowChoice = "tonight" | "day" | "tomorrow";
/** End time for a window choice. "Tonight" turns into 24 hours once it is already late. */
export function windowEnd(c: WindowChoice, now = new Date()): number {
  const n = now.getTime();
  if (c === "day") return n + 24 * HOUR;
  if (c === "tonight") { const t = at(now, 21); return t - n > HOUR ? t : n + 24 * HOUR; }
  const tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); return at(tm, 21);
}
/** A calm time for a reminder block: at least an hour from now and at least 30 minutes before the window ends. */
export function reminderSlot(end: number, now = Date.now()): { day: string; start: number } | null {
  let t = Math.ceil((now + HOUR) / (30 * 60000)) * 30 * 60000; if (t > end - 30 * 60000) return null;
  const d = new Date(t); const pad = (x: number) => String(x).padStart(2, "0");
  if (d.getHours() < 6) { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0).getTime(); if (m > end - 30 * 60000) return null; t = m; }
  const x = new Date(t); return { day: `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`, start: x.getHours() * 60 + x.getMinutes() };
}
export const timeLeft = (end: number, now = Date.now()): string => {
  const ms = end - now; if (ms <= 0) return "";
  const m = Math.round(ms / 60000); if (m < 60) return `${m} min left`; const h = Math.round(m / 60); return h < 24 ? `${h} h left` : "about a day left";
};
/** Text shown in chat lists and used as the fallback line. */
export const summary = (e: PinkyEvt): string => ({ make: "Made a Pinky", join: "Joined the Pinky", done: e.receipt === "photo" ? "Kept their Pinky, with a photo" : "Kept their Pinky", keep: "Kept the Pinky for tomorrow", smaller: "Made the Pinky smaller", letgo: "Let a Pinky go" }[e.op]);

export const TINY = ["open it for 2 minutes", "write one sentence", "put on my shoes", "do the first tiny step", "set a 2-minute timer"];
export const CUES = ["I get home", "I sit at my desk", "after dinner", "tomorrow morning", "I finish this"];

// ---- Phase 2: weekly rhythm and the shared burrow. Both only ever go up. ----
export const WEEK_GOAL = 3;
/** Monday 00:00 (local) of the week that contains ts. */
export const weekStart = (ts: number): number => { const d = new Date(ts); const back = (d.getDay() + 6) % 7; return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime(); };
/** When a pact was kept together: the time of the last "done" among its parts. */
const keptAt = (p: Pact): number => Math.max(...Object.values(p.parts).map(x => x.doneAt ?? 0));
export interface Rhythm { thisWeek: number; goal: number; weeksHit: number; reached: boolean }
/** Pinkies kept this week and how many weeks reached the goal. A quiet week never takes anything away. */
export function rhythm(pacts: Pact[], now = Date.now(), goal = WEEK_GOAL): Rhythm {
  const per = new Map<number, number>();
  for (const p of pacts) if (keptTogether(p)) { const w = weekStart(keptAt(p)); per.set(w, (per.get(w) ?? 0) + 1); }
  const cur = per.get(weekStart(now)) ?? 0; let weeksHit = 0; for (const n of per.values()) if (n >= goal) weeksHit++;
  return { thisWeek: cur, goal, weeksHit, reached: cur >= goal };
}
export type BurrowItem = "sprout" | "carrot" | "flower" | "mushroom";
const ORDER: BurrowItem[] = ["sprout", "carrot", "flower", "carrot", "mushroom", "flower"];
/** What grows in the shared burrow: one item per kept Pinky, up to 12 shown. Items never disappear. */
export const burrowItems = (kept: number): BurrowItem[] => Array.from({ length: Math.min(kept, 12) }, (_, i) => ORDER[i % ORDER.length]);
export const burrowName = (kept: number): string => kept === 0 ? "Empty burrow" : kept < 3 ? "Little burrow" : kept < 6 ? "Cozy burrow" : kept < 10 ? "Blooming burrow" : "Garden burrow";
