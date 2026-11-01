// Start-pattern engine. Everything here runs on this device from your own start log.
// Models compete: a plain "your usual hour" guess vs. a richer guess vs. the Lagun's Law view.
// The app only claims a model is better when its own scores say so.
import { clamp } from "@/engine/model";
import type { Inputs } from "@/engine/model";

export type Outcome = "did" | "got" | "not";
export interface StartEv { id: string; ts: number; together: boolean; dueIn: number | null; o?: Outcome; task?: string; created?: number }
export interface Check { day: string; sleep: number; energy: number; dread: number } // each 1..3
export interface Snap { ts: number; p: number; pb: number; pl: number | null; y?: 0 | 1 }
export interface Exp { day: string; arm: string; hit?: boolean }
export interface Log { starts: StartEv[]; checks: Check[]; snaps: Snap[]; exps: Exp[] }
export const emptyLog = (): Log => ({ starts: [], checks: [], snaps: [], exps: [] });

const DAY = 864e5, WIN = 3 * 36e5;
const sig = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => { const q = clamp(p, 0.02, 0.98); return Math.log(q / (1 - q)); };
export const dayKeyOf = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** Lagun's Law in the paper's own form. Primode is lifted off zero so P^CAP is defined (0^0 is not). Experimental. */
export function paperDrive(i: Inputs): number {
  const P = 0.1 + 0.9 * i.Primode, F = 0.1 + 0.9 * i.Flexion;
  return Math.pow(P, i.CAP) * F / Math.max(i.Anchory + i.Grain, 0.05) + i.Slip;
}

export interface Ctx { now: number; dueTasks: { due?: string; doneAt?: number }[]; friendsStarted: number; sliders?: Inputs | null }
export interface Prediction { p: number; pb: number; pl: number | null; lift: number; usual: number; why: string[]; known: number }

function observedDays(log: Log, now: number) {
  const first = Math.min(...[log.starts[0]?.ts, log.snaps[0]?.ts, log.checks[0] ? new Date(log.checks[0].day + "T12:00").getTime() : undefined].filter((x): x is number => !!x), now);
  return clamp(Math.ceil((now - first) / DAY), 1, 28);
}
/** Chance that, in the 3 hours starting at this hour, you start something. Smoothed towards 25% while data is thin. */
export function hourWindowRate(log: Log, now: number): number {
  const days = observedDays(log, now), h = new Date(now).getHours(); const hits = new Set<string>();
  for (const s of log.starts) { if (now - s.ts > 28 * DAY) continue; const d = new Date(s.ts), hh = d.getHours(); const inWin = (hh - h + 24) % 24 < 3; if (inWin) hits.add(dayKeyOf(s.ts)); }
  return (hits.size + 0.75) / (days + 3);
}
function pressure(ctx: Ctx): { d: number; hrs: number | null } {
  let best: number | null = null;
  for (const t of ctx.dueTasks) { if (t.doneAt || !t.due) continue; const end = new Date(t.due + "T23:59").getTime(); const h = (end - ctx.now) / 36e5; if (h > -24 && (best === null || h < best)) best = h; }
  return best === null ? { d: 0, hrs: null } : { d: sig((72 - best) / 12), hrs: best };
}

export function predict(log: Log, ctx: Ctx): Prediction {
  const now = ctx.now, today = dayKeyOf(now);
  const pb = hourWindowRate(log, now); const days = observedDays(log, now);
  const pg = (new Set(log.starts.map(s => dayKeyOf(s.ts))).size + 0.75) / (days + 3) / 2.2; // rough usual level across windows
  let eta = logit(pb); const parts: { w: number; t: string }[] = [];
  if (pb > pg * 1.5 && log.starts.length >= 5) parts.push({ w: 0.5, t: "This is one of your usual start hours." });
  if (pb < pg * 0.6 && log.starts.length >= 5) parts.push({ w: -0.5, t: "This is not usually one of your start hours." });
  const pr = pressure(ctx);
  if (pr.hrs !== null && pr.d > 0.05) { const w = 0.9 * pr.d; eta += w; parts.push({ w, t: pr.hrs < 24 ? "Something is due within a day." : "A deadline is getting close." }); }
  const ck = log.checks.find(c => c.day === today);
  if (ck) {
    const a = 0.35 * (ck.sleep - 2), b = 0.35 * (ck.energy - 2), c = -0.4 * (ck.dread - 2); eta += a + b + c;
    if (a < 0) parts.push({ w: a, t: "You slept badly, so go gently." }); if (a > 0) parts.push({ w: a, t: "You slept well." });
    if (b < 0) parts.push({ w: b, t: "Energy is low today." }); if (b > 0) parts.push({ w: b, t: "Energy is good today." });
    if (c < 0) parts.push({ w: c, t: "It feels heavy. Make the first step tiny." }); if (c > 0) parts.push({ w: c, t: "It feels light today." });
  }
  const fs = Math.min(ctx.friendsStarted, 2); if (fs > 0) { eta += 0.3 * fs; parts.push({ w: 0.3 * fs, t: fs === 1 ? "A friend already started." : "Friends already started." }); }
  const act = new Set(log.starts.filter(s => now - s.ts < 7 * DAY).map(s => dayKeyOf(s.ts))).size / 7;
  if (log.starts.length >= 3) { const m = 0.6 * (act - 0.4); eta += m; if (m > 0.1) parts.push({ w: m, t: "You have been on a roll this week." }); if (m < -0.1) parts.push({ w: m, t: "A quiet week. A tiny start restarts it." }); }
  const p = sig(eta);
  const pl = ctx.sliders ? sig(logit(pb) + clamp(1.0 * (paperDrive(ctx.sliders) - 0.7), -1.5, 1.5)) : null;
  parts.sort((x, y) => Math.abs(y.w) - Math.abs(x.w));
  return { p, pb, pl, lift: eta - logit(pb), usual: pb, why: parts.slice(0, 3).map(x => x.t), known: log.starts.length };
}

