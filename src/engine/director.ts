// The Director: the quiet behaviour layer. Nothing here is labelled in the interface.
// It decides when a small surprise lands, what the finish moment says, what is waiting tomorrow,
// and how a comeback is framed. Each rule rests on published findings, and every rule is kind:
// no guilt, no fake scarcity, no punishing missed days, and rewards fade as the habit settles
// so the app never replaces the person's own reasons (overjustification, Deci 1971).
//
// Ideas used, in plain terms:
//  - Variable rewards with a floor: surprise beats predictable, but a long dry spell kills it (Schultz 1997; Skinner).
//  - Stage-aware: heavy support early, lighter later (Lally 2010, habits take weeks and fade in support).
//  - Identity: "you are someone who starts" lasts longer than "you did a task" (Bem 1972; Oyserman; Clear).
//  - Peak-end: people remember the peak and the ending, so the ending is the best line, not a summary (Kahneman 1993).
//  - Open loops: a task you have begun keeps calling (Zeigarnik 1927, Ovsiankina), so a first step is kept for tomorrow.
//  - Auto if-then: the saved step comes with your usual hour as its cue (Gollwitzer 1999).
//  - Kind restarts: after a gap the offer gets smaller, not louder (Sirois 2014; Fogg 2009).
import { loadLog } from "@/lib/startlog";
import { dayKeyOf } from "@/engine/pattern";
import { directorOn } from "@/lib/arm";

const K = "lagomo.director.v1";
export interface Tomorrow { task: string; step?: string; hour: number; ts: number }
interface Roll { ts: number; got: boolean }
interface Arm { s: number; f: number }
interface DS { miss: number; tomorrow?: Tomorrow | null; seenMilestone?: number; rolls?: Roll[]; bandit?: Record<string, Arm>; today?: { day: string; arm: string; tapped: boolean } }
const load = (): DS => { try { return { miss: 0, ...JSON.parse(localStorage.getItem(K) || "{}") }; } catch { return { miss: 0 }; } };
const save = (d: DS) => { try { localStorage.setItem(K, JSON.stringify(d)); } catch { /* storage full */ } };
const DAY = 864e5;

export type Stage = "new" | "build" | "steady";
/** How far along this person is, by days they have actually started on. */
export function stage(now = Date.now()): Stage {
  const days = new Set(loadLog().starts.filter(s => s.ts <= now).map(s => dayKeyOf(s.ts))).size;
  return days < 7 ? "new" : days < 30 ? "build" : "steady";
}

const SURPRISES = [
  "A tiny gift from your rabbit.", "Found something shiny.", "The rabbit did a little spin.", "Bonus. You earned it.",
  "That was smooth. Here's a little extra.", "Your rabbit saved this for you.", "Nice one. Take it.", "A lucky find.",
];
const RARE = ["A rare one. Make a wish.", "That was a big one. Savour it."];
const P: Record<Stage, number> = { new: 0.4, build: 0.25, steady: 0.12 };
const PITY: Record<Stage, number> = { new: 3, build: 4, steady: 7 }; // longest dry spell before one is guaranteed
/** After a finished session: sometimes a bonus. A guaranteed one after a dry spell (shorter early, longer once the habit is steady). */
/** Does a surprise actually bring this person back? Compares return within 48h after sessions with and without a bonus.
 *  If bonuses do not help (or hurt), they get rarer; if they help, a little more common. Needs 8 of each before it moves. */
