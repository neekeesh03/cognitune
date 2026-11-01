import { useCallback, useEffect, useState } from "react";
import { emptyLog, dayKeyOf, type Log, type Outcome, type StartEv, type Check, type Exp } from "@/engine/pattern";

const KEY = "lagomo.startlog.v1"; // stays on this device
const EV = "lagomo:slog";
export const loadLog = (): Log => { try { return { ...emptyLog(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return emptyLog(); } };
export const saveLog = (l: Log) => { localStorage.setItem(KEY, JSON.stringify({ ...l, starts: l.starts.slice(-1500), checks: l.checks.slice(-400), exps: l.exps.slice(-400) })); window.dispatchEvent(new Event(EV)); };

/** One real start. Task names are kept on this device only and never sent anywhere. */
export function logStart(e: Omit<StartEv, "id" | "ts"> & { ts?: number }) {
  const l = loadLog(); l.starts.push({ id: crypto.randomUUID(), ts: e.ts ?? Date.now(), together: e.together, dueIn: e.dueIn, task: e.task, created: e.created }); saveLog(l);
}
/** How it went, for the most recent start (within a few hours). */
export function logOutcome(o: Outcome) {
  const l = loadLog(); const s = l.starts[l.starts.length - 1]; if (!s || Date.now() - s.ts > 6 * 36e5) return; s.o = o; saveLog(l);
}
export function saveCheck(c: Omit<Check, "day">) { const l = loadLog(); const day = dayKeyOf(Date.now()); l.checks = [...l.checks.filter(x => x.day !== day), { day, ...c }]; saveLog(l); }
export function saveArm(arm: string) { const l = loadLog(); const day = dayKeyOf(Date.now()); if (l.exps.some(x => x.day === day)) return; l.exps.push({ day, arm } as Exp); saveLog(l); }

export function useStartLog() {
  const [log, setLog] = useState<Log>(loadLog);
  useEffect(() => { const f = () => setLog(loadLog()); window.addEventListener(EV, f); return () => window.removeEventListener(EV, f); }, []);
  const update = useCallback((fn: (l: Log) => Log) => saveLog(fn(loadLog())), []);
  return { log, update };
}
