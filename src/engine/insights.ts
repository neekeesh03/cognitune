// Insight engine: joins everything Mind records with your start log and finds patterns in YOUR data.
// Everything here is correlation on small samples. Uncertainty is shown, and nothing is called a cause.
import type { Mind } from "@/store/useMind";
import type { MindView } from "@/engine/mind";
import { avg, energyMap, sleepNight, type Pick } from "@/engine/mind";
import type { Trial } from "@/engine/mind2";
import { planDays } from "@/engine/mind2";

const DAY = 864e5;
export const dkL = (ts: number) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// ---- 1. One row per day ----
export interface DayRow { day: string; starts: number; started: boolean; sleepH: number | null; energy: number | null; mood: number | null; windPrev: boolean; woop: boolean; anchor: boolean; pm: boolean; used: boolean }
export function dayTable(m: Mind, starts: number[], now = Date.now(), span = 60): DayRow[] {
  const by = (arr: { ts: number }[]) => { const s = new Map<string, number>(); arr.forEach(x => s.set(dkL(x.ts), (s.get(dkL(x.ts)) ?? 0) + 1)); return s; };
  const st = by(starts.map(ts => ({ ts }))); const wind = by(m.wind); const woop = by(m.woop); const pm = by(m.pm);
  const anchorDays = new Set(m.anchors.flatMap(a => a.days));
  const sleep = new Map<string, number>(); m.sleep.forEach(s => sleep.set(dkL(s.ts), sleepNight(s).tst / 60));
  const pulse = new Map<string, { e: number[]; m: number[] }>(); m.pulse.forEach(p => { const k = dkL(p.ts); const v = pulse.get(k) ?? { e: [], m: [] }; v.e.push(p.e); v.m.push(p.m); pulse.set(k, v); });
  const any = new Set<string>(); [m.checks, m.tlx, m.woop, m.thoughts, m.pm, m.wind, m.calm, m.pulse, m.sleep, m.feelings, m.worries, m.breaks, m.good, m.deckLog, m.ledger, m.skills, m.loops].forEach(a => (a as { ts: number }[]).forEach(x => any.add(dkL(x.ts))));
  const rows: DayRow[] = [];
  for (let i = span - 1; i >= 0; i--) {
    const ts = now - i * DAY; const k = dkL(ts); const prev = dkL(ts - DAY); const p = pulse.get(k);
    rows.push({ day: k, starts: st.get(k) ?? 0, started: (st.get(k) ?? 0) > 0, sleepH: sleep.get(k) ?? null, energy: p ? avg(p.e) : null, mood: p ? avg(p.m) : null, windPrev: (wind.get(prev) ?? 0) > 0, woop: (woop.get(k) ?? 0) > 0, anchor: anchorDays.has(new Date(ts).toISOString().slice(0, 10)), pm: (pm.get(k) ?? 0) > 0, used: st.has(k) || any.has(k) });
  }
  return rows;
}
/** Days with any activity (a start or any Mind entry). Days you did not open the app are not counted as "did not start". */
export const activeDays = (rows: DayRow[]) => rows.filter(r => r.used).length;

