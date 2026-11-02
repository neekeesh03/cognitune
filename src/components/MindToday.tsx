import { Brain } from "lucide-react";
import { useMind } from "@/store/useMind";
import { useState } from "react";
import { pickMindAll, type Pick } from "@/engine/mind";
import { adaptivePick, bestWindow, loadState, toolEfficacy, topInsightCached as topInsight } from "@/engine/insights";
import { loadPickFb, recordPick, retune } from "@/engine/pickfb";
import { nextGame } from "@/engine/games";
import { loadLog } from "@/lib/startlog";
import { openMind } from "@/components/MindTab";

/** One suggestion for this moment from the Mind tools (time of day, last start, what was done today). */
export function MindToday({ go, onStart }: { go: (t: string) => void; onStart?: (title: string, step: string) => void }) {
  const { mind, update } = useMind(); const [skip, setSkip] = useState(0); const snoozed = (() => { try { return localStorage.getItem("lagomo.mind.snooze") === new Date().toDateString(); } catch { return false; } })(); const [hidden, setHidden] = useState(snoozed);
  const starts = loadLog().starts.map(s => s.ts); const light = (() => { try { return localStorage.getItem("lagomo.lightday") === new Date().toDateString(); } catch { return false; } })();
  const gentle = ["kind", "breathe", "brk", "wind"] as const; const eff = toolEfficacy(mind).find(e => (gentle as readonly string[]).includes(e.view) && e.n >= 2); const lv = eff?.view ?? "kind";
  const lightPicks: Pick[] = light ? [{ view: lv, title: "One gentle thing", line: eff ? `${eff.name} has helped you before. Light day: only this, then rest.` : "Light day: do one kind thing for yourself, then rest.", cta: "Do it", why: "Your own data" }] : [];
  const sunday = new Date().getDay() === 0 && (() => { try { return Date.now() - +(localStorage.getItem("lagomo.letter.ts") || 0) > 5 * 864e5; } catch { return false; } })();
  const letterPick: Pick[] = sunday ? [{ view: "letter", title: "Your weekly letter is ready", line: "A kind write-up of your week from your own data, plus one thing to try.", cta: "Read", why: "Your data" }] : [];
  const win = bestWindow(mind, starts); const winDone = (() => { try { return localStorage.getItem("lagomo.window.day") === new Date().toDateString(); } catch { return false; } })(); const h = new Date().getHours();
  const winPick: Pick[] = win && !winDone && (h >= 17 || h < 9) && starts.length >= 3 ? [{ view: "window", title: "Put your hardest task in your best window", line: `Your energy is highest ${win.phrase}. Schedule the task you dread there.`, cta: "Schedule", why: "Your own data" }] : [];
  const ng = nextGame(); const gh = new Date().getHours(); const gameInfo = { focustap: ["Focus tap", "A 40-second game: tap when the circle turns green. Shows how alert you are."], holdback: ["Hold back", "A 40-second game: tap green, not red. Shows how rushed or steady you are."], recall: ["Pattern recall", "A short memory game. Shows how roomy your head is today."] } as const;
  const gamePick: Pick[] = ng && gh >= 8 && gh < 21 && starts.length >= 1 ? [{ view: ng, title: gameInfo[ng][0], line: gameInfo[ng][1], cta: "Play", why: "Behavioural measure" }] : [];
  const quietDue = starts.length >= 8 && (() => { try { return Date.now() - +(localStorage.getItem("lagomo.quiet.ts") || 0) > 3 * 864e5; } catch { return false; } })();
  const quietPick: Pick[] = quietDue ? [{ view: "quiet", title: "Quiet read", line: "See how you seem to be from your own timing, with nothing to answer.", cta: "Read", why: "Your data" }] : [];
  const adapt = adaptivePick(mind); const base = pickMindAll(mind, starts);
  const all = hidden ? [] : retune([...lightPicks, ...letterPick, ...base.slice(0, 1), ...winPick, ...(adapt ? [adapt] : []), ...gamePick, ...quietPick, ...base.slice(1)], loadPickFb(), lightPicks.length + letterPick.length); const pick = all.length ? all[skip % all.length] : null;
  const insight = hidden ? null : topInsight(mind, starts); const ld = loadState(mind, starts);
  const woop = mind.woop[mind.woop.length - 1]; const today = woop && new Date(woop.ts).toDateString() === new Date().toDateString() ? woop : null;
  const parked = (mind.park ?? []).filter(p => !p.resumed && Date.now() - p.ts < 2 * 864e5).slice(-1)[0];
  const hits = mind.woop.filter(w => w.hit != null); const rate = hits.length ? `${hits.filter(w => w.hit).length} of ${hits.length}` : null;
  if (!pick && !today && !parked && !insight) return null;
  return (
    <div className="space-y-2">
    {insight && <button onClick={() => { openMind("insights"); go("mind"); }} className={`glass w-full rounded-3xl px-4 py-3 text-start text-sm transition hover:shadow-lg ${ld.state === "low" ? "border border-destructive/40" : ""}`}><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">From your data</div><div className="mt-0.5">{insight.text}</div></button>}
    {today && <div className="glass rounded-3xl px-4 py-3 text-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Your plan for today</div><div className="mt-0.5"><b>{today.wish}</b></div><div className="text-muted-foreground">{today.plan}</div>
      {today.hit == null ? <div className="mt-2 flex gap-2"><button onClick={() => update(m => ({ ...m, woop: m.woop.map(w => (w.ts === today.ts ? { ...w, hit: true } : w)) }))} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">I did it</button><button onClick={() => update(m => ({ ...m, woop: m.woop.map(w => (w.ts === today.ts ? { ...w, hit: false } : w)) }))} className="rounded-full border border-border px-3 py-1 text-xs">Not yet</button></div> : <div className="mt-1 text-xs text-muted-foreground">{today.hit ? "Nice." : "That is fine. Plans are for learning."}{rate ? ` Your if-then plans worked ${rate} times.` : ""}</div>}</div>}
    {parked && <div className="glass rounded-3xl px-4 py-3 text-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Pick up where you left off</div><div className="mt-0.5"><b>{parked.task}</b></div><div className="text-muted-foreground">{parked.line}</div><div className="mt-2 flex gap-2"><button onClick={() => { update(m => ({ ...m, park: m.park.map(x => (x.id === parked.id ? { ...x, resumed: Date.now() } : x)) })); onStart?.(parked.task.slice(0, 60), parked.line.slice(0, 100)); }} className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Pick up (2 min)</button><button onClick={() => update(m => ({ ...m, park: m.park.map(x => (x.id === parked.id ? { ...x, resumed: Date.now() } : x)) }))} className="rounded-full border border-border px-3 py-1 text-xs">Clear</button></div></div>}
    {pick && <button onClick={() => { recordPick(pick.view, "acc", pick.title); openMind(pick.view); go("mind"); }} className="glass flex w-full items-start gap-3 rounded-3xl p-4 text-start transition hover:shadow-lg" aria-label={`${pick.title}. ${pick.cta}`}>
      <span className="rounded-2xl bg-primary/10 p-2 text-primary"><Brain className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">Mind · for right now</span><span className="block font-semibold">{pick.title}</span><span className="block text-sm text-muted-foreground">{pick.line}</span></span>
      <span className="shrink-0 self-center rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">{pick.cta}</span>
    </button>
    }
    {pick && <div className="flex gap-3 px-2 text-[11px] text-muted-foreground">{all.length > 1 && <button onClick={() => { recordPick(pick.view, "skip", pick.title); setSkip(x => x + 1); }} className="underline">Another idea</button>}<button onClick={() => { recordPick(pick.view, "skip", pick.title); try { localStorage.setItem("lagomo.mind.snooze", new Date().toDateString()); } catch { /* ignore */ } setHidden(true); }} className="underline">Not today</button></div>}
    </div>
  );
}
