import { useMemo, useState } from "react";
import { Check, Flame, Gift, Play, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyze } from "@/engine/text";
import { promptFor } from "@/engine/prompts";
import type { JournalApi } from "@/store/useJournal";
import { dayKey } from "@/store/useJournal";
import type { GameApi } from "@/store/useGame";
import type { PlanApi } from "@/store/usePlan";
import { dkey } from "@/engine/game";
import { fmtTime, hasResources, type Block } from "@/engine/plan";
import { fmtClock, type CalItem } from "@/engine/calendar";
import { StartHero } from "@/components/StartHero";
import { HopStrip } from "@/components/HopStrip";
import { StoryCard } from "@/components/StoryCard";
import { NameCheck } from "@/components/NameCheck";
import { GetStarted } from "@/components/GetStarted";
import { InstallNudge } from "@/components/InstallNudge";
import { Avatar } from "@/components/Avatar";
import type { BurrowApi } from "@/store/useBurrow";
import type { Friend } from "@/store/usePeople";
import type { HopsApi } from "@/store/useHops";

export function TodayTab({ j, name, go, game, plan, agenda, onStart, onStartBlock, friends, hops, burrow, username }: { j: JournalApi; name: string; go: (t: string) => void; game: GameApi; plan: PlanApi; agenda: CalItem[]; onStart: (title: string, step: string) => void; onStartBlock?: (b: Block) => void; friends: Friend[]; hops: HopsApi; burrow: BurrowApi; username: string }) {
  const [calm, setCalm] = useState(() => !!localStorage.getItem("lagomo.calm")); const toggleCalm = () => { const v = !calm; setCalm(v); v ? localStorage.setItem("lagomo.calm", "1") : localStorage.removeItem("lagomo.calm"); };
  const started = !!localStorage.getItem("lagomo.firstStart") || (game.g.counts.started ?? 0) > 0;
  const planned = (() => { try { const p = JSON.parse(localStorage.getItem("lagomo.nexthop") || "null"); return p && Date.now() - p.ts < 36e5 * 30 ? String(p.w).toLowerCase() : ""; } catch { return ""; } })();
  const together = friends.filter(f => (burrow.pairs[f.id]?.both ?? 0) > 0).sort((a, b) => burrow.pairs[b.id].both - burrow.pairs[a.id].both).slice(0, 2);
  const nextBlock = plan.blocks.filter(b => b.day === dkey() && !b.done).sort((a, b) => a.start - b.start)[0];
  const nextStep = plan.tasks.filter(t => !t.doneAt).flatMap(t => t.steps.filter(s => !s.done).map(s => ({ s, t })))[0];
  const boxReady = game.g.todayActive && game.g.boxDay !== dkey();
  const { profile, settings, entries } = j;
  const [openJ, setOpenJ] = useState(false); const [text, setText] = useState(""); const [saved, setSaved] = useState(false); const [crisis, setCrisis] = useState(false);
  const prompt = useMemo(() => promptFor(profile, j.shuffleToday), [profile, j.shuffleToday]);
  const doneToday = entries.some(e => e.kind === "journal" && e.role === "user" && dayKey(new Date(e.ts)) === dayKey());
  const save = () => {
    if (!text.trim()) return;
    setCrisis(analyze(text).crisis);
    j.addUser(text, "journal", { prompt: prompt.text }); game.earn("journal"); setSaved(true); setText("");
  };
  const hour = new Date().getHours(); const hello = `${hour < 12 ? "Good morning" : hour < 18 ? "Hi" : "Good evening"}, ${name.split(" ")[0]}.`;
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="text-center"><p className="mx-auto max-w-md font-display text-3xl leading-snug">{hello}</p><p className="mt-1 text-sm text-muted-foreground">{planned ? `You planned to hop in ${planned}.` : "One start is enough for today."}</p></div>
      <StoryCard />
      <StartHero suggestion={nextStep?.t.title ?? ""} onStart={onStart} />
      <GetStarted username={username} friends={friends.length} started={started} />
      <HopStrip friends={friends} hops={hops} />
      {together.length > 0 && <div className="flex flex-wrap justify-center gap-2">{together.map(f => <span key={f.id} className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm"><Avatar spec={f.avatar} size={26} />{`You and ${f.name.split(" ")[0]} started together ${burrow.pairs[f.id].both} ${burrow.pairs[f.id].both === 1 ? "day" : "days"} this week`}</span>)}</div>}
      {burrow.starters >= 5 && <p className="text-center text-xs text-muted-foreground">{`${burrow.starters} people started today`}</p>}
      <InstallNudge started={started} />
      <NameCheck />

      <>
        <div className="flex items-center justify-center gap-3 text-sm">
          {!calm && <>
          <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2"><Flame className="h-4 w-4" style={{ color: "hsl(var(--f-primode))" }} /><b>{game.g.streak.current}</b> showing-up days</span>
          <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2"><Sparkles className="h-4 w-4 text-primary" /><b>{game.g.sparks}</b> sparks</span>
          </>}
          {boxReady && <button onClick={game.openBox} className="glass flex animate-breathe items-center gap-1.5 rounded-full px-4 py-2 text-primary"><Gift className="h-4 w-4" />Open spark box</button>}
          <button onClick={toggleCalm} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">{calm ? "Show numbers" : "Hide numbers"}</button>
        </div>
        {(nextBlock || nextStep || agenda.length > 0) && (
          <div className="glass flex w-full items-center justify-between gap-3 rounded-3xl px-5 py-4 transition hover:scale-[1.01]">
            <button onClick={() => go("plan")} className="min-w-0 flex-1 text-start"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Up next</div>
              <div className="truncate text-lg font-semibold">{nextBlock ? nextBlock.title : nextStep ? nextStep.s.text : agenda[0]?.title}</div>
              <div className="truncate text-sm text-muted-foreground">{nextBlock ? `${fmtTime(nextBlock.start)} · ${nextBlock.dur} min${hasResources(nextBlock) ? " · resources attached" : ""}` : nextStep ? nextStep.t.title : agenda[0] ? (agenda[0].allDay ? "All day" : fmtClock(agenda[0].start)) : ""}{agenda.length > 1 ? ` · ${agenda.length} things today` : ""}</div>
            </button>
            {nextBlock && onStartBlock ? <button onClick={() => onStartBlock(nextBlock)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"><Play className="h-3.5 w-3.5" />Start now</button> : <button onClick={() => go("plan")} className="shrink-0 text-sm text-primary">Open</button>}</div>)}

        {/* The journal prompt stays folded until you want it */}
        {!openJ && !saved ? (
          <button onClick={() => setOpenJ(true)} className="glass flex w-full items-center justify-between gap-3 rounded-3xl px-5 py-4 text-left transition hover:scale-[1.01]">
            <div className="min-w-0"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{doneToday ? "Written today" : "Today's prompt"}</div><div className="truncate text-lg">{prompt.text}</div></div>
            <span className="shrink-0 text-sm text-primary">Write</span></button>
        ) : (
        <div className="glass rounded-3xl p-5">
          <div className="mb-1 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today's prompt</span>
            <span className="flex items-center"><button aria-label="New prompt" onClick={j.reshuffle} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
              {!saved && <button aria-label="Fold away" onClick={() => setOpenJ(false)} className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Close</button>}</span></div>
          <h2 className="text-2xl leading-snug">{prompt.text}</h2>
          {saved ? (
            <div className="mt-4 space-y-2"><div className="w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-primary/15 px-4 py-2.5 text-sm">Saved. Thank you for writing it down.</div>
              {crisis && <div className="rounded-2xl border border-border bg-secondary/50 p-3 text-sm">If you are in danger or thinking about hurting yourself, please contact local emergency services or someone you trust now. findahelpline.com lists free lines by country.</div>}
              <div className="flex gap-2 pt-2"><Button variant="ghost" className="rounded-full" onClick={() => { setSaved(false); setCrisis(false); setOpenJ(false); }}>Done</Button></div></div>
          ) : (<>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} autoFocus placeholder="Write freely. Nobody else sees this." className="mt-4 w-full resize-none rounded-2xl border border-border bg-secondary/40 p-4 text-base outline-none focus:border-primary/60" />
            <Button variant="hero" size="lg" className="mt-3 h-12 w-full rounded-2xl" disabled={!text.trim()} onClick={save}><Check className="mr-2 h-4 w-4" />Save to journal</Button>
          </>)}
        </div>)}

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <button onClick={() => go("plan")} className="glass rounded-full px-4 py-2 hover:text-primary">Plan a tiny thing</button>
          <button onClick={() => go("checkin")} className="glass rounded-full px-4 py-2 hover:text-primary">Ready-to-start check</button>
        </div>

        {profile.openLoops.length > 0 && (
          <div className="glass rounded-3xl p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Things you mentioned</div>
            <div className="space-y-2">{profile.openLoops.slice(0, 3).map(l => (
              <div key={l.text + l.ts} className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[.05] p-3 text-sm"><span>{l.text}</span><button className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => j.resolve(l.text)}>Done</button></div>))}</div>
          </div>
        )}
      </>
    </div>
  );
}