// ---- 2. Which habits go with starting more? Bootstrap interval on the difference in the chance of starting. ----
export interface Driver { id: string; label: string; nYes: number; nNo: number; rateYes: number; rateNo: number; diff: number; lo: number; hi: number; strength: "probable" | "hint"; trial?: { question: string; a: string; b: string } }
const FACTORS: { id: string; label: string; get: (r: DayRow) => boolean | null; trial: { question: string; a: string; b: string } }[] = [
  { id: "sleep", label: "slept 7 hours or more", get: r => (r.sleepH == null ? null : r.sleepH >= 7), trial: { question: "Does getting 7+ hours of sleep help me start the next day?", a: "Aim for 7+ hours tonight", b: "Sleep as usual" } },
  { id: "energy", label: "had high energy", get: r => (r.energy == null ? null : r.energy >= 3.5), trial: { question: "Does a 5-minute walk first (to raise energy) help me start?", a: "5-minute walk before starting", b: "Start straight away" } },
  { id: "mood", label: "felt good", get: r => (r.mood == null ? null : r.mood >= 3.5), trial: { question: "Does one pleasant activity before work help me start?", a: "One pleasant thing first", b: "Straight to work" } },
  { id: "wind", label: "did a Wind-down the night before", get: r => r.windPrev, trial: { question: "Does a Wind-down the night before help me start?", a: "Do a Wind-down tonight", b: "Skip it tonight" } },
  { id: "woop", label: "made a WOOP plan", get: r => r.woop, trial: { question: "Does a morning WOOP plan help me start?", a: "Make a WOOP plan in the morning", b: "No plan" } },
  { id: "anchor", label: "did their tiny anchor", get: r => r.anchor, trial: { question: "Does my tiny anchor help me start?", a: "Do the anchor", b: "Skip the anchor" } },
  { id: "pm", label: "logged something pleasant", get: r => r.pm, trial: { question: "Does logging one pleasant or mastery activity help me start?", a: "Log one pleasant thing", b: "Skip it" } },
];
function rng(seed: number) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
export function drivers(rows: DayRow[], seed = 11, boots = 1000): Driver[] {
  const used = rows.filter(r => r.used); if (used.length < 14) return [];
  const out: Driver[] = [];
  for (const f of FACTORS) {
    const yes: number[] = [], no: number[] = []; used.forEach(r => { const g = f.get(r); if (g == null) return; (g ? yes : no).push(r.started ? 1 : 0); });
    if (yes.length < 5 || no.length < 5) continue;
    const pY = yes.reduce((a, b) => a + b, 0) / yes.length, pN = no.reduce((a, b) => a + b, 0) / no.length, diff = pY - pN;
    const r = rng(seed + f.id.length * 31 + yes.length * 7 + no.length); const ds: number[] = [];
    for (let b = 0; b < boots; b++) { let sy = 0, sn = 0; for (let i = 0; i < yes.length; i++) sy += yes[Math.floor(r() * yes.length)]; for (let i = 0; i < no.length; i++) sn += no[Math.floor(r() * no.length)]; ds.push(sy / yes.length - sn / no.length); }
    ds.sort((a, b) => a - b); const lo = ds[Math.floor(boots * 0.005)], hi = ds[Math.ceil(boots * 0.995) - 1]; // 99% interval: several habits are compared, so a stricter bar
    const strength = lo > 0 || hi < 0 ? "probable" : Math.abs(diff) >= 0.25 ? "hint" : null; if (!strength) continue;
    out.push({ id: f.id, label: f.label, nYes: yes.length, nNo: no.length, rateYes: pY, rateNo: pN, diff, lo, hi, strength, trial: f.trial });
  }
  return out.sort((a, b) => (a.strength === b.strength ? Math.abs(b.diff) - Math.abs(a.diff) : a.strength === "probable" ? -1 : 1));
}
export const driverLine = (d: Driver) => d.diff >= 0
  ? `On days you ${d.label}, you started on ${Math.round(d.rateYes * 100)}% of active days, against ${Math.round(d.rateNo * 100)}% otherwise.`
  : `On days you ${d.label}, you started on ${Math.round(d.rateYes * 100)}% of active days, against ${Math.round(d.rateNo * 100)}% otherwise (fewer).`;
/** Turn a finding into a 14-day experiment on yourself. */
export function trialFromDriver(d: Driver, now = Date.now()): Trial { const t = d.trial!; return { id: crypto.randomUUID(), ts: now, question: t.question, a: t.a, b: t.b, kind: "yesno", length: 14, days: planDays(now, 14) }; }

