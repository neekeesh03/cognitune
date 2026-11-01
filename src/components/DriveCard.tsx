import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useStartLog, saveCheck, saveArm } from "@/lib/startlog";
import { ARMS, pickArm, predict, updateSnaps, dayKeyOf } from "@/engine/pattern";
import type { Inputs } from "@/engine/model";
import { dueDays } from "@/engine/plan";
import type { Task } from "@/engine/plan";

const ROWS: { k: "sleep" | "energy" | "dread"; q: string; o: [string, string, string] }[] = [
  { k: "sleep", q: "Sleep", o: ["Poor", "Okay", "Good"] },
  { k: "energy", q: "Energy", o: ["Low", "Okay", "High"] },
  { k: "dread", q: "Feels", o: ["Light", "Some weight", "Heavy"] },
];
const EXAM = /exam|test|quiz|final|midterm|viva|assessment/i;

/** Today's Drive: how ready you are right now compared with your own usual, why, and one thing to try. */
export function DriveCard({ tasks, friendsStarted, hasFriends, sliders, onStart, openPattern }: { tasks: Task[]; friendsStarted: number; hasFriends: boolean; sliders: Inputs | null; onStart: (title: string, step: string) => void; openPattern: () => void }) {
  const { log, update } = useStartLog(); const [pick, setPick] = useState<{ sleep?: number; energy?: number; dread?: number }>({});
  const now = Date.now(); const today = dayKeyOf(now);
  const pred = useMemo(() => predict(log, { now, dueTasks: tasks, friendsStarted, sliders }), [log, tasks, friendsStarted, sliders, Math.floor(now / 6e5)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { update(l => updateSnaps(l, pred, Date.now())); }, [Math.floor(now / 36e5 / 3)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!log.exps.some(e => e.day === today) && log.starts.length >= 1) saveArm(pickArm(log, Date.now(), hasFriends)); }, [log.starts.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = log.checks.find(c => c.day === today); const arm = log.exps.find(e => e.day === today)?.arm;
  const startedToday = log.starts.some(s => dayKeyOf(s.ts) === today);
  const exam = tasks.filter(t => !t.doneAt && t.due && EXAM.test(t.title) && dueDays(t.due) >= 0).sort((a, b) => dueDays(a.due) - dueDays(b.due))[0];
  const level = pred.lift > 0.45 ? "Higher than usual" : pred.lift < -0.45 ? "Lower than usual" : "About your usual";
  const pos = Math.round(100 / (1 + Math.exp(-pred.lift * 1.4)));
  const choose = (k: "sleep" | "energy" | "dread", v: number) => { const n = { ...pick, [k]: v }; setPick(n); if (n.sleep && n.energy && n.dread) saveCheck({ sleep: n.sleep, energy: n.energy, dread: n.dread }); };
  return (
    <div className="space-y-3">
      {exam && (() => { const d = dueDays(exam.due); return (
        <div className="glass flex items-center gap-4 rounded-3xl p-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent/20 text-center"><div className="text-2xl font-semibold leading-none">{d}</div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{d === 1 ? "day" : "days"}</div></div>
          <div className="min-w-0 flex-1"><div className="truncate font-semibold">{exam.title}</div><div className="text-xs text-muted-foreground">{d === 0 ? "It is today. You have got this." : d <= 3 ? "Short and steady beats a big push." : `${d} days is plenty for ${Math.min(d, 7)} small study slices.`}</div></div>
          <button onClick={() => onStart(exam.title, exam.steps.find(s => !s.done)?.text ?? "Open your notes and read the first page.")} className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-sm text-primary-foreground">Study 2 min</button>
        </div>); })()}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today's Drive</div>
            {pred.known < 3 ? <div className="mt-1 text-lg font-semibold">Still learning you</div> : <div className="mt-1 text-lg font-semibold">{level}</div>}
            <div className="text-xs text-muted-foreground">{pred.known < 3 ? `${3 - pred.known} more ${3 - pred.known === 1 ? "start" : "starts"} and I can compare today with your usual.` : startedToday ? "You already started today. Anything more is a bonus." : "Compared with your own usual at this time."}</div></div>
          <span className="shrink-0 rounded-full bg-foreground/[.07] px-2.5 py-1 text-[11px] text-muted-foreground" title="This guess is still being tested on your own starts.">Experimental</span>
        </div>
        {pred.known >= 3 && <div className="mt-3"><div className="relative h-2.5 rounded-full bg-gradient-to-r from-accent/40 via-secondary to-primary/60"><div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow transition-all" style={{ left: `${pos}%` }} /><div className="absolute left-1/2 top-0 h-full w-px bg-foreground/25" /></div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>lower</span><span>your usual</span><span>higher</span></div></div>}
        {pred.known >= 3 && pred.why.length > 0 && <ul className="mt-3 space-y-1 text-sm">{pred.why.map(w => <li key={w} className="flex gap-2"><span className="text-primary">•</span><span>{w}</span></li>)}</ul>}
        {!check && (
          <div className="mt-4 rounded-2xl bg-foreground/[.05] p-3">
            <div className="mb-2 text-sm font-medium">Ten-second check-in</div>
            {ROWS.map(r => (<div key={r.k} className="mb-1.5 flex items-center gap-2"><span className="w-14 shrink-0 text-xs text-muted-foreground">{r.q}</span>
              <div className="flex flex-1 gap-1.5">{r.o.map((l, i) => <button key={l} onClick={() => choose(r.k, i + 1)} className={`flex-1 rounded-full border px-2 py-1 text-xs transition ${pick[r.k] === i + 1 ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{l}</button>)}</div></div>))}
            <p className="mt-1 text-[11px] text-muted-foreground">Stays on your device. It only helps the guess above.</p>
          </div>)}
        {arm && ARMS[arm] && arm !== "none" && !startedToday && (
          <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/10 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-primary">Try this today</div>
            <div className="mt-0.5 font-semibold">{ARMS[arm].title}</div><div className="text-sm text-muted-foreground">{ARMS[arm].text}</div>
          </div>)}
        <button onClick={openPattern} className="mt-4 flex w-full items-center justify-between rounded-2xl px-1 py-1 text-sm text-primary">See your start pattern<ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
