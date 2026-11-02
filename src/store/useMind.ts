import { useCallback, useEffect, useState } from "react";
import type { PmEntry } from "@/engine/mind";

// Everything Mind records stays on this device (per account, through lib/scope).
export interface Mind {
  checks: { id: import("@/engine/mind").InstId; ts: number; score: number; a: number[] }[];
  wheel: { ts: number; v: number[] }[];
  tlx: { ts: number; task: string; v: number[]; raw: number }[];
  woop: { ts: number; wish: string; outcome: string; obstacle: string; plan: string; hit?: boolean }[];
  thoughts: { ts: number; text: string; before: number; after: number; way: "unhook" | "reframe"; tags: string[]; fair?: string }[];
  pm: PmEntry[];
  wind: { ts: number; items: string[]; worries: { w: string; act: string }[] }[];
  calm: { ts: number; kind: "sigh" | "box" | "ground" | "kind"; sec: number; before?: number; after?: number }[];
  values: string[];
  sleep: import("@/engine/mind").SleepNight[];
  compass: { ts: number; r: Record<string, { imp: number; now: number }>; domain: string; action: string }[];
  exps: { ts: number; belief: string; before: number; test: string; outcome?: string; after?: number; learn?: string }[];
  ladders: { id: string; ts: number; title: string; steps: { text: string; d: number; doneAt?: number; before?: number; peak?: number; after?: number }[] }[];
  tmt: { ts: number; task: string; e: number; v: number; d: number; i: number }[];
  bundles: { ts: number; want: string; should: string; used: number }[];
  good: { ts: number; items: { what: string; why: string }[] }[];
  urges: { ts: number; what: string; start: number; peak: number; end: number }[];
  reviews: { ts: number; best: string; hard: string; focus: string; plan: string }[];
  pulse: import("@/engine/mind").Pulse[];
  deck: import("@/engine/mind2").Card[];
  deckLog: { ts: number; n: number; good: number }[];
  guesses: import("@/engine/mind2").Guess[];
  feelings: { ts: number; word: string; body: string; because: string; before: number; after: number; route: string }[];
  worries: { id: string; ts: number; w: string; solvable: boolean; step: string; slot: string; status: "parked" | "acted" | "released" }[];
  loops: { ts: number; loop: string; how: string; next: string; before: number; after: number }[];
  exams: { ts: number; before: number; after: number; blank: number; ready: number }[];
  breaks: { ts: number; kind: string; before: number; after: number }[];
  park: { id: string; ts: number; task: string; line: string; resumed?: number }[];
  trials: import("@/engine/mind2").Trial[];
  worse: { ts: number; tool: string }[];
}
const KEY = "lagomo.mind.v1"; const EV = "lagomo:mind";
export const emptyMind = (): Mind => ({ checks: [], wheel: [], tlx: [], woop: [], thoughts: [], pm: [], wind: [], calm: [], values: [], sleep: [], compass: [], exps: [], ladders: [], tmt: [], bundles: [], good: [], urges: [], reviews: [], pulse: [], deck: [], deckLog: [], guesses: [], feelings: [], worries: [], loops: [], exams: [], breaks: [], park: [], trials: [], worse: [] });
export const loadMind = (): Mind => { try { return { ...emptyMind(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return emptyMind(); } };
const cap = <T,>(a: T[], n: number) => a.slice(-n);
export const saveMind = (m: Mind) => {
  localStorage.setItem(KEY, JSON.stringify({ ...m, checks: cap(m.checks, 200), wheel: cap(m.wheel, 120), tlx: cap(m.tlx, 300), woop: cap(m.woop, 120), thoughts: cap(m.thoughts, 200), pm: cap(m.pm, 400), wind: cap(m.wind, 120), calm: cap(m.calm, 300), sleep: cap(m.sleep, 400), compass: cap(m.compass, 60), exps: cap(m.exps, 100), ladders: cap(m.ladders, 30), tmt: cap(m.tmt, 150), bundles: cap(m.bundles, 60), good: cap(m.good, 200), urges: cap(m.urges, 300), reviews: cap(m.reviews, 80), pulse: cap(m.pulse, 400), deck: m.deck.slice(-1000), deckLog: cap(m.deckLog, 400), guesses: cap(m.guesses, 300), feelings: cap(m.feelings, 300), worries: cap(m.worries, 200), loops: cap(m.loops, 200), exams: cap(m.exams, 60), breaks: cap(m.breaks, 300), park: cap(m.park, 60), trials: cap(m.trials, 30), worse: cap(m.worse, 100) }));
  window.dispatchEvent(new Event(EV));
};
export function useMind() {
  const [mind, setMind] = useState<Mind>(loadMind);
  useEffect(() => { const f = () => setMind(loadMind()); window.addEventListener(EV, f); return () => window.removeEventListener(EV, f); }, []);
  const update = useCallback((fn: (m: Mind) => Mind) => saveMind(fn(loadMind())), []);
  return { mind, update };
}
export const DAY = 864e5;
export const daysAgo = (ts: number) => Math.floor((Date.now() - ts) / DAY);
export const sameDay = (a: number, b = Date.now()) => new Date(a).toDateString() === new Date(b).toDateString();
