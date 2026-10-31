import { useEffect, useMemo, useState } from "react";
import { VoiceButton } from "@/components/VoiceButton";
import { Check, ChevronDown, Gift, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinkyDoor } from "@/components/Pinky";
import { Input } from "@/components/ui/input";
import { analyze } from "@/engine/text";
import { promptFor } from "@/engine/prompts";
import type { JournalApi } from "@/store/useJournal";
import { dayKey } from "@/store/useJournal";
import type { GameApi } from "@/store/useGame";
import type { PlanApi } from "@/store/usePlan";
import { dkey } from "@/engine/game";
import { dueDays, dueText, fmtTime, hasResources, type Block } from "@/engine/plan";
import { fmtClock, type CalItem } from "@/engine/calendar";
import { StartHero } from "@/components/StartHero";
import type { Mood } from "@/components/Rabbit";
import { FriendsHere } from "@/components/FriendsHere";
import { WeekDots } from "@/components/WeekDots";
import { StoryCard } from "@/components/StoryCard";
import { NameCheck } from "@/components/NameCheck";
import { GetStarted } from "@/components/GetStarted";
import { InstallNudge } from "@/components/InstallNudge";
import { EveningWrap } from "@/components/EveningWrap";
import { WeeklyLetter } from "@/components/WeeklyLetter";
import { Avatar } from "@/components/Avatar";
import { tr } from "@/i18n";
import { burst, toast } from "@/lib/fx";
import type { AvatarSpec } from "@/engine/avatar";
import type { BurrowApi } from "@/store/useBurrow";
import type { Friend } from "@/store/usePeople";
import type { HopsApi } from "@/store/useHops";