// ---- 3. Trends (Mann-Kendall test and Theil-Sen slope) ----
const erfc = (x: number) => { const t = 1 / (1 + 0.5 * Math.abs(x)); const r = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; };
export function mannKendall(y: number[]) {
  const n = y.length; let s = 0; const sl: number[] = []; for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) { s += Math.sign(y[j] - y[i]); sl.push((y[j] - y[i]) / (j - i)); }
  const v = (n * (n - 1) * (2 * n + 5)) / 18; const z = s > 0 ? (s - 1) / Math.sqrt(v) : s < 0 ? (s + 1) / Math.sqrt(v) : 0; const p = erfc(Math.abs(z) / Math.SQRT2);
  sl.sort((a, b) => a - b); const slope = sl.length ? sl[Math.floor(sl.length / 2)] : 0; return { n, p, slope, dir: s > 0 ? 1 : s < 0 ? -1 : 0 };
}
export interface Trend { label: string; good: boolean; text: string; p: number }
export function trends(m: Mind, starts: number[], now = Date.now()): Trend[] {
  const out: Trend[] = []; const add = (label: string, y: number[], higherIsBetter: boolean, unit: string) => {
    if (y.length < 5) return; const k = mannKendall(y.slice(-10)); if (k.p >= 0.1 || k.dir === 0) return; const up = k.dir > 0; const good = up === higherIsBetter;
    out.push({ label, good, p: k.p, text: `${label} has been ${up ? "rising" : "falling"} over your last ${Math.min(10, y.length)} ${unit}${good ? ", which is the direction you want." : ". Worth a gentle look."}` });
  };
  const ser = (id: string) => m.checks.filter(c => c.id === id);
  add("Wellbeing (WHO-5)", ser("who5").map(c => c.score * 4), true, "checks"); add("Tiredness", ser("cbi").map(c => c.score), false, "checks"); add("Stress (K6)", ser("k6").map(c => c.score), false, "checks");
  add("Low mood (PHQ-9)", ser("phq9").map(c => c.score), false, "checks"); add("Worry (GAD-7)", ser("gad7").map(c => c.score), false, "checks"); add("Task load", m.tlx.map(t => t.raw), false, "task-load checks");
  add("Sleep efficiency", m.sleep.map(s => sleepNight(s).se), true, "nights"); add("Mood taps", m.pulse.map(p => p.m), true, "taps");
  const wk: number[] = []; for (let w = 7; w >= 0; w--) { const a = now - (w + 1) * 7 * DAY, b = now - w * 7 * DAY; wk.push(starts.filter(t => t > a && t <= b).length); } if (wk.filter(x => x > 0).length >= 3) add("Your weekly starts", wk, true, "weeks");
  return out.sort((a, b) => a.p - b.p);
}

// ---- 4. What actually works for you: average relief per tool, shrunk toward a small prior ----
export interface Efficacy { name: string; view: MindView; n: number; mean: number; shrunk: number }
export function toolEfficacy(m: Mind): Efficacy[] {
  const acc = new Map<string, { view: MindView; v: number[] }>(); const put = (name: string, view: MindView, v: number) => { const e = acc.get(name) ?? { view, v: [] }; e.v.push(Math.max(-1, Math.min(1, v))); acc.set(name, e); };
  m.feelings.forEach(f => put(f.route === "reappraise" ? "Looking at it differently" : f.route === "calm-first" ? "Calm first, then think" : "Going gentle", "feel", (f.before - f.after) / 10));
  m.skills.forEach(s => put(`Skill: ${s.skill}`, "skills", (s.helped - 1) / 4 - 0.25));
  m.calm.forEach(c => { if (c.before == null || c.after == null) return; put(c.kind === "kind" ? "Kind reset" : c.kind === "ground" ? "Grounding" : "Slow breathing", c.kind === "kind" ? "kind" : "breathe", (c.kind === "kind" ? c.before - c.after : c.after - c.before) / 4); });
  m.breaks.forEach(b => put(`Break: ${b.kind.toLowerCase()}`, "brk", (b.after - b.before) / 4)); m.loops.forEach(l => put("Breaking a thought loop", "loop", (l.before - l.after) / 10));
  m.anger.forEach(a => put("Anger pause", "anger", (a.before - a.after) / 10)); m.exams.forEach(e => put("Before the exam", "exam", (e.before - e.after) / 10));
  m.thoughts.forEach(t => put(t.way === "unhook" ? "Stepping back from a thought" : "Checking a thought", "thoughts", (t.before - t.after) / 100)); m.urges.forEach(u => put("Riding the urge", "urge", (u.start - u.end) / 10));
  const prior = 0.1, k = 3; return [...acc.entries()].map(([name, e]) => { const sum = e.v.reduce((a, b) => a + b, 0); return { name, view: e.view, n: e.v.length, mean: sum / e.v.length, shrunk: (sum + k * prior) / (e.v.length + k) }; }).sort((a, b) => b.shrunk - a.shrunk);
}

