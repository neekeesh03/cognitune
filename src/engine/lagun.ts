// Measured Lagun's Law. Fills the six variables of the Drive equation from behaviour and body signals instead of sliders.
// Every signal is compared with the person's OWN earlier readings, so a score means "better or worse than your usual".
// The mapping below is the pre-specified protocol (version PROTOCOL). Do not change it silently: bump the version.
import { clamp, coreDrive, uncertainty, VAR_KEYS, type Inputs, type VarKey } from "./model";
import { paperDrive } from "./pattern";

export const PROTOCOL = "lagun-measured-v1";
export type GameKey = "focus" | "hold" | "recall" | "heart" | "heartp" | "heartf" | "hand" | "cursor" | "eyes";
export interface Run { ts: number; a: number; b: number; c: number }
export interface Data {
  now: number;
  starts: { ts: number; created?: number }[];
  games: Partial<Record<GameKey, Run[]>>;
  pulse: { ts: number; e: number; m: number }[];
  load: "steady" | "stretched" | "low" | null;
  deadline: number | null; // 0..1 pressure, null when nothing is due
  pb: number | null; // chance of starting in this hour window from the personal start pattern
}
export interface Part { v: VarKey; label: string; value: number }
export interface Measured { inputs: Inputs; parts: Part[]; coverage: number; signals: number; raw: Record<string, number | null> }

const H = 36e5, D = 864e5;
const sig = (x: number) => 1 / (1 + Math.exp(-x));
const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
/** 0.5 = your usual, towards 1 = higher than your usual. Needs 3+ earlier readings. */
export function rel(cur: number, prior: number[]): number | null {
  if (prior.length < 3) return null;
  const m = med(prior); const mad = med(prior.map(x => Math.abs(x - m))) * 1.4826; const scale = Math.max(mad, Math.abs(m) * 0.05, 1e-6);
  return sig(0.8 * clamp((cur - m) / scale, -4, 4, ));
}
function clampN(x: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, x)); }
/** The most recent run within `hrs` hours, and the runs before it. */
function recent(runs: Run[] | undefined, now: number, hrs: number) {
  const r = (runs ?? []).filter(x => x.ts <= now); const last = r[r.length - 1]; if (!last || now - last.ts > hrs * H) return null; return { last, prior: r.slice(0, -1).slice(-20) };
}

