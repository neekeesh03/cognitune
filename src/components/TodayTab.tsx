import { useMemo, useState } from "react";
import { Check, Flame, Gift, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Companion, Mood } from "@/components/Companion";
import { greeting } from "@/engine/friend";
import { promptFor } from "@/engine/prompts";
import { reply } from "@/engine/friend";
import type { JournalApi } from "@/store/useJournal";
import { dayKey } from "@/store/useJournal";
import type { GameApi } from "@/store/useGame";
import type { PlanApi } from "@/store/usePlan";
import { dkey } from "@/engine/game";
import { fmtTime } from "@/engine/plan";

export function TodayTab({ j, go, game, plan }: { j: JournalApi; go: (t: string) => void; game: GameApi; plan: PlanApi }) {
  const nextBlock = plan.blocks.filter(b => b.day === dkey() && !b.done).sort((a, b) => a.start - b.start)[0];
  const nextStep = plan.tasks.filter(t => !t.doneAt).flatMap(t => t.steps.filter(s => !s.done).map(s => ({ s, t })))[0];
  const boxReady = game.g.todayActive && game.g.boxDay !== dkey();
  const { profile, settings, entries } = j;
  const [text, setText] = useState(""); const [answer, setAnswer] = useState<string[] | null>(null); const [nameDraft, setNameDraft] = useState("");
  const prompt = useMemo(() => promptFor(profile, j.shuffleToday), [profile, j.shuffleToday]);
  const doneToday = entries.some(e => e.kind === "journal" && e.role === "user" && dayKey(new Date(e.ts)) === dayKey());
  const mood: Mood = answer ? "happy" : profile.sentiment7 != null && profile.sentiment7 < -0.2 ? "concerned" : doneToday ? "happy" : "calm";
  const save = () => {
    if (!text.trim()) return;
    const r = reply(text, profile, text + dayKey());
    j.addUser(text, "journal", { prompt: prompt.text }); game.earn("journal");
    r.messages.forEach(m => j.addFriend(m)); setAnswer(r.messages); setText("");
  };
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <Companion mood={mood} size={170} />
        {!settings.name ? (
          <div className="glass mx-auto mt-4 max-w-sm space-y-3 rounded-3xl p-4">
            <p className="font-display text-3xl">Hi. I am Tune.</p>
            <p className="text-sm text-muted-foreground">I will keep you company, listen, and learn how you work so your readiness checks get more accurate. What should I call you?</p>
            <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Your name" value={nameDraft} onChange={e => setNameDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && nameDraft.trim() && j.set({ name: nameDraft.trim() })} />
            <Button variant="hero" className="w-full rounded-2xl" disabled={!nameDraft.trim()} onClick={() => j.set({ name: nameDraft.trim() })}>Nice to meet you</Button>
          </div>
        ) : <p className="mx-auto mt-4 max-w-md font-display text-3xl leading-snug">{greeting(settings.name, profile)}</p>}
      </div>

      {settings.name && (<>
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2"><Flame className="h-4 w-4" style={{ color: "hsl(var(--f-primode))" }} /><b>{game.g.streak.current}</b> day streak</span>
          <span className="glass flex items-center gap-1.5 rounded-full px-4 py-2"><Sparkles className="h-4 w-4 text-primary" /><b>{game.g.sparks}</b> sparks</span>
          {boxReady && <button onClick={game.openBox} className="glass flex animate-breathe items-center gap-1.5 rounded-full px-4 py-2 text-primary"><Gift className="h-4 w-4" />Open spark box</button>}
        </div>
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
          {answer ? (
            <div className="mt-4 space-y-2">{answer.map((m, i) => <div key={i} className="w-fit max-w-[90%] rounded-2xl rounded-tl-sm bg-primary/15 px-4 py-2.5 text-sm">{m}</div>)}
              <div className="flex gap-2 pt-2"><Button variant="hero" className="rounded-full" onClick={() => go("talk")}>Keep talking</Button><Button variant="ghost" className="rounded-full" onClick={() => setAnswer(null)}>Done</Button></div></div>
          ) : (<>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Write freely. Nobody else sees this." className="mt-4 w-full resize-none rounded-2xl border border-border bg-secondary/40 p-4 text-base outline-none focus:border-primary/60" />
            <Button variant="hero" size="lg" className="mt-3 h-12 w-full rounded-2xl" disabled={!text.trim()} onClick={save}><Check className="mr-2 h-4 w-4" />Save to journal</Button>
          </>)}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={() => go("talk")} className="glass rounded-3xl p-5 text-left transition hover:scale-[1.01]"><div className="font-display text-2xl">Talk to Tune</div><div className="text-sm text-muted-foreground">Vent, plan, or think out loud.</div></button>
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
      </>)}
    </div>
  );
}