export function TodayTab({ j, name, avatar, go, game, plan, agenda, onStart, onStartBlock, onPinky, friends, hops, burrow, username }: { j: JournalApi; name: string; avatar: AvatarSpec; go: (t: string) => void; game: GameApi; plan: PlanApi; agenda: CalItem[]; onStart: (title: string, step: string) => void; onStartBlock?: (b: Block) => void; onPinky?: (friendId: string) => void; friends: Friend[]; hops: HopsApi; burrow: BurrowApi; username: string }) {
  const [calm, setCalm] = useState(() => !!localStorage.getItem("lagomo.calm")); const toggleCalm = () => { const v = !calm; setCalm(v); v ? localStorage.setItem("lagomo.calm", "1") : localStorage.removeItem("lagomo.calm"); };
  const started = !!localStorage.getItem("lagomo.firstStart") || (game.g.counts.started ?? 0) > 0;
  const planned = (() => { try { const p = JSON.parse(localStorage.getItem("lagomo.nexthop") || "null"); return p && Date.now() - p.ts < 36e5 * 30 ? String(p.w).toLowerCase() : ""; } catch { return ""; } })();
  const together = friends.filter(f => (burrow.pairs[f.id]?.both ?? 0) > 0).sort((a, b) => burrow.pairs[b.id].both - burrow.pairs[a.id].both).slice(0, 2);
  const nextBlock = plan.blocks.filter(b => b.day === dkey() && !b.done).sort((a, b) => a.start - b.start)[0];
  const nextStep = plan.tasks.filter(t => !t.doneAt).sort((a, b) => dueDays(a.due) - dueDays(b.due)).flatMap(t => t.steps.filter(s => !s.done).map(s => ({ s, t })))[0];
  const [doorWhen, setDoorWhen] = useState<"morning" | "evening" | "any">(() => (localStorage.getItem("lagomo.pinky.when") as "morning" | "evening" | "any") || "any"); const [doorHidden, setDoorHidden] = useState(() => localStorage.getItem("lagomo.pinky.hide") === dkey());
  const hr0 = new Date().getHours(); const inDoorWindow = doorWhen === "any" || (doorWhen === "morning" ? hr0 >= 5 && hr0 < 12 : hr0 >= 17);
  const showDoor = !!onPinky && friends.length > 0 && game.g.todayActive && inDoorWindow && !doorHidden;
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
  const hopRecent = friends.filter(f => hops.hops[f.id] && Date.now() - hops.hops[f.id] < 3 * 36e5).sort((a, b) => hops.hops[b.id] - hops.hops[a.id])[0];
  const waiting = hopRecent && !game.g.todayActive ? hopRecent : null; const agoMin = (ts: number) => { const m = Math.max(1, Math.round((Date.now() - ts) / 60000)); return m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago"; };
  const cue = (() => { try { return JSON.parse(localStorage.getItem("lagomo.cue") || "null") as { label: string } | null; } catch { return null; } })();
  const [idle] = useState(() => { const t = +(localStorage.getItem("lagomo.lastVisit") || 0); return t ? Math.floor((Date.now() - t) / 864e5) : 0; });
  useEffect(() => { localStorage.setItem("lagomo.lastVisit", String(Date.now())); }, []);
  const nowD = new Date(); const monday = nowD.getDay() === 1, first = nowD.getDate() === 1; const freshKey = "lagomo.fresh." + nowD.toISOString().slice(0, 10);
  const [freshGone, setFreshGone] = useState(() => !!localStorage.getItem(freshKey)); const [backGone, setBackGone] = useState(false);
  const [quietRabbit, setQuietRabbit] = useState(() => !!localStorage.getItem("lagomo.rabbit.quiet")); const toggleRabbit = () => { const v = !quietRabbit; setQuietRabbit(v); v ? localStorage.setItem("lagomo.rabbit.quiet", "1") : localStorage.removeItem("lagomo.rabbit.quiet"); };
  const cheerNow = hops.lastCheer && Date.now() - hops.lastCheer.ts < 10 * 60e3 ? hops.lastCheer : null; const cheerer = cheerNow ? friends.find(f => f.id === cheerNow.from) : undefined;
  const hr1 = new Date().getHours();
  const mood: Mood = cheerNow ? "cheering" : game.g.todayActive ? "proud" : idle >= 2 ? "cosy" : hr1 >= 22 || hr1 < 5 ? "sleepy" : waiting ? "curious" : "ready";
  const rabbitLine = cheerNow ? `${(cheerer?.name ?? "A friend").split(" ")[0]} sent you ${cheerNow.e}` : mood === "curious" && waiting ? `${waiting.name.split(" ")[0]} started. Join them?` : undefined;
  const banner = started && idle >= 5 && !backGone ? "back" : started && (monday || first) && !freshGone ? "fresh" : "";
  const dismissBanner = () => { if (banner === "back") setBackGone(true); else { localStorage.setItem(freshKey, "1"); setFreshGone(true); } };
  const focusStart = () => { dismissBanner(); (document.querySelector('[aria-label="What are you putting off"]') as HTMLInputElement | null)?.focus(); };
  const firstRun = !started; const [more, setMore] = useState(false); const streak = game.g.streak.current;
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6 lg:grid lg:max-w-6xl lg:grid-cols-5 lg:items-start lg:gap-x-8 lg:gap-y-6 lg:space-y-0">
      <div className="text-center lg:col-span-5"><p className="mx-auto max-w-md font-display text-3xl leading-snug">{hello}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground"><span>{firstRun ? "Start what you are putting off. Two minutes, and a friend sees you begin." : cue ? `Your plan: ${cue.label.toLowerCase()}.` : planned ? `You planned to start ${planned}.` : "One start is enough for today."}</span>
          {!calm && streak > 0 && <button onClick={() => go("me")} className="rounded-full bg-secondary/70 px-3 py-1 text-foreground hover:bg-secondary" aria-label={`${streak} days showing up`}>{streak} {streak === 1 ? "day" : "days"} in a row</button>}
          {!firstRun && boxReady && <button onClick={game.openBox} className="flex animate-breathe items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-primary"><Gift className="h-3.5 w-3.5" />Open spark box</button>}</div></div>
      <div className="space-y-5 lg:col-span-3">
        {banner && <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4 text-sm" role="status"><div className="min-w-0 flex-1">{banner === "back" ? <><b>Welcome back, {name.split(" ")[0]}.</b> <span className="text-muted-foreground">Nothing is lost and nothing withered. One tiny start?</span></> : <><b>{first ? "New month." : "New week."}</b> <span className="text-muted-foreground">A fresh page. What will you start first?</span></>}</div><div className="flex shrink-0 items-center gap-2"><button onClick={focusStart} className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground">Pick one</button><button onClick={dismissBanner} className="text-xs text-muted-foreground hover:text-foreground">Not now</button></div></div>}
        {waiting && <div className="glass flex items-center gap-3 rounded-3xl px-4 py-3 text-sm lg:hidden" role="status"><Avatar spec={waiting.avatar} size={36} /><div className="min-w-0 flex-1"><b translate="no">{waiting.name}</b> started {agoMin(hops.hops[waiting.id])}. <span className="text-muted-foreground">Start something small too?</span></div></div>}
        <StartHero suggestion={nextStep?.t.title ?? ""} onStart={onStart} mood={mood} rabbitLine={rabbitLine} quiet={quietRabbit} />
        <NameCheck />
      </div>
      <div className="space-y-5 lg:col-span-2">
        {firstRun && <HowItWorks />}
        {!firstRun && <FriendsHere friends={friends} hops={hops} burrow={burrow} username={username} onOpen={id => go("circle:" + id)} onQuestDone={f => { game.earn("buddy"); burst(); toast(`Quest done with ${f.name.split(" ")[0]}`, "You both started on 3 days this week. +12 sparks."); }} />}
        {!firstRun && (nextBlock || nextStep || agenda.length > 0) && (
          <div className="glass flex w-full items-center justify-between gap-3 rounded-3xl px-5 py-4 transition hover:scale-[1.01]">
            <button onClick={() => go("plan")} className="min-w-0 flex-1 text-start"><div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Up next</div>
              <div className="truncate text-lg font-semibold">{nextBlock ? nextBlock.title : nextStep ? nextStep.s.text : agenda[0]?.title}</div>
              <div className="truncate text-sm text-muted-foreground">{nextBlock ? `${fmtTime(nextBlock.start)} · ${nextBlock.dur} min${hasResources(nextBlock) ? " · resources attached" : ""}` : nextStep ? nextStep.t.title + (nextStep.t.due ? " · " + dueText(nextStep.t.due) : "") : agenda[0] ? (agenda[0].allDay ? "All day" : fmtClock(agenda[0].start)) : ""}{agenda.length > 1 ? ` · ${agenda.length} things today` : ""}</div>
            </button>
            {nextBlock && onStartBlock ? <button onClick={() => onStartBlock(nextBlock)} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"><Play className="h-3.5 w-3.5" />Start now</button> : <button onClick={() => go("plan")} className="shrink-0 text-sm text-primary">Open</button>}</div>)}

        {!firstRun && <>
        <InstallNudge started={started} />
        <EveningWrap j={j} game={game} plan={plan} name={name} />
        <WeekDots g={game.g} name={name} avatar={avatar} />
        <button onClick={() => setMore(m => !m)} aria-expanded={more} className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">{more ? "Less" : "More for today"}<ChevronDown className={`h-4 w-4 transition ${more ? "rotate-180" : ""}`} /></button>
        {more && <div className="space-y-5">
          <WeeklyLetter j={j} game={game} name={name} />
          <GetStarted username={username} friends={friends.length} started={started} />
          {showDoor && <PinkyDoor friends={friends} when={doorWhen} setWhen={w => { setDoorWhen(w); localStorage.setItem("lagomo.pinky.when", w); }} onHide={() => { localStorage.setItem("lagomo.pinky.hide", dkey()); setDoorHidden(true); }} onPick={id => onPinky!(id)} />}
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
            <div className="mt-3"><VoiceButton value={text} onChange={setText} /></div>
            <Button variant="hero" size="lg" className="mt-3 h-12 w-full rounded-2xl" disabled={!text.trim()} onClick={save}><Check className="mr-2 h-4 w-4" />Save to journal</Button>
          </>)}
        </div>)}

          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <button onClick={() => go("plan")} className="glass rounded-full px-4 py-2 hover:text-primary">Plan a tiny thing</button>
            <button onClick={() => go("checkin")} className="glass rounded-full px-4 py-2 hover:text-primary">Ready-to-start check</button>
            <button onClick={toggleCalm} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">{calm ? "Show streak" : "Hide streak"}</button>
            <button onClick={toggleRabbit} className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground">{quietRabbit ? "Rabbit can talk" : "Quiet rabbit"}</button>
          </div>
        {profile.openLoops.length > 0 && (
          <div className="glass rounded-3xl p-5">
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Things you mentioned</div>
            <div className="space-y-2">{profile.openLoops.slice(0, 3).map(l => (
              <div key={l.text + l.ts} className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[.05] p-3 text-sm"><span>{l.text}</span><button className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => j.resolve(l.text)}>Done</button></div>))}</div>
          </div>
        )}
        </div>}
        </>}
        {!firstRun && <StoryCard />}
      </div>
    </div>
  );
}

/** The first thing a new person sees besides Start: what this app is, in three plain steps. */
function HowItWorks() {
  const steps = ["Type one thing you are putting off.", "Do a two-minute first step. Just two minutes.", "A friend sees you started and can cheer you on."];
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 text-sm font-semibold">{tr("How Lagomo works")}</div>
      <ol className="space-y-3 text-sm">{steps.map((t, i) => <li key={t} className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{i + 1}</span><span className="pt-0.5">{tr(t)}</span></li>)}</ol>
    </div>);
}
