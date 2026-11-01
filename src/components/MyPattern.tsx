import { useMemo } from "react";
import { useStartLog } from "@/lib/startlog";
import { ARMS, accuracy, analyse, armStats } from "@/engine/pattern";
import { TACTICS, coachEvent, loadCoach } from "@/engine/coach";
import { useEffect, useState } from "react";

const Tag = ({ t }: { t: "Established" | "Exploratory" | "Experimental" }) => (
  <span className={`rounded-full px-2 py-0.5 text-[10px] ${t === "Established" ? "bg-primary/15 text-primary" : t === "Exploratory" ? "bg-accent/25 text-foreground" : "bg-foreground/[.08] text-muted-foreground"}`}>{t}</span>);
const Card = ({ title, tag, children, note }: { title: string; tag?: "Established" | "Exploratory" | "Experimental"; children: React.ReactNode; note?: string }) => (
  <div className="glass rounded-3xl p-5"><div className="mb-3 flex items-center justify-between gap-2"><div className="text-sm font-semibold">{title}</div>{tag && <Tag t={tag} />}</div>{children}{note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}</div>);
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/** Your Start Map: what your own starts say about you. Every card says how solid it is. */
export function MyPattern() {
  const { log } = useStartLog(); const now = Date.now(); const [cs, setCs] = useState(loadCoach);
  useEffect(() => { const f = () => setCs(loadCoach()); window.addEventListener(coachEvent, f); return () => window.removeEventListener(coachEvent, f); }, []);
  const fr = TACTICS.map(t => ({ t, n: cs.events.filter(e => e.friction === t.id).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
  const p = useMemo(() => analyse(log, now), [log]); // eslint-disable-line react-hooks/exhaustive-deps
  const acc = useMemo(() => accuracy(log), [log]); const arms = useMemo(() => armStats(log, now), [log]); // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(1, ...p.hours.map(h => h.k)), wmax = Math.max(1, ...p.weekdays), kmax = Math.max(1, ...p.weeks);
  if (p.n === 0) return (
    <div className="glass mx-auto max-w-md rounded-3xl p-8 text-center"><div className="text-lg font-semibold">Your start map is empty</div><p className="mt-2 text-sm text-muted-foreground">Start one thing for two minutes and I will begin learning when, how and with whom you start best. It all stays on this device.</p></div>);
  const armRows = Object.keys(ARMS).filter(k => arms[k].n >= 1);
  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
      <div className="space-y-4">
        <div className="glass rounded-3xl p-6 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your starter type</div>
          {p.type ? <><div className="mt-1 font-display text-3xl">{p.type.name}</div><p className="mt-1 text-sm">{p.type.blurb}</p><p className="mt-3 rounded-2xl bg-primary/10 px-4 py-2 text-sm text-primary">Try: {p.type.tip}</p><p className="mt-2 text-xs text-muted-foreground">Based on your last {p.n} starts. It can change as you do.</p></>
            : <><div className="mt-1 font-display text-2xl">Still learning you</div><p className="mt-1 text-sm text-muted-foreground">{p.need} more {p.need === 1 ? "start" : "starts"} and I can name your type.</p></>}
        </div>
        <Card title="When you start" tag="Exploratory" note={p.best ? `Most of your starts are in the ${p.best.toLowerCase()}. Bars show the share, the whisker shows how sure I am.` : "Not enough starts to say yet. Bars show the share, the whisker shows how sure I am."}>
          <div className="flex items-end justify-between gap-2">{p.hours.map(h => (
            <div key={h.name} className="flex flex-1 flex-col items-center gap-1"><div className="relative flex h-24 w-full items-end justify-center"><div className="w-full max-w-[34px] rounded-t-xl bg-primary/70" style={{ height: `${(h.k / max) * 100}%`, minHeight: h.k ? 6 : 2, opacity: h.k ? 1 : 0.2 }} />
              {p.n >= 5 && h.k > 0 && <div className="absolute w-px bg-foreground/50" style={{ bottom: `${h.lo * 100 / Math.max(...p.hours.map(x => x.hi), 0.01) * 0.96}%`, height: `${(h.hi - h.lo) * 100 / Math.max(...p.hours.map(x => x.hi), 0.01) * 0.96}%` }} />}</div>
              <div className="text-[10px] text-muted-foreground">{h.name}</div><div className="text-xs font-medium">{h.k}</div></div>))}</div>
        </Card>
        <Card title="Your week" tag="Exploratory">
          <div className="flex items-end justify-between gap-2">{p.weekdays.map((k, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="flex h-16 w-full items-end justify-center"><div className="w-full max-w-[22px] rounded-t-lg bg-primary/45" style={{ height: `${(k / wmax) * 100}%`, minHeight: k ? 5 : 2, opacity: k ? 1 : 0.2 }} /></div><div className="text-[10px] text-muted-foreground">{DOW[i]}</div></div>)}</div>
          <div className="mt-4 text-xs text-muted-foreground">Starts per week, last four weeks</div>
          <div className="mt-1 flex items-end gap-2">{p.weeks.map((k, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><div className="flex h-10 w-full items-end"><div className="w-full rounded-md bg-primary/60" style={{ height: `${(k / kmax) * 100}%`, minHeight: k ? 4 : 2, opacity: k ? 1 : 0.2 }} /></div><div className="text-[10px]">{k}</div></div>)}</div>
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="What gets you going" tag="Exploratory">
          <ul className="space-y-3 text-sm">
            <li><b>Deadlines.</b> {p.deadline ? `${Math.round(100 * p.deadline.late / p.deadline.n)}% of your starts on dated tasks came in the last 2 days.` : "Add due dates to tasks and I will see whether the clock helps you."}</li>
            <li><b>Warming up.</b> {p.warm ? `${Math.round(100 * p.warm.got / p.warm.n)}% of the time you said you "got going" rather than finished.` : "Say how it went after a session and I will learn how you warm up."}</li>
            <li><b>Other people.</b> {p.friend ? `With a friend you finished ${Math.round(100 * p.friend.dTogether)}% of starts, alone ${Math.round(100 * p.friend.dSolo)}% (${p.friend.together} and ${p.friend.solo} starts).` : "Start with a friend a few times, and alone a few times, and I will compare."}</li>
            <li><b>Waiting time.</b> {p.latency ? `You usually begin a task about ${p.latency.medHrs < 1 ? "within the hour" : p.latency.medHrs < 48 ? Math.round(p.latency.medHrs) + " hours" : Math.round(p.latency.medHrs / 24) + " days"} after adding it.` : "Add a task, then start it, and I will time how long it sits."}</li>
          </ul>
        </Card>
        <Card title="What gets in your way" tag="Exploratory" note="From the times you tapped Get unstuck. The same reason showing up again and again is worth a smaller first step.">
          {fr.length === 0 ? <p className="text-sm text-muted-foreground">When something feels hard, tap "Get unstuck" on Today. I will learn your usual blockers.</p> :
            <ul className="space-y-2 text-sm">{fr.slice(0, 4).map(({ t, n }) => <li key={t.id}><div className="flex justify-between gap-3"><span>{t.label}</span><span className="text-muted-foreground">{n}x</span></div>{t === fr[0].t && <div className="mt-0.5 text-xs text-primary">Your usual move: {t.name.toLowerCase()}.</div>}</li>)}</ul>}
        </Card>
        <Card title="What works for you" tag="Exploratory" note="Each day I try a small idea, sometimes none, and see whether you started. It takes a few weeks to mean anything.">
          {armRows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to compare yet. Come back after a few days.</p> :
            <ul className="space-y-1.5 text-sm">{armRows.map(k => <li key={k} className="flex justify-between gap-3"><span>{ARMS[k].title}</span><span className="text-muted-foreground">{arms[k].n >= 3 ? `started on ${arms[k].hit} of ${arms[k].n} days` : `${arms[k].n} ${arms[k].n === 1 ? "day" : "days"} tried`}</span></li>)}</ul>}
        </Card>
        <Card title="How well does Lagomo know me?" tag="Experimental" note="Checked against what you really did in the 3 hours after each time you opened the app. If a guess does not beat a plain one, I say so.">
          <div className="space-y-2 text-sm">
            <div>{acc.verdict === "learning" ? `Still learning. ${Math.max(0, 15 - acc.n)} more checked windows needed.` : acc.verdict === "ahead" ? "My guess is beating a plain guess based on your usual hour." : acc.verdict === "behind" ? "My guess is not beating a plain guess yet. I will lean on your usual hours." : "My guess and a plain guess tie, so I cannot tell which is better yet."}</div>
            <div className="text-muted-foreground">Lagun's Law view: {acc.lagun === "learning" ? (acc.nl === 0 ? "needs a Start check (sliders) to be tested." : `${Math.max(0, 10 - acc.nl)} more windows needed.`) : acc.lagun === "ahead" ? "ahead of your usual hour." : acc.lagun === "behind" ? "behind your usual hour for now." : "can't tell yet."}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
