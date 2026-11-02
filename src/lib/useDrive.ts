import { useEffect, useMemo } from "react";
import { useStartLog, saveArm } from "@/lib/startlog";
import { accuracy, dayKeyOf, pickArm, predict, updateSnaps } from "@/engine/pattern";
import type { Inputs } from "@/engine/model";
import { measuredInputs, snapshot as researchSnapshot, shareNow } from "@/engine/researchStore";
import type { Task } from "@/engine/plan";

/** What the coach knows right now: today's read, why, and the idea to try. Also records the checked windows that keep the accuracy honest. */
export function useDrive(tasks: Task[], friendsStarted: number, slidersIn: Inputs | null, hasFriends: boolean) {
  const { log, update } = useStartLog(); const now = Date.now(); const today = dayKeyOf(now);
  // No sliders? Use the six forces measured from games, camera and sensors (needs half of them measured).
  const sliders = useMemo(() => slidersIn ?? measuredInputs(), [slidersIn, Math.floor(now / 6e5), log.starts.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { researchSnapshot(); shareNow().catch(() => { /* offline: try next time */ }); }, [Math.floor(now / 36e5)]); // eslint-disable-line react-hooks/exhaustive-deps
  const pred = useMemo(() => predict(log, { now, dueTasks: tasks, friendsStarted, sliders }), [log, tasks, friendsStarted, sliders, Math.floor(now / 6e5)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { update(l => updateSnaps(l, pred, Date.now())); }, [Math.floor(now / 36e5 / 3)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!log.exps.some(e => e.day === today) && log.starts.length >= 1) saveArm(pickArm(log, Date.now(), hasFriends)); }, [log.starts.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = log.checks.find(c => c.day === today); const arm = log.exps.find(e => e.day === today)?.arm;
  const startedToday = log.starts.some(s => dayKeyOf(s.ts) === today); const wrappedToday = log.starts.some(s => dayKeyOf(s.ts) === today && !!s.o);
  const unsure = accuracy(log).verdict === "behind";
  const level = unsure ? "Still learning what moves your day" : pred.lift > 0.45 ? "Higher than usual" : pred.lift < -0.45 ? "Lower than usual" : "About your usual";
  return { log, pred, check, arm, startedToday, wrappedToday, unsure, level, known: pred.known };
}
export type DriveRead = ReturnType<typeof useDrive>;
