import { useEffect, useMemo, useState } from "react";
import { useStartLog } from "@/lib/startlog";
import { THEORIES, WEEK_GOAL, lenses, loadPlan, savePlan, type Plan, type Strength } from "@/engine/psych";

const tagCls = (s: Strength) => s === "Strong" ? "bg-primary/15 text-primary" : s === "Moderate" ? "bg-accent/25 text-foreground" : "bg-foreground/[.08] text-muted-foreground";
const CUES = ["I finish breakfast", "I sit down at my desk", "I get home", "my first break starts", "I open my laptop", "the lesson ends"];
const HOURS = [6, 9, 12, 15, 18, 21];

function PlanEditor({ plan, onSave }: { plan: Plan | null; onSave: (p: Plan | null) => void }) {
  const [open, setOpen] = useState(false); const [cue, setCue] = useState(plan?.cue ?? CUES[1]); const [act, setAct] = useState(plan?.act ?? "work on one thing for two minutes"); const [hour, setHour] = useState(plan?.hour ?? 9);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)} className="text-xs text-primary underline-offset-4 hover:underline">{plan ? "Change plan" : "Make my plan"}</button>
      {open && <div className="mt-2 space-y-2 rounded-2xl bg-secondary/40 p-3 text-sm">
        <div className="text-xs text-muted-foreground">When...</div>
        <div className="flex flex-wrap gap-1.5">{CUES.map(c => <button key={c} onClick={() => setCue(c)} className={`rounded-full border px-2.5 py-1 text-xs ${cue === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{c}</button>)}</div>
        <div className="text-xs text-muted-foreground">Around what time?</div>
        <div className="flex flex-wrap gap-1.5">{HOURS.map(h => <button key={h} onClick={() => setHour(h)} className={`rounded-full border px-2.5 py-1 text-xs ${hour === h ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{String(h).padStart(2, "0")}:00</button>)}</div>
        <div className="text-xs text-muted-foreground">I will...</div>
        <input value={act} maxLength={60} onChange={e => setAct(e.target.value)} aria-label="What you will do" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
        <div className="flex gap-2"><button disabled={!act.trim()} onClick={() => { onSave({ hour, cue, act: act.trim() }); setOpen(false); }} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-40">Save plan</button>
          {plan && <button onClick={() => { onSave(null); setOpen(false); }} className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground">Remove</button>}</div>
      </div>}
    </div>);
}

/** What your own starts say, read through published psychology. Every card names its source and how solid it is. */
export function PsychLens() {
  const { log } = useStartLog(); const [plan, setPlan] = useState<Plan | null>(loadPlan); const now = Date.now();
  useEffect(() => { const f = () => setPlan(loadPlan()); window.addEventListener("lagomo:ifthen", f); return () => window.removeEventListener("lagomo:ifthen", f); }, []);
  const items = useMemo(() => lenses(log, now, plan), [log, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  const wk = new Set(log.starts.filter(s => now - s.ts < 7 * 864e5).map(s => new Date(s.ts).toDateString())).size;
  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-2"><div className="text-sm font-semibold">Your psychology, from your own starts</div><span className="rounded-full bg-foreground/[.08] px-2 py-0.5 text-[10px] text-muted-foreground">On this device only</span></div>
        <p className="mt-1 text-xs text-muted-foreground">Each card links one researched idea to what you actually did. If there isn't enough data, it says so instead of guessing.</p>
        <div className="mt-3 flex items-center gap-1.5" aria-label={`${Math.min(wk, WEEK_GOAL)} of ${WEEK_GOAL} start days this week`}>{Array.from({ length: WEEK_GOAL }).map((_, i) => <div key={i} className={`h-2 flex-1 rounded-full ${i < wk ? "bg-primary" : "bg-foreground/10"}`} />)}</div>
      </div>
      {items.map(f => (
        <div key={f.id} className="glass rounded-3xl p-5">
          <div className="mb-2 flex items-start justify-between gap-2"><div className="text-sm font-semibold">{f.title}</div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${tagCls(f.strength)}`}>{f.strength} evidence</span></div>
          {f.body ? <p className="text-sm">{f.body}</p> : <p className="text-sm text-muted-foreground">{f.need}</p>}
          {f.body && f.tip && <p className="mt-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs text-primary">{f.tip}</p>}
          {f.id === "ii" && <PlanEditor plan={plan} onSave={p => { savePlan(p); setPlan(p); }} />}
          <div className="mt-2 text-[10px] text-muted-foreground">Idea: {f.theory}</div>
        </div>))}
      <details className="glass rounded-3xl p-5 text-sm">
        <summary className="cursor-pointer font-semibold">The science behind Lagomo ({THEORIES.length} ideas)</summary>
        <ul className="mt-3 space-y-4">{THEORIES.map(t => (
          <li key={t.id}><div className="flex items-start justify-between gap-2"><div className="font-medium">{t.name}</div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${tagCls(t.strength)}`}>{t.strength}</span></div>
            <div className="text-xs text-muted-foreground">{t.who}</div><p className="mt-1 text-xs">{t.idea}</p><p className="mt-1 text-xs text-muted-foreground"><b>What the research found:</b> {t.fact}</p><p className="mt-1 text-xs text-primary">In Lagomo: {t.use}</p></li>))}</ul>
        <p className="mt-4 text-xs text-muted-foreground">Lagomo is not therapy or a medical tool. These ideas come from studies of groups of people, so they may not fit you. Your own data above is the better guide.</p>
      </details>
    </div>);
}
