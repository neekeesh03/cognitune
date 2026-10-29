import { VAR_KEYS, coreDrive, DEFAULT_THRESHOLDS, clamp } from "./model";
import type { Inputs } from "./model";

export interface CheckIn {
  id: string; ts: number; task: string; context: string; hoursToDeadline: number | null;
  inputs: Inputs; drive: number; effectiveDrive: number; pReady: number;
  /** follow-up: did you start within 15 minutes? */
  started?: boolean; minutesToStart?: number;
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** History features inspired by "The Weight of the Past": level, variability, drift over recent check-ins. */
export function historyFeatures(h: CheckIn[], n = 5) {
  const r = h.slice(-n).map(x => x.drive);
  if (r.length < 2) return null;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variability = Math.sqrt(r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length);
  const drift = (r[r.length - 1] - r[0]) / (r.length - 1);
  return { level: mean, variability, drift, unstable: mean < DEFAULT_THRESHOLDS.borderline + 0.2 && variability > 0.25 };
}

/** Personal calibration: logistic fit P(start | Drive) on labelled check-ins, Brier compared to fixed thresholds. */
export function calibrate(h: CheckIn[]) {
  const L = h.filter(x => x.started !== undefined);
  const pos = L.filter(x => x.started).length;
  if (L.length < 8 || pos === 0 || pos === L.length) return { ready: false as const, n: L.length, needed: Math.max(0, 8 - L.length), mixed: pos > 0 && pos < L.length || L.length < 8 };
  let a = 0, b = 0; const lr = 0.3;
  for (let it = 0; it < 4000; it++) {
    let ga = 0, gb = 0;
    L.forEach(x => { const p = sigmoid(a + b * x.drive); const y = x.started ? 1 : 0; ga += p - y; gb += (p - y) * x.drive; });
    a -= (lr * ga) / L.length; b -= (lr * gb) / L.length + 0.001 * b; // tiny ridge
  }
  const brier = (f: (x: CheckIn) => number) => L.reduce((s, x) => s + (f(x) - (x.started ? 1 : 0)) ** 2, 0) / L.length;
  const fixed = brier(x => (x.drive > DEFAULT_THRESHOLDS.ready ? 0.85 : x.drive > DEFAULT_THRESHOLDS.borderline ? 0.5 : 0.15));
  const personal = brier(x => sigmoid(a + b * x.drive));
  const base = pos / L.length; const baseline = brier(() => base);
  const threshold = b > 0 ? -a / b : null; // Drive where P(start)=0.5
  return { ready: true as const, n: L.length, a, b, threshold, brier: { personal, fixed, baseline }, predict: (d: number) => sigmoid(a + b * d) };
}

/** Which variable most differs between start and no-start check-ins (descriptive only). */
export function whatBlocksYou(h: CheckIn[]) {
  const s = h.filter(x => x.started === true), f = h.filter(x => x.started === false);
  if (s.length < 3 || f.length < 3) return null;
  const m = (arr: CheckIn[], k: typeof VAR_KEYS[number]) => arr.reduce((t, x) => t + x.inputs[k], 0) / arr.length;
  return VAR_KEYS.map(k => ({ key: k, diff: m(s, k) - m(f, k) })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

/** Time-of-day readiness profile: mean Drive per 3-hour bin. */
export function timeOfDay(h: CheckIn[]) {
  const bins = Array.from({ length: 8 }, (_, i) => ({ label: `${String(i * 3).padStart(2, "0")}h`, sum: 0, n: 0 }));
  h.forEach(x => { const b = bins[Math.floor(new Date(x.ts).getHours() / 3)]; b.sum += x.drive; b.n++; });
  return bins.map(b => ({ label: b.label, drive: b.n ? +(b.sum / b.n).toFixed(2) : null, n: b.n }));
}

/** Test-retest agreement: two check-ins within 10 minutes on the same task; reports mean absolute difference of Drive. */
export function retestAgreement(h: CheckIn[]) {
  const diffs: number[] = [];
  for (let i = 1; i < h.length; i++) if (h[i].task === h[i - 1].task && h[i].ts - h[i - 1].ts < 10 * 60e3) diffs.push(Math.abs(h[i].drive - h[i - 1].drive));
  return diffs.length ? { pairs: diffs.length, mad: diffs.reduce((a, b) => a + b, 0) / diffs.length } : null;
}

export function toCSV(h: CheckIn[]) {
  const head = ["timestamp", "task", "context", "hoursToDeadline", ...VAR_KEYS, "drive", "effectiveDrive", "pReady", "started", "minutesToStart"];
  const rows = h.map(x => [new Date(x.ts).toISOString(), JSON.stringify(x.task), JSON.stringify(x.context), x.hoursToDeadline ?? "", ...VAR_KEYS.map(k => x.inputs[k]), x.drive.toFixed(4), x.effectiveDrive.toFixed(4), x.pReady.toFixed(3), x.started ?? "", x.minutesToStart ?? ""].join(","));
  return [head.join(","), ...rows].join("\n");
}
export const _c = { clamp, coreDrive };
