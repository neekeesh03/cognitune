import { Brain } from "lucide-react";
import { useMind } from "@/store/useMind";
import { useState } from "react";
import { pickMindAll } from "@/engine/mind";
import { loadLog } from "@/lib/startlog";
import { openMind } from "@/components/MindTab";

/** One suggestion for this moment from the Mind tools (time of day, last start, what was done today). */
export function MindToday({ go, onStart }: { go: (t: string) => void; onStart?: (title: string, step: string) => void }) {
  const { mind, update } = useMind(); const [skip, setSkip] = useState(0); const snoozed = (() => { try { return localStorage.getItem("lagomo.mind.snooze") === new Date().toDateString(); } catch { return false; } })(); const [hidden, setHidden] = useState(snoozed);
  const all = hidden ? [] : pickMindAll(mind, loadLog().starts.map(s => s.ts)); const pick = all.length ? all[skip % all.length] : null;
  const woop = mind.woop[mind.woop.length - 1]; const today = woop && new Date(woop.ts).toDateString() === new Date().toDateString() ? woop : null;
  const parked = (mind.park ?? []).filter(p => !p.resumed && Date.now() - p.ts < 2 * 864e5).slice(-1)[0];
  const hits = mind.woop.filter(w => w.hit != null); const rate = hits.length ? `${hits.filter(w => w.hit).length} of ${hits.length}` : null;
  if (!pick && !today && !parked) return null;
  return (
    <div className="space-y-2">
    {today && <div className="glass rounded-3xl px-4 py-3 text-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Your plan for today</div><div className="mt-0.5"><b>{today.wish}</b></div><div className="text-muted-foreground">{today.plan}</div>
      {today.hit == null ? <div className="mt-2 flex gap-2"><button onClick={() => update(m => ({ ...m, woop: m.woop.map(w => (w.ts === today.ts ? { ...w, hit: true } : w)) }))} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">I did it</button><button onClick={() => update(m => ({ ...m, woop: m.woop.map(w => (w.ts === today.ts ? { ...w, hit: false } : w)) }))} className="rounded-full border border-border px-3 py-1 text-xs">Not yet</button></div> : <div className="mt-1 text-xs text-muted-foreground">{today.hit ? "Nice." : "That is fine. Plans are for learning."}{rate ? ` Your if-then plans worked ${rate} times.` : ""}</div>}</div>}
    {parked && <div className="glass rounded-3xl px-4 py-3 text-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Pick up where you left off</div><div className="mt-0.5"><b>{parked.task}</b></div><div className="text-muted-foreground">{parked.line}</div><div className="mt-2 flex gap-2"><button onClick={() => { update(m => ({ ...m, park: m.park.map(x => (x.id === parked.id ? { ...x, resumed: Date.now() } : x)) })); onStart?.(parked.task.slice(0, 60), parked.line.slice(0, 100)); }} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Pick up (2 min)</button><button onClick={() => update(m => ({ ...m, park: m.park.map(x => (x.id === parked.id ? { ...x, resumed: Date.now() } : x)) }))} className="rounded-full border border-border px-3 py-1 text-xs">Clear</button></div></div>}
    {pick && <button onClick={() => { openMind(pick.view); go("mind"); }} className="glass flex w-full items-start gap-3 rounded-3xl p-4 text-start transition hover:shadow-lg" aria-label={`${pick.title}. ${pick.cta}`}>
      <span className="rounded-2xl bg-primary/10 p-2 text-primary"><Brain className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">Mind · for right now</span><span className="block font-semibold">{pick.title}</span><span className="block text-sm text-muted-foreground">{pick.line}</span></span>
      <span className="shrink-0 self-center rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">{pick.cta}</span>
    </button>
    }
    {pick && <div className="flex gap-3 px-2 text-[11px] text-muted-foreground">{all.length > 1 && <button onClick={() => setSkip(x => x + 1)} className="underline">Another idea</button>}<button onClick={() => { try { localStorage.setItem("lagomo.mind.snooze", new Date().toDateString()); } catch { /* ignore */ } setHidden(true); }} className="underline">Not today</button></div>}
    </div>
  );
}
