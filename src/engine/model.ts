// Lagomo engine v2. Implements the LTA/CDA Drive equation (Lagun 2025) plus
// uncertainty, failure-mode diagnosis, sensitivity ranking and deadline context.
export type VarKey = "Primode" | "CAP" | "Flexion" | "Anchory" | "Grain" | "Slip";
export const VAR_KEYS: VarKey[] = ["Primode", "CAP", "Flexion", "Anchory", "Grain", "Slip"];
export type Inputs = Record<VarKey, number>; // each 0..1
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Published LTA cut-offs. Under uniform random inputs only ~5% of states exceed 1.2, so they are very strict. */
export const PAPER_THRESHOLDS = { ready: 1.2, borderline: 0.8 };
/** App defaults: roughly the top quarter / top 60% of the Drive distribution under uniform inputs (p75 = 0.90, p40 = 0.55). Replaced by personal calibration when available. */
export const DEFAULT_THRESHOLDS = { ready: 0.9, borderline: 0.6 };

export interface Core {
  latentLoad: number; grain: number; anchory: number; cap: number; drive: number;
}

/** LTA v1 equation, unchanged: Drive = Primode * (CAP_adj*Flexion)/(Anchory_mod+Grain_adj) + Slip */
export function coreDrive(i: Inputs): Core {
  const ll = (i.Grain + (1 - i.Anchory) + i.Slip) / 3;
  const grain = i.Grain + 0.6 * ll;
  const anchory = i.Anchory * Math.exp(-0.4 * ll);
  const cap = i.CAP + 0.3 * ll;
  const denom = Math.max(anchory + grain, 1e-6);
  return { latentLoad: ll, grain, anchory, cap, drive: (i.Primode * cap * i.Flexion) / denom + i.Slip };
}

// ---------- seeded RNG so results are reproducible for the same answers ----------
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function gauss(r: () => number) { return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r()); }
const seedOf = (i: Inputs) => Math.floor(VAR_KEYS.reduce((s, k, n) => s + i[k] * 1000 * (n + 1), 0));

export interface Uncertainty { median: number; lo: number; hi: number; pReady: number; pNotReady: number; sd: number }

/** Propagates self-report error (sd per item) through the equation by Monte Carlo. */
export function uncertainty(i: Inputs, sd = 0.1, n = 600, readyThr = DEFAULT_THRESHOLDS.ready, lowThr = DEFAULT_THRESHOLDS.borderline): Uncertainty {
  const r = mulberry32(seedOf(i));
  const d: number[] = [];
  for (let s = 0; s < n; s++) {
    const p = {} as Inputs;
    VAR_KEYS.forEach(k => (p[k] = clamp(i[k] + sd * gauss(r))));
    d.push(coreDrive(p).drive);
  }
  d.sort((a, b) => a - b);
  const q = (f: number) => d[Math.min(n - 1, Math.floor(f * n))];
  const mean = d.reduce((a, b) => a + b, 0) / n;
  return {
    median: q(0.5), lo: q(0.1), hi: q(0.9),
    pReady: d.filter(x => x > readyThr).length / n,
    pNotReady: d.filter(x => x <= lowThr).length / n,
    sd: Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / n),
  };
}

// ---------- failure modes (CTT) ----------
export interface FailureMode { id: string; name: string; why: string; severity: number }
export function diagnose(i: Inputs, c: Core): FailureMode[] {
  const out: FailureMode[] = [];
  if (i.Primode < 0.3 && i.CAP >= 0.6)
    out.push({ id: "inertia", name: "Stuck at the start", why: "You care a lot, but starting still feels blocked. Pressure will not fix this.", severity: i.CAP - i.Primode });
  if (i.Primode >= 0.4 && i.Flexion < 0.45)
    out.push({ id: "falsestart", name: "Might stall halfway", why: "You can begin, but the task does not match how you feel right now, so you may stall.", severity: 0.9 - i.Flexion });
  if (c.grain > c.anchory * 1.6 && c.grain > 0.7)
    out.push({ id: "friction", name: "The task feels too heavy", why: "The task feels heavier than your focus can carry right now.", severity: (c.grain - c.anchory) / 2 });
  if (i.Slip >= 0.6 && i.Primode >= 0.4)
    out.push({ id: "slip", name: "Scattered energy", why: "You have energy, but it may jump around. Expect some drifting and restarts.", severity: i.Slip });
  if (c.latentLoad >= 0.6)
    out.push({ id: "latent", name: "A lot on your mind", why: "Things left undone in the back of your mind are making this harder.", severity: c.latentLoad });
  return out.sort((a, b) => b.severity - a.severity);
}

// ---------- sensitivity: which lever moves Drive most for a realistic step ----------
export interface Lever { key: VarKey; direction: "raise" | "lower"; step: number; gain: number; newDrive: number }
const LOWER_IS_BETTER: VarKey[] = ["Grain"]; // Slip adds to drive in the equation but is flagged as instability; handled separately
export function levers(i: Inputs, step = 0.25): Lever[] {
  const base = coreDrive(i).drive;
  return (["Primode", "CAP", "Flexion", "Anchory", "Grain"] as VarKey[]).map(k => {
    const dir = LOWER_IS_BETTER.includes(k) ? "lower" : "raise";
    const alt = { ...i, [k]: clamp(i[k] + (dir === "raise" ? step : -step)) };
    const nd = coreDrive(alt).drive;
    return { key: k, direction: dir, step, gain: nd - base, newDrive: nd } as Lever;
  }).sort((a, b) => b.gain - a.gain);
}
/** Slip is reported as stability risk, not as a lever: lowering it lowers the additive term. */
export function stability(i: Inputs) { return clamp(1 - i.Slip * 0.7 - (1 - i.Anchory) * 0.3); }

// ---------- deadline context (exploratory assumption, not validated) ----------
export function deadlinePressure(hoursLeft: number | null): number {
  if (hoursLeft == null) return 0;
  if (hoursLeft <= 0) return 1;
  return Math.exp(-hoursLeft / 36); // 0 far away, ~0.76 at 10h, ~1 at deadline
}
/** Pressure lifts CAP only; it cannot open a closed Primode gate (Drive = 0 if Primode = 0). */
export function withDeadline(i: Inputs, hoursLeft: number | null): Inputs {
  const p = deadlinePressure(hoursLeft);
  return { ...i, CAP: clamp(i.CAP + 0.35 * p * (1 - i.CAP)) };
}

export type Verdict = "ready" | "borderline" | "not-ready";
export function verdictOf(drive: number, t = DEFAULT_THRESHOLDS): Verdict {
  return drive > t.ready ? "ready" : drive > t.borderline ? "borderline" : "not-ready";
}

/** Drive trajectory over a work block: Anchory decays with Slip, Grain accumulates (fatigue). Illustrative simulation. */
export function simulateBlock(i: Inputs, minutes = 90, stepMin = 5) {
  const pts: { t: number; drive: number }[] = [];
  const cur = { ...i };
  for (let t = 0; t <= minutes; t += stepMin) {
    pts.push({ t, drive: coreDrive(cur).drive });
    cur.Anchory = clamp(cur.Anchory - 0.004 * stepMin * (0.5 + cur.Slip));
    cur.Grain = clamp(cur.Grain + 0.002 * stepMin);
    cur.Flexion = clamp(cur.Flexion + 0.0015 * stepMin * cur.Primode); // fit improves once engaged
  }
  return pts;
}
