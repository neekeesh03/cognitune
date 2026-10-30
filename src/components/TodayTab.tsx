import { useMemo, useState } from "react";
import { Check, Flame, Gift, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyze } from "@/engine/text";
import { promptFor } from "@/engine/prompts";
import type { JournalApi } from "@/store/useJournal";
import { dayKey } from "@/store/useJournal";
import type { GameApi } from "@/store/useGame";
import type { PlanApi } from "@/store/usePlan";
import { dkey } from "@/engine/game";
import { fmtTime } from "@/engine/plan";
import { fmtClock, type CalItem } from "@/engine/calendar";
import { StartHero } from "@/components/StartHero";
import { HopStrip } from "@/components/HopStrip";
import type { Friend } from "@/store/usePeople";
import type { HopsApi } from "@/store/useHops";

export function TodayTab({ j, name, go, game, plan, agenda, onStart, friends, hops }: { j: JournalApi; name: string; go: (t: string) => void; game: GameApi; plan: PlanApi; agenda: CalItem[]; onStart: (title: string, step: string) => void; friends: Friend[]; hops: HopsApi }) {
  const nextBlock = plan.blocks.filter(b => b.day === dkey() && !b.done).sort((a, b) => a.start - b.start)[0];
  const nextStep = plan.tasks.filter(t => !t.doneAt).flatMap(t => t.steps.filter(s => !s.done).map(s => ({ s, t })))[0];
  const boxReady = game.g.todayActive && game.g.boxDay !== dkey();
  const { profile, settings, entries } = j;
  const [text, setText] = useState(""); const [saved, setSaved] = useState(false); const [crisis, setCrisis] = useState(false);
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
      <div className="text-center"><p className="mx-auto max-w-md font-display text-3xl leading-snug">{hello}</p><p className="mt-1 text-sm text-muted-foreground">One start is enough for today.</p></div>
      <StartHero suggestion={nextStep?.t.title ?? ""} onStart={onStart} />
      <HopStrip friends={friends} hops={hops} />

      <>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2"><Flame className="h-4 w-4" style={{ color: "hsl(var(--f-primode))" }} /><b>{game.g.streak.current}</b> showing-up days</span>
          <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2"><Sparkles className="h-4 w-4 text-primary" /><b>{game.g.sparks}</b> sparks</span>
          {boxReady && <button onClick={game.openBox} className="glass flex animate-breathe items-center gap-1.5 rounded-full px-4 py-2 text-primary"><Gift className="h-4 w-4" />Open spark box</button>}
        </div>
        {agenda.length > 0 && <div className="glass rounded-3xl p-5"><div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Your day</span><button className="text-xs text-primary hover:underline" onClick={() => go("plan")}>Open calendar</button></div>
          <div className="space-y-2">{agenda.slice(0, 5).map(i => <div key={i.kind + i.id} className="flex items-center gap-3 text-sm"><span className="w-16 shrink-0 text-xs text-muted-foreground">{i.allDay ? "All day" : fmtClock(i.start)}</span><span className={`truncate ${i.done ? "line-through opacity-60" : ""}`}>{i.title}</span><i className="ml-auto h-2 w-2 shrink-0 rounded-full" style={{ background: i.kind === "block" ? "hsl(var(--primary))" : "hsl(var(--f-grain))" }} /></div>)}</div></div>}
        <div className="glass rounded-3xl p-5">
          <div className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Next up</div>
          {nextBlock ? <button className="w-full text-left" onClick={() => go("plan")}><div className="text-2xl font-semibold">{nextBlock.title}</div><div className="text-sm text-muted-foreground">{fmtTime(nextBlock.start)} · {nextBlock.dur} min · tap to open your plan</div></button>
            : nextStep ? <button className="w-full text-left" onClick={() => go("plan")}><div className="text-sm text-muted-foreground">{nextStep.t.title}</div><div className="text-2xl font-semibold">{nextStep.s.text}</div><div className="text-sm text-muted-foreground">A tiny step. Tap to see the rest.</div></button>
            : <button className="w-full text-left" onClick={() => go("plan")}><div className="text-2xl font-semibold">Nothing planned yet</div><div className="text-sm text-muted-foreground">Add one small thing to do. Tap to plan.</div></button>}
        </div>
        <div className="glass rounded-3xl p-5">
          <div className="mb-1 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today's prompt</span>
            <button aria-label="New prompt" onClick={j.reshuffle} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button></div>
          <h2 className="text-3xl leading-snug">{prompt.text}</h2>
          {saved ? (
            <div className="mt-4 space-y-2"><div className="w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-primary/15 px-4 py-2.5 text-sm">Saved. Thank you for writing it down.</div>
              {crisis && <div className="rounded-2xl border border-border bg-secondary/50 p-3 text-sm">If you are in danger or thinking about hurting yourself, please contact local emergency services or someone you trust now. findahelpline.com lists free lines by country.</div>}
              <div className="flex gap-2 pt-2"><Button variant="ghost" className="rounded-full" onClick={() => { setSaved(false); setCrisis(false); }}>Done</Button></div></div>
          ) : (<>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Write freely. Nobody else sees this." className="mt-4 w-full resize-none rounded-2xl border border-border bg-secondary/40 p-4 text-base outline-none focus:border-primary/60" />
            <Button variant="hero" size="lg" className="mt-3 h-12 w-full rounded-2xl" disabled={!text.trim()} onClick={save}><Check className="mr-2 h-4 w-4" />Save to journal</Button>
          </>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => go("plan")} className="glass rounded-3xl p-5 text-left transition hover:scale-[1.01]"><div className="font-display text-2xl">Plan one tiny thing</div><div className="text-sm text-muted-foreground">Add it, split it into small steps.</div></button>
          <button onClick={() => go("checkin")} className="glass rounded-3xl p-5 text-left transition hover:scale-[1.01]"><div className="font-display text-2xl">Ready-to-start check</div><div className="text-sm text-muted-foreground">{profile.blendWeight > 0.02 ? "Now tuned to you." : "Six taps before you start something."}</div></button>
        </div>

        {profile.openLoops.length > 0 && (
          <div className="glass rounded-3xl p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Things you mentioned</div>
            <div className="space-y-2">{profile.openLoops.slice(0, 3).map(l => (
              <div key={l.text + l.ts} className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[.05] p-3 text-sm"><span>{l.text}</span><button className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => j.resolve(l.text)}>Done</button></div>))}</div>
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">{profile.entries} entries, {profile.journalDays} days with writing. Missed days never count against you.</p>
      </>
    </div>
  );
}
