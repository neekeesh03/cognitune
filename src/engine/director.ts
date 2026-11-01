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
interface DS { miss: number; tomorrow?: Tomorrow | null; seenMilestone?: number }
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
export function surprise(): { sparks: number; line: string } | null {
  if (!directorOn()) return null;
  const d = load(); const st = stage(); const p = P[st]; const forced = d.miss >= PITY[st];
  if (!forced && Math.random() > p) { save({ ...d, miss: d.miss + 1 }); return null; }
  const rare = Math.random() < 0.1; save({ ...d, miss: 0 });
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
  const c = new Array(24).fill(0); loadLog().starts.filter(s => now - s.ts < 28 * DAY).forEach(s => c[new Date(s.ts).getHours()]++);
  const best = c.indexOf(Math.max(...c)); return Math.max(...c) >= 3 ? best : new Date(now).getHours();
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
export function comeback(now = Date.now()): { task: string; days: number } | null {
  if (!directorOn()) return null;
  const S = loadLog().starts.filter(s => s.ts <= now); const last = S[S.length - 1]; if (!last) return null;
  const days = dayKeyNum(now) - dayKeyNum(last.ts); return days >= 2 && days <= 14 ? { task: last.task || "one small thing", days } : null;
}

// Values affirmation (Steele 1988; Epton et al. 2015: small but reliable effect on behaviour, d = .32).
// Reflecting on what matters lowers the threat of a task that feels like a test of you. Used only on the "afraid I'll do it badly" path.
export const VALUES = ["Learning", "Family", "Health", "Freedom", "Creativity", "Being reliable", "Kindness", "Growing"];
const VK = "lagomo.values.v1";
export const loadValue = (): string | null => { try { const v = localStorage.getItem(VK); return v && VALUES.includes(v) ? v : null; } catch { return null; } };
export const saveValue = (v: string) => { try { localStorage.setItem(VK, v); } catch { /* ignore */ } };
