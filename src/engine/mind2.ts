// Mind, part 2: spaced recall, time guesses, feelings, personal experiments. Pure logic. Evidence notes live in the screens.

// ---- Recall Deck: SM-2 style scheduling (public algorithm). Expanding vs uniform spacing made no difference in a 2021 meta-analysis, so a simple scheduler is enough. ----
export interface Card { id: string; q: string; a: string; ease: number; int: number; reps: number; lapses: number; due: number; seen: number }
export const DAY_MS = 864e5;
export const newCard = (q: string, a: string, now = Date.now()): Card => ({ id: crypto.randomUUID(), q: q.trim().slice(0, 300), a: a.trim().slice(0, 500), ease: 2.5, int: 0, reps: 0, lapses: 0, due: now, seen: 0 });
export type Rating = "again" | "hard" | "good" | "easy";
/** Next state of a card after a self-rating. Intervals are in days; "again" returns in 10 minutes. */
export function review(c: Card, r: Rating, now = Date.now()): Card {
  let { ease, int, reps, lapses } = c; let due: number;
  if (r === "again") { reps = 0; lapses += 1; ease = Math.max(1.3, ease - 0.2); int = 0; due = now + 10 * 60e3; }
  else {
    if (r === "hard") { ease = Math.max(1.3, ease - 0.15); int = reps === 0 ? 1 : Math.max(1, Math.round(int * 1.2)); }
    else if (r === "good") { int = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(1, Math.round(int * ease)); }
    else { ease = ease + 0.15; int = reps === 0 ? 3 : Math.max(2, Math.round(int * ease * 1.3)); }
    reps += 1; due = now + int * DAY_MS;
  }
  return { ...c, ease: Math.round(ease * 100) / 100, int, reps, lapses, due, seen: c.seen + 1 };
}
/** The queue for today: due cards first (oldest first), capped so a backlog never feels like a wall. New cards are limited per day. */
export function queue(cards: Card[], now = Date.now(), cap = 12, newCap = 5) {
  const due = cards.filter(c => c.seen > 0 && c.due <= now).sort((a, b) => a.due - b.due); const fresh = cards.filter(c => c.seen === 0);
  const pick = [...due.slice(0, cap)]; for (const c of fresh) { if (pick.length >= cap || pick.filter(x => x.seen === 0).length >= newCap) break; pick.push(c); }
  return { today: pick, overdue: Math.max(0, due.length - cap), totalDue: due.length, fresh: fresh.length };
}
/** "Reset the pile": spread overdue cards over the next days so the backlog stops being a wall. */
export function resetPile(cards: Card[], now = Date.now(), perDay = 8): Card[] {
  const od = cards.filter(c => c.seen > 0 && c.due <= now).sort((a, b) => a.due - b.due); const ids = new Map(od.map((c, i) => [c.id, now + Math.floor(i / perDay) * DAY_MS + 3 * 3600e3]));
  return cards.map(c => (ids.has(c.id) ? { ...c, due: ids.get(c.id)! } : c));
}
/** Pasted notes become cards: one per line, "question :: answer", "question | answer" or tab separated. */
export function parseCards(text: string): { q: string; a: string }[] {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const m = l.split(/\s*(?:::|\t|\|)\s*/); return m.length >= 2 && m[0] && m.slice(1).join(" ") ? { q: m[0], a: m.slice(1).join(" | ") } : null; }).filter((x): x is { q: string; a: string } => !!x).slice(0, 200);
}

// ---- Guess the time ----
export interface Guess { id: string; ts: number; task: string; type: string; guess: number; actual?: number }
export const GUESS_TYPES = ["Writing", "Reading", "Problems or maths", "Email or admin", "Chores", "Creative", "Something else"];
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 1; };
/** How much longer than your guess things usually take, by task type when there is enough history, else overall. */
export function multiplier(gs: Guess[], type?: string) {
  const done = gs.filter(g => g.actual && g.guess > 0); const own = type ? done.filter(g => g.type === type) : []; const pool = own.length >= 3 ? own : done;
  if (pool.length < 3) return null; const m = median(pool.map(g => g.actual! / g.guess)); return { x: Math.round(m * 100) / 100, n: pool.length, scope: own.length >= 3 ? type! : "all tasks" };
}
export const suggest = (guess: number, m: { x: number } | null) => (m ? Math.max(guess, Math.ceil((guess * m.x) / 5) * 5) : guess);

