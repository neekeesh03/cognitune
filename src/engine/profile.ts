import { VAR_KEYS, VarKey, Inputs, clamp } from "./model";
import type { TextSignals } from "./text";
import { themes } from "./text";
import type { CheckIn } from "./analytics";

export interface Entry { id: string; ts: number; kind: "journal" | "chat"; role: "user" | "friend"; text: string; prompt?: string; mood?: number; signals?: TextSignals; meta?: { flow: string; step: string; user: string; prev: string } }
export interface Profile {
  levels: Partial<Record<VarKey, { value: number; n: number; conf: number }>>;
  observed: Record<VarKey, number>;
  blendWeight: number; // max 0.3, grows with evidence
  sentiment7: number | null;
  openLoops: { text: string; ts: number }[];
  wins: { text: string; ts: number }[];
  themes: string[];
  journalDays: number; entries: number; words: number;
  divergence: { key: VarKey; diff: number }[]; // text level minus self-report mean (needs >=3 each)
  peakHour: number | null;
}
const HALF_LIFE_DAYS = 14;
export const MAX_BLEND = 0.3;

export function buildProfile(entries: Entry[], history: CheckIn[], resolved: string[] = [], now = Date.now()): Profile {
  const user = entries.filter(e => e.role === "user" && e.signals);
  const levels: Profile["levels"] = {}; const observed = {} as Record<VarKey, number>;
  VAR_KEYS.forEach(k => {
    let sw = 0, sv = 0, n = 0;
    user.forEach(e => { const v = e.signals!.levels[k]; if (v == null) return; const w = Math.pow(0.5, (now - e.ts) / 864e5 / HALF_LIFE_DAYS); sw += w; sv += w * v; n++; });
    observed[k] = n;
    if (n) levels[k] = { value: sv / sw, n, conf: 1 - Math.exp(-n / 6) };
  });
  const confs = Object.values(levels).map(l => l!.conf);
  const blendWeight = confs.length ? MAX_BLEND * (confs.reduce((a, b) => a + b, 0) / VAR_KEYS.length) : 0;
  const recent = user.slice(-7);
  const loops = user.flatMap(e => e.signals!.openLoops.map(text => ({ text, ts: e.ts }))).filter(l => now - l.ts < 7 * 864e5 && !resolved.includes(l.text));
  const wins = user.flatMap(e => e.signals!.wins.map(text => ({ text, ts: e.ts }))).slice(-5).reverse();
  const divergence = VAR_KEYS.filter(k => levels[k] && levels[k]!.n >= 3 && history.length >= 3).map(k => ({ key: k, diff: levels[k]!.value - history.reduce((a, h) => a + h.inputs[k], 0) / history.length }));
  const hours: Record<number, number[]> = {};
  user.forEach(e => { const s = e.signals!.sentiment; (hours[new Date(e.ts).getHours()] ||= []).push(s); });
  const peak = Object.entries(hours).filter(([, v]) => v.length >= 2).sort((a, b) => b[1].reduce((x, y) => x + y, 0) / b[1].length - a[1].reduce((x, y) => x + y, 0) / a[1].length)[0];
  return {
    levels, observed, blendWeight,
    sentiment7: recent.length >= 2 ? recent.reduce((a, e) => a + e.signals!.sentiment, 0) / recent.length : null,
    openLoops: loops.slice(-5).reverse(), wins, themes: themes(user.filter(e => now - e.ts < 30 * 864e5).map(e => e.text)),
    journalDays: new Set(user.map(e => new Date(e.ts).toDateString())).size, entries: user.length, words: user.reduce((a, e) => a + e.signals!.words, 0),
    divergence: divergence.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)), peakHour: peak ? Number(peak[0]) : null,
  };
}

/** Shrinks each self-report toward what the person's own writing implies, capped at MAX_BLEND per force. */
export function blendInputs(self: Inputs, p: Profile): { blended: Inputs; shifts: Partial<Record<VarKey, number>> } {
  const blended = { ...self } as Inputs; const shifts: Partial<Record<VarKey, number>> = {};
  VAR_KEYS.forEach(k => { const l = p.levels[k]; if (!l) return; const w = MAX_BLEND * l.conf; blended[k] = clamp(self[k] * (1 - w) + l.value * w); shifts[k] = blended[k] - self[k]; });
  return { blended, shifts };
}