/** Record a snapshot at most once every 3 hours, and settle old ones against what really happened. */
export function updateSnaps(log: Log, pred: Prediction, now: number): Log {
  const snaps = log.snaps.map(s => (s.y === undefined && now >= s.ts + WIN ? { ...s, y: (log.starts.some(t => t.ts > s.ts && t.ts <= s.ts + WIN) ? 1 : 0) as 0 | 1 } : s));
  const last = snaps[snaps.length - 1];
  if (!last || now - last.ts >= WIN) snaps.push({ ts: now, p: pred.p, pb: pred.pb, pl: pred.pl });
  return { ...log, snaps: snaps.slice(-400) };
}

export interface Accuracy { n: number; verdict: "learning" | "ahead" | "behind" | "tie"; brier: number; brierBase: number; brierConst: number; lagun: "learning" | "ahead" | "behind" | "tie"; nl: number }
const brier = (xs: [number, number][]) => xs.reduce((a, [p, y]) => a + (p - y) ** 2, 0) / Math.max(xs.length, 1);
export function accuracy(log: Log): Accuracy {
  const r = log.snaps.filter(s => s.y !== undefined); const n = r.length;
  const m = r.reduce((a, s) => a + (s.y as number), 0) / Math.max(n, 1);
  const bP = brier(r.map(s => [s.p, s.y as number])), bB = brier(r.map(s => [s.pb, s.y as number])), bC = brier(r.map(s => [m, s.y as number]));
  const ref = Math.min(bB, bC);
  const verdict: Accuracy["verdict"] = n < 15 ? "learning" : bP < ref - 0.002 ? "ahead" : bP > ref + 0.002 ? "behind" : "tie";
  const rl = r.filter(s => s.pl !== null); const nl = rl.length;
  const bL = brier(rl.map(s => [s.pl as number, s.y as number])), bBl = brier(rl.map(s => [s.pb, s.y as number]));
  const lagun: Accuracy["lagun"] = nl < 10 ? "learning" : bL < bBl - 0.002 ? "ahead" : bL > bBl + 0.002 ? "behind" : "tie";
  return { n, verdict, brier: bP, brierBase: bB, brierConst: bC, lagun, nl };
}