// ---- 5. Are you stretched? A few plain signals, no diagnosis ----
export interface Load { state: "steady" | "stretched" | "low"; signals: string[] }
export function loadState(m: Mind, starts: number[], now = Date.now()): Load {
  const s: string[] = []; const last = <T,>(a: T[], n: number) => a.slice(-n);
  const sl = last(m.sleep, 3); if (sl.length >= 2 && avg(sl.map(x => sleepNight(x).tst / 60)) < 6) s.push("You have slept under 6 hours on average lately.");
  const cbi = last(m.checks.filter(c => c.id === "cbi"), 1)[0]; if (cbi && cbi.score >= 50 && now - cbi.ts < 21 * DAY) s.push("Your last tiredness check was in the worn-down range.");
  const k6 = last(m.checks.filter(c => c.id === "k6"), 1)[0]; if (k6 && k6.score >= 8 && now - k6.ts < 21 * DAY) s.push("Your last stress check was raised.");
  const w5 = last(m.checks.filter(c => c.id === "who5"), 1)[0]; if (w5 && w5.score * 4 < 50 && now - w5.ts < 21 * DAY) s.push("Your last wellbeing check was below 50%.");
  const pl = m.pulse.filter(p => now - p.ts < 3 * DAY); if (pl.length >= 3 && avg(pl.map(p => p.e)) <= 2) s.push("Your energy taps have been low for three days.");
  const tl = m.tlx.filter(t => now - t.ts < 3 * DAY); if (tl.length >= 2 && avg(tl.map(t => t.raw)) >= 65) s.push("Your recent tasks felt heavy.");
  const wk = (w: number) => starts.filter(t => t > now - (w + 1) * 7 * DAY && t <= now - w * 7 * DAY).length; const base = avg([wk(1), wk(2), wk(3)]); if (base >= 4 && wk(0) < base * 0.4 && new Date(now).getDay() >= 4) s.push("You are starting much less than your recent weeks.");
  return { state: s.length >= 3 ? "low" : s.length >= 2 ? "stretched" : "steady", signals: s };
}

// ---- 6. One headline for Today ----
export function topInsight(m: Mind, starts: number[], now = Date.now()): { text: string; view: MindView } | null {
  const load = loadState(m, starts, now); if (load.state !== "steady") return { text: load.state === "low" ? "You have been running low. Want a lighter day?" : "You may be stretched. Want to make today lighter?", view: "insights" };
  const d = drivers(dayTable(m, starts, now)); const p = d.find(x => x.strength === "probable"); if (p) return { text: driverLine(p), view: "insights" };
  const t = trends(m, starts, now)[0]; if (t) return { text: t.text, view: "insights" };
  const e = toolEfficacy(m).find(x => x.n >= 3 && x.shrunk > 0.15); if (e) return { text: `${e.name} has helped you most so far.`, view: "insights" };
  return null;
}