export function measure(d: Data): Measured {
  const parts: Part[] = []; const raw: Record<string, number | null> = {}; const add = (v: VarKey, label: string, value: number | null) => { if (value != null && isFinite(value)) parts.push({ v, label, value: clampN(value, 0, 1) }); };
  const now = d.now;
  // Primode: could you begin right now? alertness and how fast you usually get going
  const f = recent(d.games.focus, now, 36); raw.reaction_ms = f?.last.a ?? null; if (f) add("Primode", "Reaction speed", (() => { const r = rel(f.last.a, f.prior.map(x => x.a)); return r == null ? null : 1 - r; })());
  const lat = (a: { ts: number; created?: number }[]) => a.filter(s => s.created && s.ts > s.created && s.ts - s.created < 3 * D).map(s => (s.ts - s.created!) / 6e4);
  const st = d.starts.filter(s => s.ts <= now); const lr = lat(st.filter(s => now - s.ts < 14 * D).slice(-5)), lp = lat(st.filter(s => now - s.ts >= 14 * D || false).concat(st.slice(0, Math.max(0, st.length - 5))).slice(-20));
  raw.start_wait_min = lr.length >= 2 ? Math.round(med(lr)) : null; if (lr.length >= 2) { const r = rel(med(lr), lp); if (r != null) add("Primode", "Time before you begin", 1 - r); }
  // CAP: how much it matters and how activated you are
  add("CAP", "Deadline pressure", d.deadline); raw.deadline = d.deadline;
  const pl = d.pulse.filter(p => p.ts <= now && now - p.ts < 6 * H).slice(-1)[0]; raw.energy = pl?.e ?? null; raw.mood = pl?.m ?? null; if (pl) add("CAP", "Energy right now", (pl.e - 1) / 4);
  const hrRun = (() => { const a = recent(d.games.heart, now, 30), b = recent(d.games.heartf, now, 30); return a && b ? (a.last.ts > b.last.ts ? { r: a, k: "heart" as const } : { r: b, k: "heartf" as const }) : a ? { r: a, k: "heart" as const } : b ? { r: b, k: "heartf" as const } : null; })();
  raw.heart_rate = hrRun?.r.last.a ?? null; raw.hrv_ms = hrRun?.r.last.b ?? null;
  if (hrRun) { const r = rel(hrRun.r.last.a, hrRun.r.prior.map(x => x.a)); if (r != null) add("CAP", "Heart rate vs usual", r); const h = rel(hrRun.r.last.b, hrRun.r.prior.map(x => x.b)); if (h != null) add("Grain", "Heart variability (low means strained)", 1 - h); }
  // Flexion: is this the right moment for you
  raw.start_hour_rate = d.pb; // kept as a covariate only: the Drive must not contain the usual-hour chance, or it would look predictive for the wrong reason
  const hr = new Date(now).getHours(); const blk = (h: number) => (h >= 18 ? 4 : h >= 15 ? 3 : h >= 12 ? 2 : h >= 9 ? 1 : 0);
  const cur = d.pulse.filter(p => p.ts <= now && blk(new Date(p.ts).getHours()) === blk(hr)); const oth = d.pulse.filter(p => p.ts <= now && blk(new Date(p.ts).getHours()) !== blk(hr));
  if (cur.length >= 3 && oth.length >= 3) add("Flexion", "Energy at this time of day", (() => { const r = rel(cur.reduce((s, p) => s + p.e, 0) / cur.length, oth.map(p => p.e)); return r; })());
  // Anchory: can you stay on one thing
  const rc = recent(d.games.recall, now, 36); raw.recall_span = rc?.last.a ?? null; if (rc) { const r = rel(rc.last.a, rc.prior.map(x => x.a)); if (r != null) add("Anchory", "Memory span", r); }
  const hb = recent(d.games.hold, now, 36); raw.holdback_errors_pct = hb?.last.a ?? null; raw.holdback_missed = hb?.last.c ?? null; if (hb) { const r = rel(hb.last.a, hb.prior.map(x => x.a)); if (r != null) add("Anchory", "Holding back", 1 - r); }
  const ey = recent(d.games.eyes, now, 36); raw.eyes_closed_pct = ey?.last.b ?? null; raw.blinks_per_min = ey?.last.a ?? null; if (ey) { const r = rel(ey.last.b, ey.prior.map(x => x.b)); if (r != null) add("Anchory", "Eyes open", 1 - r); }
  // Grain: how heavy or sticky it feels
  const tr = (() => { const a = recent(d.games.hand, now, 36), b = recent(d.games.cursor, now, 36); const x = a && b ? (a.last.ts > b.last.ts ? a : b) : a ?? b; return x; })(); raw.hand_shake = tr?.last.a ?? null;
  if (tr) { const r = rel(tr.last.a, tr.prior.map(x => x.a)); if (r != null) add("Grain", "Hand shake", r); }
  if (pl) add("Grain", "Mood right now (low mood adds friction)", 1 - (pl.m - 1) / 4);
  if (d.load) add("Grain", "Stretched or not", d.load === "steady" ? 0.2 : d.load === "stretched" ? 0.6 : 0.85); raw.load = d.load === "steady" ? 0 : d.load === "stretched" ? 1 : d.load === "low" ? 2 : null;
  if (lr.length >= 2) { const r = rel(med(lr), lp); if (r != null) add("Grain", "Starting feels slow", r); }
  // Slip: how much your state bounces around
  if (f) add("Slip", "Slow taps in reaction game", clampN(f.last.b / 6, 0, 1)); raw.lapses = f?.last.b ?? null;
  if (hb) add("Slip", "Missed greens", clampN(hb.last.c / 8, 0, 1));
  const mp = d.pulse.filter(p => p.ts <= now && now - p.ts < 7 * D); if (mp.length >= 4) { const m = mp.reduce((s, p) => s + p.m, 0) / mp.length; const sd = Math.sqrt(mp.reduce((s, p) => s + (p.m - m) ** 2, 0) / mp.length); raw.mood_sd_7d = Math.round(sd * 100) / 100; add("Slip", "Mood swings this week", clampN(sd / 1.2, 0, 1)); }
  const hs = st.filter(s => now - s.ts < 14 * D).map(s => new Date(s.ts).getHours() + new Date(s.ts).getMinutes() / 60); if (hs.length >= 4) { const cx = hs.reduce((s, h) => s + Math.cos((2 * Math.PI * h) / 24), 0) / hs.length, cy = hs.reduce((s, h) => s + Math.sin((2 * Math.PI * h) / 24), 0) / hs.length; const R = Math.hypot(cx, cy); raw.start_hour_spread = Math.round((1 - R) * 100) / 100; add("Slip", "Irregular start times", clampN((1 - R) * 1.6, 0, 1)); }
  const inputs = {} as Inputs; let covered = 0;
  for (const k of VAR_KEYS) { const ps = parts.filter(p => p.v === k); if (ps.length) covered++; inputs[k] = ps.length ? clampN(ps.reduce((s, p) => s + p.value, 0) / ps.length, 0.05, 0.95) : 0.5; }
  return { inputs, parts, coverage: covered / 6, signals: parts.length, raw };
}

