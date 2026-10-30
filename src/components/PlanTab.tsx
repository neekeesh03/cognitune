import { track } from "@/lib/track";
import { useMemo, useState, useEffect } from "react";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Download, Play, Plus, Sparkles, Trash2, Wand2, Bell, Paperclip, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BringAlongEditor, BringAlongToggle, ResourceList, draftOf, draftToBlock, emptyDraft, type Draft } from "@/components/BringAlong";
import { alertState } from "@/lib/push";
import { deleteBlockFile } from "@/lib/blockfiles";
import { FocusTimer } from "@/components/FocusTimer";
import { Block, download, fmtTime, googleLink, icsFor, suggestSteps, uid , hasResources, repeatLabel } from "@/engine/plan";
import { dkey } from "@/engine/game";
import { timeOfDay, CheckIn } from "@/engine/analytics";
import type { PlanApi } from "@/store/usePlan";
import type { GameApi } from "@/store/useGame";
import { CalendarView } from "@/components/CalendarView";
import type { CalendarApi } from "@/store/useCalendar";

const DURS = [15, 25, 45, 60, 90];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am..10pm
const shift = (day: string, n: number) => { const d = new Date(day + "T12:00"); d.setDate(d.getDate() + n); return dkey(d); };

export function PlanTab({ plan, game, history, cal }: { plan: PlanApi; game: GameApi; history: CheckIn[]; cal: CalendarApi }) {
  const [view, setView] = useState<"todo" | "day" | "cal">("todo");
  return (
    <div className={`animate-rise mx-auto ${view === "cal" ? "max-w-3xl" : "max-w-2xl"}`}>
      <div className="mb-6 flex w-fit gap-1 rounded-full bg-foreground/[.05] p-1">{([["todo", "Tiny to-dos"], ["day", "Day planner"], ["cal", "Calendar"]] as const).map(([id, l]) => <button key={id} onClick={() => setView(id)} className={`rounded-full px-4 py-1.5 text-sm ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>
      {view === "todo" ? <Todos plan={plan} game={game} /> : view === "day" ? <Day plan={plan} game={game} history={history} /> : <CalendarView plan={plan} cal={cal} game={game} />}
    </div>
  );
}

function Todos({ plan, game }: { plan: PlanApi; game: GameApi }) {
  const [title, setTitle] = useState(""); const [open, setOpen] = useState<string | null>(null); const [stepText, setStepText] = useState("");
  const active = plan.tasks.filter(t => !t.doneAt), done = plan.tasks.filter(t => t.doneAt);
  const create = (auto: boolean) => { const t = title.trim(); if (!t) return; const x = plan.addTask({ title: t, steps: auto ? suggestSteps(t) : [] }); setTitle(""); setOpen(x.id); };
  const tick = (taskId: string, stepId: string) => {
    const t = plan.tasks.find(x => x.id === taskId)!; const s = t.steps.find(x => x.id === stepId)!; const nowDone = !s.done;
    const steps = t.steps.map(x => x.id === stepId ? { ...x, done: nowDone, doneAt: nowDone ? Date.now() : undefined } : x);
    const finished = steps.length > 0 && steps.every(x => x.done);
    plan.patchTask(taskId, tt => ({ ...tt, steps, doneAt: finished ? Date.now() : undefined }));
    if (nowDone) { game.earn("step"); if (finished) game.earn("task"); }
  };
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-4">
        <p className="mb-2 text-sm text-muted-foreground">What's something you want to get done? Big is fine. We will make it tiny.</p>
        <Input className="h-12 rounded-2xl bg-secondary/60" placeholder="e.g. Write the methods section" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && create(true)} />
        <div className="mt-3 flex gap-2"><Button variant="hero" className="h-11 flex-1 rounded-2xl" disabled={!title.trim()} onClick={() => create(true)}><Wand2 className="mr-2 h-4 w-4" />Add and make it tiny</Button><Button variant="outline" className="h-11 rounded-2xl" disabled={!title.trim()} onClick={() => create(false)}><Plus className="mr-1 h-4 w-4" />Just add</Button></div>
      </div>
      {active.length === 0 && <p className="py-6 text-center text-muted-foreground">Nothing here yet. Add one thing and I will help you start it.</p>}
      {active.map(t => {
        const d = t.steps.filter(s => s.done).length, pct = t.steps.length ? d / t.steps.length : 0;
        return (
          <div key={t.id} className="glass rounded-3xl p-4">
            <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setOpen(open === t.id ? null : t.id)}>
              <div className="min-w-0"><div className="truncate text-lg font-semibold">{t.title}</div><div className="text-xs text-muted-foreground">{t.steps.length ? `${d} of ${t.steps.length} tiny steps` : "No steps yet"}</div></div>
              <div className="h-2 w-20 shrink-0 rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct * 100}%` }} /></div>
            </button>
            {open === t.id && (
              <div className="mt-4 space-y-2">
                {t.steps.map(s => (
                  <button key={s.id} onClick={() => tick(t.id, s.id)} className={`flex w-full items-center gap-3 rounded-2xl bg-foreground/[.05] p-3 text-left text-[15px] transition hover:bg-foreground/[.08] ${s.done ? "opacity-60" : ""}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${s.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"}`}>{s.done && <Check className="h-3.5 w-3.5" />}</span>
                    <span className={s.done ? "line-through" : ""}>{s.text}</span>
                  </button>))}
                <div className="flex gap-2"><Input className="h-10 rounded-2xl bg-secondary/60" placeholder="Add your own tiny step" value={stepText} onChange={e => setStepText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && stepText.trim()) { plan.patchTask(t.id, x => ({ ...x, steps: [...x.steps, { id: uid(), text: stepText.trim(), done: false }] })); setStepText(""); } }} />
                  {t.steps.length === 0 && <Button variant="outline" className="rounded-2xl" onClick={() => plan.patchTask(t.id, x => ({ ...x, steps: suggestSteps(x.title) }))}><Sparkles className="mr-1 h-4 w-4" />Suggest</Button>}</div>
                <div className="flex justify-end"><button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => plan.removeTask(t.id)}><Trash2 className="h-3.5 w-3.5" />Delete task</button></div>
              </div>)}
          </div>);
      })}
      {done.length > 0 && <div className="pt-2"><div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Finished ({done.length})</div>{done.slice(0, 5).map(t => <div key={t.id} className="mb-1 flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-primary" />{t.title}</div>)}</div>}
    </div>
  );
}