// ---- 7. Start profile ----
export function profile(m: Mind, starts: number[]) {
  const ip = m.checks.filter(c => c.id === "ipipc").slice(-1)[0]; const style = ip ? (ip.score >= 36 ? "Planner" : ip.score >= 25 ? "Mixed" : "Flexible") : null;
  const t = m.tmt.slice(-5); const lever = t.length >= 2 ? (() => { const s = { Confidence: avg(t.map(x => x.e)), Meaning: avg(t.map(x => x.v)), "A closer payoff": 10 - avg(t.map(x => x.d)), "Taming distraction": 10 - avg(t.map(x => x.i)) }; return Object.entries(s).sort((a, b) => a[1] - b[1])[0][0]; })() : null;
  const em = energyMap(m.pulse).filter(b => b.e != null && b.count >= 2).sort((a, b) => b.e! - a.e!)[0]; const eff = toolEfficacy(m).find(x => x.n >= 2 && x.shrunk > 0.1);
  const hrs = starts.map(ts => new Date(ts).getHours()); const common = hrs.length >= 5 ? (() => { const c = new Map<number, number>(); hrs.forEach(h => c.set(h, (c.get(h) ?? 0) + 1)); return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0]; })() : null;
  return { style, lever, window: em ? em.n.split(" (")[0] : null, tool: eff?.name ?? null, startHour: common, starts: starts.length };
}

// The analysis is cheap but runs on every render of Today and Mind, so keep the last result until the data changes.
let memo: { m: Mind; n: number; h: number; v: ReturnType<typeof topInsight> } | null = null;
export function topInsightCached(m: Mind, starts: number[], now = Date.now()) {
  const h = Math.floor(now / 36e5); if (memo && memo.m === m && memo.n === starts.length && memo.h === h) return memo.v;
  const v = topInsight(m, starts, now); memo = { m, n: starts.length, h, v }; return v;
}

// ---- 8. Your best window for the hardest task ----
export interface Window { label: string; phrase: string; startMin: number; why: string }
const PHRASE: Record<string, string> = { Early: "early in the morning", Morning: "in the morning", Midday: "around midday", Afternoon: "in the afternoon", Evening: "in the evening" };
const BLOCK_START: Record<string, number> = { Early: 6 * 60 + 30, Morning: 9 * 60, Midday: 12 * 60, Afternoon: 15 * 60, Evening: 18 * 60 };
export function bestWindow(m: Mind, starts: number[]): Window | null {
  const em = energyMap(m.pulse).filter(b => b.e != null && b.count >= 2).sort((a, b) => b.e! - a.e!)[0];
  if (em) { const k = em.n.split(" ")[0]; return { label: em.n.split(" (")[0].toLowerCase(), phrase: PHRASE[k] ?? "at your peak", startMin: BLOCK_START[k] ?? 9 * 60, why: `Your energy taps average ${em.e}/5 then (${em.count} taps).` }; }
  const hrs = starts.map(ts => new Date(ts).getHours()); if (hrs.length < 5) return null; const c = new Map<number, number>(); hrs.forEach(h => c.set(h, (c.get(h) ?? 0) + 1)); const [h, n] = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
  return { label: `around ${h % 12 || 12}${h < 12 ? "am" : "pm"}`, phrase: `around ${h % 12 || 12}${h < 12 ? "am" : "pm"}`, startMin: h * 60, why: `You have started ${n} times around then.` };
}

