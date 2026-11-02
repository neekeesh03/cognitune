import { useCallback, useEffect, useState } from "react";
import type { PmEntry } from "@/engine/mind";

// Everything Mind records stays on this device (per account, through lib/scope).
export interface Mind {
  checks: { id: "who5" | "phq9" | "gad7" | "asrs6"; ts: number; score: number; a: number[] }[];
  wheel: { ts: number; v: number[] }[];
  tlx: { ts: number; task: string; v: number[]; raw: number }[];
  woop: { ts: number; wish: string; outcome: string; obstacle: string; plan: string }[];
  thoughts: { ts: number; text: string; before: number; after: number; way: "unhook" | "reframe"; tags: string[]; fair?: string }[];
  pm: PmEntry[];
  wind: { ts: number; items: string[]; worries: { w: string; act: string }[] }[];
  calm: { ts: number; kind: "sigh" | "box" | "ground" | "kind"; sec: number; before?: number; after?: number }[];
  values: string[];
}
const KEY = "lagomo.mind.v1"; const EV = "lagomo:mind";
export const emptyMind = (): Mind => ({ checks: [], wheel: [], tlx: [], woop: [], thoughts: [], pm: [], wind: [], calm: [], values: [] });
export const loadMind = (): Mind => { try { return { ...emptyMind(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return emptyMind(); } };
const cap = <T,>(a: T[], n: number) => a.slice(-n);
export const saveMind = (m: Mind) => {
  localStorage.setItem(KEY, JSON.stringify({ ...m, checks: cap(m.checks, 200), wheel: cap(m.wheel, 120), tlx: cap(m.tlx, 300), woop: cap(m.woop, 120), thoughts: cap(m.thoughts, 200), pm: cap(m.pm, 400), wind: cap(m.wind, 120), calm: cap(m.calm, 300) }));
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