// ---------- the Start Map ----------
export const BLOCKS = [{ n: "Night", a: 0, b: 5 }, { n: "Morning", a: 5, b: 12 }, { n: "Afternoon", a: 12, b: 17 }, { n: "Evening", a: 17, b: 21 }, { n: "Late", a: 21, b: 24 }];
const wilson = (k: number, n: number) => { if (!n) return [0, 1] as const; const z = 1.28, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), s = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.max(0, (c - s) / d), Math.min(1, (c + s) / d)] as const; };
export interface Pattern {
  n: number; hours: { name: string; k: number; share: number; lo: number; hi: number }[]; best: string | null;
  weekdays: number[]; weeks: number[]; deadline: { n: number; late: number } | null; warm: { n: number; got: number } | null;
  friend: { together: number; solo: number; dTogether: number; dSolo: number } | null; latency: { n: number; medHrs: number } | null;
  type: { name: string; blurb: string; tip: string } | null; need: number;
}
export function analyse(log: Log, now: number): Pattern {
  const S = log.starts, n = S.length;
  const hours = BLOCKS.map(b => ({ name: b.n, k: S.filter(s => { const h = new Date(s.ts).getHours(); return h >= b.a && h < b.b; }).length })).map(x => { const [lo, hi] = wilson(x.k, n); return { ...x, share: n ? x.k / n : 0, lo, hi }; });
  const top = [...hours].sort((a, b) => b.k - a.k)[0]; const best = n >= 5 && top.lo > 0.2 ? top.name : null;
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(d => S.filter(s => new Date(s.ts).getDay() === d).length);
  const weeks = [3, 2, 1, 0].map(w => S.filter(s => now - s.ts >= w * 7 * DAY && now - s.ts < (w + 1) * 7 * DAY).length);
  const withDue = S.filter(s => s.dueIn !== null); const deadline = withDue.length >= 4 ? { n: withDue.length, late: withDue.filter(s => (s.dueIn as number) <= 2).length } : null;
  const oc = S.filter(s => s.o && s.o !== "not"); const warm = oc.length >= 4 ? { n: oc.length, got: oc.filter(s => s.o === "got").length } : null;
  const tg = S.filter(s => s.o && s.together), so = S.filter(s => s.o && !s.together);
  const friend = tg.length >= 4 && so.length >= 4 ? { together: tg.length, solo: so.length, dTogether: tg.filter(s => s.o === "did").length / tg.length, dSolo: so.filter(s => s.o === "did").length / so.length } : null;
  const lat = S.filter(s => s.created && s.ts > (s.created as number)).map(s => (s.ts - (s.created as number)) / 36e5).sort((a, b) => a - b); const latency = lat.length >= 3 ? { n: lat.length, medHrs: lat[Math.floor(lat.length / 2)] } : null;
  let type: Pattern["type"] = null; const need = Math.max(0, 6 - n);
  if (n >= 6) {
    const sh = (f: (s: StartEv) => boolean) => S.filter(f).length / n, hr = (s: StartEv) => new Date(s.ts).getHours();
    const act = new Set(S.filter(s => now - s.ts < 7 * DAY).map(s => dayKeyOf(s.ts))).size;
    if (deadline && deadline.late / deadline.n >= 0.6) type = { name: "Deadline Sprinter", blurb: "You start when the clock gets loud, and then you move.", tip: "Make a fake early deadline two days before the real one, and start for just two minutes." };
    else if (sh(s => s.together) >= 0.5) type = { name: "Starts-with-others", blurb: "Company is your ignition. Alone is harder.", tip: "Book a start with a friend before you need it." };
    else if (sh(s => hr(s) >= 5 && hr(s) < 12) >= 0.5) type = { name: "Morning Starter", blurb: "Your starts cluster before noon.", tip: "Put the hard thing first, before the day gets loud." };
    else if (sh(s => hr(s) >= 17 || hr(s) < 5) >= 0.55) type = { name: "Night Owl", blurb: "Your starts come late and your best focus does too.", tip: "Protect an evening slot, and set a soft stop so sleep wins." };
    else if (warm && warm.got / warm.n >= 0.5) type = { name: "Warm-up Starter", blurb: "Beginning is the hard bit, then you flow.", tip: "Lower the bar for the first two minutes. You usually keep going." };
    else if (act >= 5) type = { name: "Steady Starter", blurb: "You show up most days, in small ways.", tip: "Keep the same cue every day and let the routine carry you." };
    else type = { name: "Mixed Starter", blurb: "Your starts do not follow one pattern yet.", tip: "A few more starts will show what your pattern really is." };
  }
  return { n, hours, best, weekdays, weeks, deadline, warm, friend, latency, type, need };
}

// ---------- Try this: a small bandit with a no-nudge arm ----------
export const ARMS: Record<string, { title: string; text: string; needsFriend?: boolean }> = {
  plan: { title: "Make an if-then plan", text: "Finish this sentence: \"When ___ happens, I will open it for two minutes.\" Then do it." },
  tiny: { title: "Only open it", text: "Your whole job today: open it and look at it for two minutes. You are allowed to stop after." },
  friend: { title: "Start next to a friend", text: "Send a friend a tap and start at the same time.", needsFriend: true },
  none: { title: "No nudge", text: "" },
};
const gammaInt = (k: number) => { let s = 0; for (let i = 0; i < k; i++) s -= Math.log(1 - Math.random()); return s; };
const betaSample = (a: number, b: number) => { const x = gammaInt(Math.min(a, 80)), y = gammaInt(Math.min(b, 80)); return x / (x + y); };
export function armStats(log: Log, now: number) {
  const today = dayKeyOf(now); const out: Record<string, { n: number; hit: number }> = {};
  for (const k of Object.keys(ARMS)) out[k] = { n: 0, hit: 0 };
  for (const e of log.exps) { if (e.day === today) continue; const hit = log.starts.some(s => dayKeyOf(s.ts) === e.day); out[e.arm].n++; if (hit) out[e.arm].hit++; }
  return out;
}
export function pickArm(log: Log, now: number, hasFriends: boolean): string {
  const stats = armStats(log, now); const keys = Object.keys(ARMS).filter(k => hasFriends || !ARMS[k].needsFriend);
  if (Math.random() < 0.25) return keys[Math.floor(Math.random() * keys.length)]; // randomisation floor
  let best = keys[0], bv = -1; for (const k of keys) { const v = betaSample(1 + stats[k].hit, 1 + stats[k].n - stats[k].hit); if (v > bv) { bv = v; best = k; } } return best;
}