export function adaptiveFactor(d: DS, now = Date.now()): number {
  const rolls = (d.rolls ?? []).filter(r => now - r.ts > 2 * DAY); if (rolls.length < 16) return 1;
  const days = loadLog().starts.map(x => x.ts);
  const back = (r: Roll) => days.some(t => t > r.ts + 6 * 36e5 && t < r.ts + 2 * DAY && dayKeyOf(t) !== dayKeyOf(r.ts));
  const a = rolls.filter(r => r.got), b = rolls.filter(r => !r.got); if (a.length < 8 || b.length < 8) return 1;
  const r1 = (a.filter(back).length + 1) / (a.length + 2), r0 = (b.filter(back).length + 1) / (b.length + 2);
  const se = Math.sqrt((r1 * (1 - r1)) / a.length + (r0 * (1 - r0)) / b.length), diff = r1 - r0; // only move when the gap is bigger than noise
  return diff > 2 * se ? 1.2 : diff < -1.5 * se ? 0.6 : 1;
}
/** After a finished session: sometimes a bonus. A guaranteed one after a dry spell (shorter early, longer once the habit is steady). */
export function surprise(): { sparks: number; line: string } | null {
  if (!directorOn()) return null;
  const d = load(); const st = stage(); const p = Math.min(0.6, P[st] * adaptiveFactor(d)); const forced = d.miss >= PITY[st];
  const hit = forced || Math.random() <= p; const rolls = [...(d.rolls ?? []), { ts: Date.now(), got: hit }].slice(-200);
  save({ ...d, miss: hit ? 0 : d.miss + 1, rolls }); if (!hit) return null;
  const rare = Math.random() < 0.1;
  const sparks = rare ? 9 + Math.floor(Math.random() * 5) : 2 + Math.floor(Math.random() * 5);
  const pool = rare ? RARE : SURPRISES; return { sparks, line: pool[Math.floor(Math.random() * pool.length)] };
}

const MILESTONES = [3, 5, 10, 25, 50, 100, 200];
/** The ending line of a finish moment: specific, true, and about who you are becoming. */
export function finishLine(now = Date.now()): string | null {
  if (!directorOn()) return null;
  const S = loadLog().starts.filter(s => s.ts <= now + 36e5).sort((a, b) => a.ts - b.ts); const n = S.length; if (!n) return null;
  const last = S[n - 1], prev = S[n - 2]; const gap = prev ? Math.floor((dayKeyNum(last.ts) - dayKeyNum(prev.ts))) : 0;
  const today = dayKeyOf(last.ts); const todayCount = S.filter(s => dayKeyOf(s.ts) === today).length;
  if (n === 1) return "That's your first start. You're a starter now.";
  if (gap >= 3) return "Welcome back. This one counts exactly the same.";
  if (MILESTONES.includes(n)) return `Start number ${n}. That's what a person who starts looks like.`;
  const wk = new Set(S.filter(s => now - s.ts < 7 * DAY).map(s => dayKeyOf(s.ts))).size;
  if (wk === 3 && todayCount === 1) return "Three start days this week. You're building something real.";
  if (todayCount >= 3) return "Three starts today. Your future self noticed.";
  if (new Date(last.ts).getHours() < 9) return "An early start. That one is yours.";
  return null;
}
const dayKeyNum = (ts: number) => Math.round(new Date(dayKeyOf(ts) + "T12:00").getTime() / DAY);

/** The hour you most often start around, from the last four weeks. Falls back to the current hour. */
export function usualHour(now = Date.now()): number {
  // recency-weighted circular kernel: recent starts count more, and 8:50 and 9:10 reinforce each other instead of splitting votes
  const sc = new Array(24).fill(0); let w = 0;
  for (const x of loadLog().starts) { const age = (now - x.ts) / DAY; if (age < 0 || age > 42) continue; const wt = Math.pow(0.5, age / 14); const t = new Date(x.ts); const hr = t.getHours() + t.getMinutes() / 60; w += wt;
    for (let h = 0; h < 24; h++) { const dd = Math.min(Math.abs(h - hr), 24 - Math.abs(h - hr)); sc[h] += wt * Math.exp(-(dd * dd) / (2 * 1.2 * 1.2)); } }
  return w >= 2.5 ? sc.indexOf(Math.max(...sc)) : new Date(now).getHours();
}