function Day({ plan, game, history }: { plan: PlanApi; game: GameApi; history: CheckIn[] }) {
  const [day, setDay] = useState(dkey()); const [title, setTitle] = useState(""); const [start, setStart] = useState(10 * 60); const [dur, setDur] = useState(25);
  const [timer, setTimer] = useState<Block | null>(null); const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft); const [editing, setEditing] = useState<string | null>(null); const [ed, setEd] = useState<Draft>(emptyDraft); const [alertsOn, setAlertsOn] = useState<boolean | undefined>(undefined);
  useEffect(() => { alertState().then(s => setAlertsOn(s === "on")); }, []);
  const blocks = plan.blocks.filter(b => b.day === day).sort((a, b) => a.start - b.start);
  const best = useMemo(() => { const t = timeOfDay(history).filter(x => x.drive != null && x.n >= 2).sort((a, b) => b.drive! - a.drive!)[0]; return t ? parseInt(t.label) : null; }, [history]);
  const label = day === dkey() ? "Today" : new Date(day + "T12:00").toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  const add = () => { if (!title.trim()) return; plan.addBlock({ title: title.trim(), day, start, dur, ...draftToBlock(draft) }, draft.repeat); if (draft.repeat !== "none") track("block_repeat"); setTitle(""); setDraft(emptyDraft()); };
  const overlap = blocks.some(b => start < b.start + b.dur && b.start < start + dur);
  return (
    <div className="space-y-5">
      {timer && <FocusTimer color="var(--v-ready)" task={timer.title} resources={timer} onStarted={() => game.earn("started", { early: new Date().getHours() < 9 })} onClose={() => setTimer(null)} />}
      <div className="flex items-center justify-between">
        <button aria-label="Previous day" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => setDay(shift(day, -1))}><ChevronLeft /></button>
        <div className="text-center"><div className="text-2xl font-semibold">{label}</div><button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => setDay(dkey())}>Jump to today</button></div>
        <button aria-label="Next day" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => setDay(shift(day, 1))}><ChevronRight /></button>
      </div>
      <div className="glass rounded-3xl p-4">
        <p className="mb-2 text-sm text-muted-foreground">Give a task a time slot. A planned start is much easier than an open-ended one.{best != null && <> You tend to feel readiest around <b className="text-foreground">{fmtTime(best * 60)}</b>.</>}</p>
        <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="What will you do?" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} list="task-titles" />
        <datalist id="task-titles">{plan.tasks.filter(t => !t.doneAt).map(t => <option key={t.id} value={t.title} />)}</datalist>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label="Start time" value={start} onChange={e => setStart(Number(e.target.value))} className="h-10 rounded-2xl border border-border bg-secondary/60 px-3 text-sm">{HOURS.flatMap(h => [0, 30].map(m => <option key={h * 60 + m} value={h * 60 + m}>{fmtTime(h * 60 + m)}</option>))}</select>
          {DURS.map(d => <button key={d} onClick={() => setDur(d)} className={`rounded-full border px-3 py-1.5 text-sm ${dur === d ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{d} min</button>)}
        </div>
        <BringAlongToggle d={draft} set={setDraft} />
        {overlap && <p className="mt-2 text-xs text-warning">That overlaps another block. You can still add it.</p>}
        <Button variant="hero" className="mt-3 h-11 w-full rounded-2xl" disabled={!title.trim()} onClick={add}><CalendarPlus className="mr-2 h-4 w-4" />Add to my day</Button>
      </div>
      <div className="glass rounded-3xl p-4">
        {blocks.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nothing planned for this day. Add one small block above.</p> : (
          <div className="space-y-2">{blocks.map(b => (
            <div key={b.id} className={`rounded-2xl border border-border p-3 ${b.done ? "opacity-60" : ""}`}>
              <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setSel(sel === b.id ? null : b.id)}>
                <div><div className={`font-semibold ${b.done ? "line-through" : ""}`}>{b.title}</div><div className="text-xs text-muted-foreground">{fmtTime(b.start)} to {fmtTime(b.start + b.dur)} · {b.dur} min</div></div>
                <span className="flex items-center gap-2 text-muted-foreground">{hasResources(b) && <Paperclip className="h-4 w-4" aria-label="Resources attached" />}{b.remind != null && !b.done && <Bell className="h-4 w-4" aria-label="Reminder on" />}{b.done && <Check className="h-5 w-5 text-primary" />}</span>
              </button>
              {sel === b.id && b.series && <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Repeat className="h-3.5 w-3.5" />{(() => { const r = plan.series.find(s => s.id === b.series)?.rule; return r ? repeatLabel(r) : "Repeats"; })()}<button className="text-primary underline-offset-2 hover:underline" onClick={() => { if (confirm("Stop repeating? Days already done stay.")) plan.stopSeries(b.series!); }}>Stop repeating</button></p>}
              {sel === b.id && hasResources(b) && editing !== b.id && <div className="mt-3"><ResourceList b={b} /></div>}
              {sel === b.id && editing === b.id && <div className="mt-3 space-y-2"><BringAlongEditor d={ed} set={setEd} alertsOn={alertsOn} /><div className="flex gap-2"><Button size="sm" variant="hero" className="rounded-full" onClick={() => { plan.patchBlock(b.id, { note: undefined, links: undefined, files: undefined, remind: undefined, ...draftToBlock(ed), notified: false }); setEditing(null); }}>Save</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={() => { const keep = new Set((b.files ?? []).map(f => f.id)); ed.files.filter(f => !keep.has(f.id)).forEach(f => deleteBlockFile(f.id)); setEditing(null); }}>Cancel</Button></div></div>}
              {sel === b.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {!b.done && <Button size="sm" variant="hero" className="rounded-full" onClick={() => setTimer(b)}><Play className="mr-1 h-3.5 w-3.5" />Start now</Button>}
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => { plan.patchBlock(b.id, { done: !b.done }); if (!b.done) game.earn("block"); }}>{b.done ? "Mark not done" : "Mark done"}</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setEd(draftOf(b)); setEditing(b.id); }}><Paperclip className="mr-1 h-3.5 w-3.5" />Bring along</Button>
                  <a className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm hover:bg-foreground/5" href={googleLink(b)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => plan.removeBlock(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>)}
            </div>))}</div>)}
        {blocks.length > 0 && <div className="mt-3 flex justify-end"><Button size="sm" variant="ghost" className="rounded-full" onClick={() => download(`lagomo-${day}.ics`, icsFor(blocks), "text/calendar")}><Download className="mr-1 h-3.5 w-3.5" />Save day to any calendar (.ics)</Button></div>}
      </div>
    </div>
  );
}