// ---- Handle a feeling ----
export const FEELINGS: Record<string, string[]> = {
  "Angry family": ["Irritated", "Annoyed", "Frustrated", "Resentful", "Furious", "Disrespected"],
  "Sad family": ["Disappointed", "Lonely", "Hurt", "Discouraged", "Hopeless", "Grieving"],
  "Worried family": ["Nervous", "Anxious", "Overwhelmed", "Dreading it", "Panicky", "Unsure"],
  "Ashamed family": ["Embarrassed", "Guilty", "Inadequate", "Like a failure", "Exposed", "Behind"],
  "Flat or tired": ["Bored", "Numb", "Drained", "Restless", "Unmotivated", "Stuck"],
  "Good family": ["Relieved", "Proud", "Hopeful", "Calm", "Excited", "Grateful"],
};
export const BODY = ["Chest", "Throat", "Stomach", "Head", "Shoulders", "Hands", "Whole body", "Not sure"];
export type Route = { kind: "urgent" | "calm-first" | "reappraise"; title: string; steps: string[] };
/** Pick-a-strategy by intensity (Sheppes' process model: distraction when intense, reappraisal when mild). A heuristic, not a rule; never suppress the feeling itself. */
export function routeFeeling(intensity: number): Route {
  if (intensity >= 9) return { kind: "urgent", title: "That is very intense. Go gentle.", steps: ["Slow your breathing first: long out-breaths, a minute or two.", "Move to a safer, quieter spot if you can, or text someone you trust.", "Do not decide anything big right now. The peak passes.", "If you might hurt yourself, or this stays this strong, please reach out to a person or a helpline now."] };
  if (intensity >= 6) return { kind: "calm-first", title: "Bring it down first, then think.", steps: ["Distract on purpose for 5 to 10 minutes: walk, music, tidy something, a show.", "Or slow breathing with long out-breaths.", "When it feels under 5, come back for the reframe below."] };
  return { kind: "reappraise", title: "Good moment to look at it differently.", steps: ["What is another way to see this situation?", "How would a friend you respect see it?", "Will it matter in a week? In a year?", "What is one thing you can do, even small?"] };
}

// ---- Personal experiments (n-of-1). Random days, simple Beta or normal posterior, weak prior shown to the user. ----
export interface TrialDay { day: string; arm: "A" | "B"; val?: number }
export interface Trial { id: string; ts: number; question: string; a: string; b: string; kind: "yesno" | "rating"; days: TrialDay[]; length: number; closed?: boolean }
const dayOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
/** Random order inside each pair of days, so both conditions get equal use and weekday effects are balanced. */
export function planDays(start: number, length: number, rand = Math.random): TrialDay[] {
  const out: TrialDay[] = []; for (let i = 0; i < length; i += 2) { const flip = rand() < 0.5; out.push({ day: dayOf(start + i * DAY_MS), arm: flip ? "A" : "B" }); if (i + 1 < length) out.push({ day: dayOf(start + (i + 1) * DAY_MS), arm: flip ? "B" : "A" }); } return out;
}
const gauss = (r: () => number) => { let u = 0, v = 0; while (!u) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function gamma(k: number, r: () => number): number { if (k < 1) return gamma(k + 1, r) * Math.pow(r(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x: number, v: number; do { x = gauss(r); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } }
const beta = (a: number, b: number, r: () => number) => { const x = gamma(a, r), y = gamma(b, r); return x / (x + y); };
export function analyseTrial(t: Trial, seed = 7) {
  let s = (seed + t.id.length * 977) >>> 0; const rand = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const A = t.days.filter(d => d.arm === "A" && d.val != null), B = t.days.filter(d => d.arm === "B" && d.val != null);
  if (A.length < 3 || B.length < 3) return { ready: false as const, nA: A.length, nB: B.length };
  let pAbetter: number, meanA: number, meanB: number;
  if (t.kind === "yesno") { const sa = A.filter(d => d.val === 1).length, sb = B.filter(d => d.val === 1).length; meanA = sa / A.length; meanB = sb / B.length; let w = 0; const N = 4000; for (let i = 0; i < N; i++) if (beta(1 + sa, 1 + A.length - sa, rand) > beta(1 + sb, 1 + B.length - sb, rand)) w++; pAbetter = w / N; }
  else { const m = (x: TrialDay[]) => x.reduce((a, d) => a + d.val!, 0) / x.length; const v = (x: TrialDay[]) => { const mu = m(x); return x.reduce((a, d) => a + (d.val! - mu) ** 2, 0) / Math.max(1, x.length - 1); }; meanA = m(A); meanB = m(B); const se = Math.sqrt(v(A) / A.length + v(B) / B.length + 1e-6); const z = (meanA - meanB) / se; pAbetter = 0.5 * (1 + erf(z / Math.SQRT2)); }
  return { ready: true as const, nA: A.length, nB: B.length, meanA, meanB, pAbetter };
}
function erf(x: number) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
export function trialVerdict(p: number, a: string, b: string) {
  const hi = Math.max(p, 1 - p), who = p >= 0.5 ? a : b, pct = Math.min(95, Math.round(hi * 100));
  return hi >= 0.9 ? `"${who}" probably works better for you (about ${pct}% sure).` : hi >= 0.75 ? `"${who}" looks a bit better (about ${pct}% sure). More days would help.` : `Too close to call (${pct}% for "${who}"). That is a real answer: it may not matter much for you.`;
}
export const todayArm = (t: Trial, now = Date.now()) => t.days.find(d => d.day === dayOf(now)) ?? null;
export { dayOf };
