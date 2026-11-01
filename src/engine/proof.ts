// Proof you can start: your own record, so "I can't" meets "you have, many times".
import type { Log } from "@/engine/pattern";
import { dayKeyOf } from "@/engine/pattern";
import type { CoachEvent } from "@/engine/coach";
export interface Proof { starts: number; days: number; hardDays: number; didIt: number; gotGoing: number; first: number | null; recent: { ts: number; task: string; o?: string }[] }
export function proof(log: Log, coach: CoachEvent[]): Proof {
  const S = log.starts; const days = new Set(S.map(s => dayKeyOf(s.ts)));
  const hard = new Set<string>(); for (const c of log.checks) if (c.dread === 3 || c.energy === 1 || c.sleep === 1) hard.add(c.day); for (const c of coach) hard.add(dayKeyOf(c.ts));
  return { starts: S.length, days: days.size, hardDays: [...days].filter(d => hard.has(d)).length, didIt: S.filter(s => s.o === "did").length, gotGoing: S.filter(s => s.o === "got").length, first: S[0]?.ts ?? null, recent: S.slice(-5).reverse().map(s => ({ ts: s.ts, task: s.task ?? "A start", o: s.o })) };
}