// ---- 9. A tool you already know helps you, offered again ----
const LAST: Record<string, (m: Mind) => number[]> = { feel: m => m.feelings.map(x => x.ts), skills: m => m.skills.map(x => x.ts), kind: m => m.calm.filter(c => c.kind === "kind").map(x => x.ts), breathe: m => m.calm.filter(c => c.kind !== "kind").map(x => x.ts), brk: m => m.breaks.map(x => x.ts), loop: m => m.loops.map(x => x.ts), anger: m => m.anger.map(x => x.ts), exam: m => m.exams.map(x => x.ts), thoughts: m => m.thoughts.map(x => x.ts), urge: m => m.urges.map(x => x.ts) };
export function adaptivePick(m: Mind, now = Date.now()): Pick | null {
  const e = toolEfficacy(m).find(x => x.n >= 3 && x.shrunk > 0.15 && x.view in LAST && !["exam", "anger", "urge"].includes(x.view)); if (!e) return null;
  const last = Math.max(0, ...LAST[e.view](m)); if (now - last < 2 * DAY) return null;
  return { view: e.view, title: `${e.name} works for you`, line: `It has eased you ${Math.round(e.mean * 100)}% on average over ${e.n} tries. Want to use it today?`, cta: "Use it", why: "Your own before-and-after ratings" };
}

// ---- 10. The weekly Mind letter ----
export interface Letter { headline: string; paras: string[]; driver: Driver | null; next: string }
export function weeklyLetter(m: Mind, starts: number[], now = Date.now()): Letter {
  const inWk = (w: number) => starts.filter(t => t > now - (w + 1) * 7 * DAY && t <= now - w * 7 * DAY); const cur = inWk(0), prev = inWk(1);
  const days = new Map<string, number>(); cur.forEach(t => days.set(dkL(t), (days.get(dkL(t)) ?? 0) + 1)); const best = [...days.entries()].sort((a, b) => b[1] - a[1])[0];
  const paras: string[] = []; const dow = (k: string) => new Date(k + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" });
  paras.push(cur.length === 0 ? "This was a quiet week for starts. That is information, not a verdict. Quiet weeks happen, and the next small start is all it takes." : cur.length >= prev.length ? `You started ${cur.length} time${cur.length > 1 ? "s" : ""} this week${prev.length ? `, up from ${prev.length}` : ""}.${best ? ` Your strongest day was ${dow(best[0])}.` : ""}` : `You started ${cur.length} time${cur.length > 1 ? "s" : ""} this week, a little fewer than ${prev.length} last week. Rest and busy weeks both count.`);
  const load = loadState(m, starts, now); if (load.state !== "steady") paras.push(`Your data suggests you have been ${load.state === "low" ? "running low" : "a bit stretched"}: ${load.signals.slice(0, 2).join(" ").toLowerCase()} Next week, protect the basics before adding more.`);
  const eff = toolEfficacy(m).find(x => x.n >= 2 && x.shrunk > 0.1); if (eff) paras.push(`What helped you most: ${eff.name.toLowerCase()} (about ${Math.round(eff.mean * 100)}% relief, ${eff.n} tries).`);
  const rows = dayTable(m, starts, now); const drv = drivers(rows)[0] ?? null; if (drv) paras.push(`${driverLine(drv)} ${drv.strength === "probable" ? "That looks real in your data." : "That is a hint, not a conclusion."} It is a link, not proof of cause.`);
  const tr = trends(m, starts, now)[0]; if (tr) paras.push(tr.text);
  const hits = m.woop.filter(w => w.hit != null && now - w.ts < 14 * DAY); if (hits.length >= 2) paras.push(`Your if-then plans worked ${hits.filter(h => h.hit).length} of ${hits.length} times lately.`);
  const wins = m.ledger.filter(l => now - l.ts < 7 * DAY).length; if (wins) paras.push(`You added ${wins} proof${wins > 1 ? "s" : ""} to your ledger. Those are evidence you can begin.`);
  const win = bestWindow(m, starts); const next = drv ? `Try the experiment: ${drv.trial!.question}` : win ? `Put your hardest task ${win.phrase}.` : load.state !== "steady" ? "One gentle thing a day, and two-minute starts only." : "Pick one tiny anchor and keep it small.";
  return { headline: cur.length ? `Your week: ${cur.length} start${cur.length > 1 ? "s" : ""}` : "Your week, gently", paras, driver: drv, next };
}