/** Keep the first step for tomorrow, with your usual hour as the cue. */
export function saveTomorrow(task: string, step?: string, now = Date.now()) {
  if (!directorOn() || !task.trim()) return; const d = load(); save({ ...d, tomorrow: { task: task.trim().slice(0, 120), step, hour: usualHour(now), ts: now } });
}
export function clearTomorrow() { const d = load(); save({ ...d, tomorrow: null }); }
/** Waiting for you from an earlier day, kept up to three days. */
export function tomorrowStep(now = Date.now()): Tomorrow | null {
  if (!directorOn()) return null;
  const t = load().tomorrow; if (!t) return null;
  if (dayKeyOf(t.ts) === dayKeyOf(now) || now - t.ts > 3 * DAY) return null; return t;
}
/** After a gap of 2 to 14 days, the offer shrinks to one minute. */
/** How many quiet days is normal for this person? Their own 75th percentile of skipped days, plus two, kept between 2 and 6. */
export function comebackAfter(now = Date.now()): number {
  const ds = [...new Set(loadLog().starts.filter(x => x.ts <= now).map(x => dayKeyNum(x.ts)))].sort((a, b) => a - b); const gaps: number[] = [];
  for (let i = 1; i < ds.length; i++) { const g = ds[i] - ds[i - 1] - 1; if (g >= 1) gaps.push(g); }
  if (gaps.length < 4) return 2; gaps.sort((a, b) => a - b); const p75 = gaps[Math.floor(0.75 * (gaps.length - 1))];
  return Math.min(6, Math.max(2, p75 + 2));
}
/** After a gap longer than is normal for them (2 to 14 days), the offer shrinks to one minute. */
export function comeback(now = Date.now()): { task: string; days: number } | null {
  if (!directorOn()) return null;
  const S = loadLog().starts.filter(s => s.ts <= now); const last = S[S.length - 1]; if (!last) return null;
  const days = dayKeyNum(now) - dayKeyNum(last.ts); return days >= comebackAfter(now) && days <= 14 ? { task: last.task || "one small thing", days } : null;
}

// Values affirmation (Steele 1988; Epton et al. 2015: small but reliable effect on behaviour, d = .32).
// Reflecting on what matters lowers the threat of a task that feels like a test of you. Used only on the "afraid I'll do it badly" path.
export const VALUES = ["Learning", "Family", "Health", "Freedom", "Creativity", "Being reliable", "Kindness", "Growing"];
const VK = "lagomo.values.v1";
export const loadValue = (): string | null => { try { const v = localStorage.getItem(VK); return v && VALUES.includes(v) ? v : null; } catch { return null; } };
export const saveValue = (v: string) => { try { localStorage.setItem(VK, v); } catch { /* ignore */ } };

// Which wording of the saved-step card works for this person? A small Thompson-sampling bandit over three honest framings.
// One pick per day; it counts as a win if they tap Start on it, a miss if the day passes without a tap. Everything stays on the device.
export const ARMS = ["plain", "identity", "bundle"] as const;
export type ArmId = typeof ARMS[number];
const gam = (k: number): number => { // Marsaglia-Tsang gamma sampler, shape k >= 1
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x: number, v: number; do { const u1 = Math.random(), u2 = Math.random(); x = Math.sqrt(-2 * Math.log(u1 || 1e-9)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = Math.random(); if (Math.log(u || 1e-9) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v; }
};
export const betaSample = (a: number, b: number) => { const x = gam(a), y = gam(b); return x / (x + y); };
export function pickArm(now = Date.now()): ArmId {
  const d = load(); const day = dayKeyOf(now); if (d.today && d.today.day === day) return d.today.arm as ArmId;
  const bandit = { ...(d.bandit ?? {}) }; if (d.today) { const a = bandit[d.today.arm] ?? { s: 0, f: 0 }; bandit[d.today.arm] = d.today.tapped ? { s: a.s + 1, f: a.f } : { s: a.s, f: a.f + 1 }; }
  let best: ArmId = "plain", bv = -1; for (const a of ARMS) { const p = bandit[a] ?? { s: 0, f: 0 }; const v = betaSample(1 + p.s, 1 + p.f); if (v > bv) { bv = v; best = a; } }
  save({ ...d, bandit, today: { day, arm: best, tapped: false } }); return best;
}
export function tapArm() { const d = load(); if (d.today) save({ ...d, today: { ...d.today, tapped: true } }); }
export function armStats(): Record<string, Arm> { return load().bandit ?? {}; }
export function armLine(arm: ArmId, hour: number, pair: string): string {
  const at = `${hour % 12 || 12}${hour < 12 ? "am" : "pm"}`;
  if (arm === "identity") return "You are someone who starts, and starters pick up where they left off. Ready when you are.";
  if (arm === "bundle") return `Your first step is ready. You usually start around ${at}.${pair}`;
  return `Your first step is ready. You usually start around ${at}.`;
}