export interface Reading { measured: Measured; drivePaper: number; driveCore: number; band: { lo: number; hi: number; pReady: number } }
export function read(d: Data): Reading {
  const m = measure(d); const u = uncertainty(m.inputs, 0.12, 300);
  return { measured: m, drivePaper: paperDrive(m.inputs), driveCore: coreDrive(m.inputs).drive, band: { lo: u.lo, hi: u.hi, pReady: u.pReady } };
}
/** Chance of starting in the next 3 hours: your usual hour pattern, nudged by the Drive reading (same form as the app's existing experimental check). */
export function lagunProb(pb: number, driveP: number): number { const lg = Math.log(pb / (1 - pb)) + clampN(1.0 * (driveP - 0.7), -1.5, 1.5); return sig(lg); }

// ---------- research records and their analysis ----------
export interface Rec { id: string; t: number; v: number[]; raw: Record<string, number | null>; cov: number; dp: number; dc: number; pb: number; pl: number; y?: 0 | 1; proto: string }
export const WINDOW = 3 * H;
export function settle(recs: Rec[], starts: { ts: number }[], now: number): Rec[] { return recs.map(r => (r.y === undefined && now >= r.t + WINDOW ? { ...r, y: (starts.some(s => s.ts > r.t && s.ts <= r.t + WINDOW) ? 1 : 0) as 0 | 1 } : r)); }
export function auc(score: number[], y: number[]): number | null {
  const pos = score.filter((_, i) => y[i] === 1), neg = score.filter((_, i) => y[i] === 0); if (!pos.length || !neg.length) return null;
  let s = 0; for (const p of pos) for (const n of neg) s += p > n ? 1 : p === n ? 0.5 : 0; return s / (pos.length * neg.length);
}
const brier = (p: number[], y: number[]) => p.reduce((s, x, i) => s + (x - y[i]) ** 2, 0) / Math.max(p.length, 1);
const rank = (a: number[]) => { const idx = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]); const r = new Array(a.length).fill(0); let i = 0; while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const av = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = av; i = j + 1; } return r; };
export function spearman(a: number[], b: number[]): number | null {
  if (a.length < 8) return null; const ra = rank(a), rb = rank(b); const ma = ra.reduce((s, x) => s + x, 0) / ra.length, mb = rb.reduce((s, x) => s + x, 0) / rb.length;
  let n = 0, da = 0, db = 0; for (let i = 0; i < ra.length; i++) { n += (ra[i] - ma) * (rb[i] - mb); da += (ra[i] - ma) ** 2; db += (rb[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : null;
}
export interface Incremental { n: number; beta: number | null; se: number | null; z: number | null; lr: number | null; sig: boolean }
/** Does the Drive add anything beyond the usual-hour chance? Logistic regression y ~ offset(logit usual-hour) + beta * (Drive minus your own median). LR is the likelihood-ratio chi-square (1 df; above 3.84 is p<.05). */
export function incremental(recs: Rec[]): Incremental {
  const r = recs.filter(x => x.y !== undefined && x.cov >= 0.5); if (r.length < 30) return { n: r.length, beta: null, se: null, z: null, lr: null, sig: false };
  const byId = new Map<string, number[]>(); r.forEach(x => byId.set(x.id, [...(byId.get(x.id) ?? []), x.dp])); const mid = new Map([...byId].map(([k, v]) => [k, med(v)]));
  const xs = r.map(x => x.dp - (mid.get(x.id) as number)), off = r.map(x => Math.log(x.pb / (1 - x.pb))), y = r.map(x => x.y as number);
  const ll = (b: number) => xs.reduce((a, x, i) => { const p = sig(off[i] + b * x); return a + (y[i] ? Math.log(p) : Math.log(1 - p)); }, 0);
  let b = 0; for (let it = 0; it < 25; it++) { let g = 0, h = 0; xs.forEach((x, i) => { const p = sig(off[i] + b * x); g += (y[i] - p) * x; h += p * (1 - p) * x * x; }); if (h < 1e-9) break; const step = g / h; b += step; if (Math.abs(step) < 1e-7) break; }
  let h = 0; xs.forEach((x, i) => { const p = sig(off[i] + b * x); h += p * (1 - p) * x * x; }); const se = h > 0 ? 1 / Math.sqrt(h) : null; const lr = 2 * (ll(b) - ll(0));
  return { n: r.length, beta: b, se, z: se ? b / se : null, lr, sig: lr > 3.84 };
}
export interface Analysis { n: number; withOutcome: number; auc: number | null; aucBase: number | null; brierL: number | null; brierB: number | null; brierC: number | null; verdict: "collecting" | "ahead" | "behind" | "tie"; perVar: { v: VarKey; rho: number | null }[]; need: number; inc: Incremental }
/** Enough settled readings are needed before any claim. Compares the Drive-based chance with the plain usual-hour chance, and with a constant rate. */
export function analyse(recs: Rec[]): Analysis {
  const r = recs.filter(x => x.y !== undefined && x.cov >= 0.5); const y = r.map(x => x.y as number);
  const need = 40; const a1 = auc(r.map(x => x.dp), y), a0 = auc(r.map(x => x.pb), y);
  const bL = r.length ? brier(r.map(x => x.pl), y) : null, bB = r.length ? brier(r.map(x => x.pb), y) : null; const rate = y.length ? y.reduce((s, v) => s + v, 0) / y.length : 0; const bC = r.length ? brier(r.map(() => rate), y) : null;
  const ref = bB != null && bC != null ? Math.min(bB, bC) : null; const inc = incremental(recs); const verdict: Analysis["verdict"] = r.length < need || inc.beta == null ? "collecting" : inc.sig && inc.beta > 0 ? "ahead" : inc.sig && inc.beta < 0 ? "behind" : "tie";
  return { n: recs.length, withOutcome: r.length, auc: a1, aucBase: a0, brierL: bL, brierB: bB, brierC: bC, verdict, need, perVar: VAR_KEYS.map((v, i) => ({ v, rho: spearman(r.map(x => x.v[i]), y) })), inc: incremental(recs) };
}
export const toCsv = (recs: Rec[]) => {
  const rawKeys = Array.from(new Set(recs.flatMap(r => Object.keys(r.raw)))).sort(); const head = ["id", "hour_utc", "primode", "cap", "flexion", "anchory", "grain", "slip", "coverage", "drive_paper", "drive_core", "p_usual_hour", "p_lagun", "started_within_3h", "protocol", ...rawKeys.map(k => "raw_" + k)];
  const rows = recs.map(r => [r.id, new Date(r.t).toISOString().slice(0, 13) + ":00Z", ...r.v.map(x => x.toFixed(3)), r.cov.toFixed(2), r.dp.toFixed(3), r.dc.toFixed(3), r.pb.toFixed(3), r.pl.toFixed(3), r.y ?? "", r.proto, ...rawKeys.map(k => r.raw[k] ?? "")].join(","));
  return [head.join(","), ...rows].join("\n");
};
