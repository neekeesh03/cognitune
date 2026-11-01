import { useEffect, useMemo, useState } from "react";
import { VoiceButton } from "@/components/VoiceButton";
import { Check, ChevronDown, Gift, Play, RefreshCw, Users, CalendarCheck, PenLine } from "lucide-react";
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
import { FreshStart } from "@/components/FreshStart";
import { freshToday } from "@/engine/fresh";
import { RabbitRoamer } from "@/components/RabbitRoamer";
import { CoachHero } from "@/components/CoachHero";
import { NextMove, type Move } from "@/components/NextMove";
import { MomentumRing } from "@/components/MomentumRing";
import { useDrive } from "@/lib/useDrive";
import { CoachSheet } from "@/components/CoachSheet";
import { clearParked, coachEvent, loadCoach } from "@/engine/coach";
import { clearTomorrow, comeback, stage, tomorrowStep } from "@/engine/director";
import { directorOn } from "@/lib/arm";
import { DriveCard } from "@/components/DriveCard";
import type { Inputs } from "@/engine/model";
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

export function TodayHome({ j, name, avatar, go, game, plan, agenda, onStart, onStartBlock, onPinky, friends, hops, burrow, username, sliders }: { sliders?: Inputs | null; j: JournalApi; name: string; avatar: AvatarSpec; go: (t: string) => void; game: GameApi; plan: PlanApi; agenda: CalItem[]; onStart: (title: string, step: string) => void; onStartBlock?: (b: Block) => void; onPinky?: (friendId: string) => void; friends: Friend[]; hops: HopsApi; burrow: BurrowApi; username: string }) {
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
  const rabbitLine = cheerNow ? `${(cheerer?.name ?? "A friend").split(" ")[0]} sent you ${cheerNow.e}` : mood === "curious" && waiting ? `${waiting.name.split(" ")[0]} started. Join them?` : idle >= 1 && !game.g.todayActive ? `Welcome back. ${friends.filter(f => hops.hops[f.id] && new Date(hops.hops[f.id]).toDateString() === new Date().toDateString()).length > 0 ? "Some of your friends started today." : "No rush. Ready when you are."}` : undefined;
  const freshLabel = freshToday(nowD); const banner = started && idle >= 5 && !backGone ? "back" : started && (monday || first || !!freshLabel) && !freshGone ? "fresh" : "";
  const dismissBanner = () => { if (banner === "back") setBackGone(true); else { localStorage.setItem(freshKey, "1"); setFreshGone(true); } };
  const focusStart = () => { dismissBanner(); (document.querySelector('[aria-label="What are you putting off"]') as HTMLInputElement | null)?.focus(); };
  const dueSoon = plan.tasks.filter(t => !t.doneAt && t.due && dueDays(t.due) <= 7).sort((x, y) => dueDays(x.due) - dueDays(y.due)).slice(0, 3);
  const dateNow = plan.blocks.filter(b => b.date && b.day === dkey() && !b.done).map(b => ({ b, mins: b.start - (new Date().getHours() * 60 + new Date().getMinutes()) })).filter(x => x.mins <= 15 && x.mins >= -x.b.dur).sort((a, c) => a.mins - c.mins)[0];
  const [coach, setCoach] = useState<string | null>(null); const [cs, setCs] = useState(loadCoach);
  useEffect(() => { const f = () => setCs(loadCoach()); window.addEventListener(coachEvent, f); return () => window.removeEventListener(coachEvent, f); }, []);
  const parked = cs.parked.filter(p => Date.now() - p.ts < 4 * 864e5).sort((a, b) => b.ts - a.ts)[0]; const myPlan = cs.plan && Date.now() - cs.plan.ts < 36e5 * 36 && cs.plan.cue !== "Now" ? cs.plan : null;
  const firstRun = !started; const deep = started; const [more, setMore] = useState(false); const streak = game.g.streak.current;

  const friendsStartedN = friends.filter(f => hops.hops[f.id] && new Date(hops.hops[f.id]).toDateString() === new Date().toDateString()).length;
  const drive = useDrive(plan.tasks, friendsStartedN, sliders ?? null, friends.length > 0);
  const examTask = plan.tasks.filter(t => !t.doneAt && t.due && /exam|test|quiz|final|midterm|viva|assessment/i.test(t.title) && dueDays(t.due) >= 0).sort((a, b) => dueDays(a.due) - dueDays(b.due))[0];
  const focusInput = () => (document.querySelector('[aria-label="What are you putting off"]') as HTMLInputElement | null)?.focus();
  const moves: Move[] = [];
  const tmr = tomorrowStep(); const cb = comeback();
  // Temptation bundling (Milkman 2014): tie a treat you chose to the start. Rotates daily because the effect fades if it never changes.
  const rw = game.g.rewards; const pair = rw.length ? ` Pair it with ${rw[new Date().getDate() % rw.length].name.replace(/^./, c => c.toLowerCase())}.` : "";
  if (tmr) moves.push({ key: "tmr", kicker: "Saved for you", title: tmr.task, sub: `Your first step is ready. You usually start around ${tmr.hour % 12 || 12}${tmr.hour < 12 ? "am" : "pm"}.${pair}`, cta: "Start 2 min", onClick: () => { clearTomorrow(); onStart(tmr.task, tmr.step ?? "Open it and look at it for two minutes."); } });
  else if (cb) moves.push({ key: "cb", kicker: "Welcome back", title: cb.task, sub: `No catching up. Just one small minute.${pair}`, cta: "Start", onClick: () => onStart(cb.task, "Open it and look at it for one minute.") });
  if (dateNow && onStartBlock) moves.push({ key: "date", kicker: "Study date", title: dateNow.b.title, sub: `With ${dateNow.b.date!.name.split(" ")[0]} · ${dateNow.mins > 0 ? `starts in ${dateNow.mins} min` : "happening now"}`, cta: "Open quiet room", onClick: () => onStartBlock(dateNow.b) });
  if (myPlan) moves.push({ key: "plan", kicker: "Your plan", title: `When ${myPlan.cue}, I will ${myPlan.step.toLowerCase()}`, cta: "Do it now", onClick: () => onStart(myPlan.task, myPlan.step) });
  if (examTask) { const d = dueDays(examTask.due); moves.push({ key: "exam", kicker: d === 0 ? "Exam today" : `Exam in ${d} ${d === 1 ? "day" : "days"}`, title: examTask.title, sub: d <= 3 ? "Short and steady beats a big push." : "A small slice now beats a big push later.", cta: "Study 2 min", onClick: () => onStart(examTask.title, examTask.steps.find(s => !s.done)?.text ?? "Open your notes and read the first page.") }); }
  if (parked) moves.push({ key: "parked", kicker: "Pick up where you left off", title: parked.task, sub: parked.note, cta: "Start 2 min", onClick: () => { clearParked(parked.task); onStart(parked.task, parked.note); } });
  if (waiting) moves.push({ key: "friend", kicker: "A friend started", title: `${waiting.name.split(" ")[0]} started ${agoMin(hops.hops[waiting.id])}`, sub: "Start something small too?", cta: "Join", onClick: focusInput });
  dueSoon.slice(0, 2).forEach(t => moves.push({ key: "due" + t.id, kicker: "Due soon", title: t.title, sub: dueText(t.due), cta: "Start 2 min", onClick: () => onStart(t.title, t.steps.find(x => !x.done)?.text ?? "Open it and look at it for two minutes.") }));
  if (nextBlock && onStartBlock) moves.push({ key: "block", kicker: "Up next", title: nextBlock.title, sub: `${fmtTime(nextBlock.start)} · ${nextBlock.dur} min`, cta: "Start now", onClick: () => onStartBlock(nextBlock) });
  else if (nextStep) moves.push({ key: "step", kicker: "Up next", title: nextStep.s.text, sub: nextStep.t.title, cta: "Start 2 min", onClick: () => onStart(nextStep.t.title, nextStep.s.text) });
  // Endowed progress (Nunes & Dreze 2006): in the first week the ring starts with one step already earned, and the reason is honest: you showed up.
  const endow = directorOn() && stage() === "new";
  const ringSteps = [endow ? { label: "Showed up", done: true } : { label: "Check in", done: !!drive.check }, { label: "Start", done: drive.startedToday || game.g.todayActive }, { label: "Wrap up", done: drive.wrappedToday || doneToday }];
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-4 lg:grid lg:max-w-5xl lg:grid-cols-5 lg:items-start lg:gap-x-6 lg:gap-y-4 lg:space-y-0">
      <div className="flex flex-wrap items-end justify-between gap-2 lg:col-span-5">
        <div><p className="font-display text-3xl leading-tight">{hello}</p><p className="text-sm text-muted-foreground">{firstRun ? "Start what you are putting off. Two minutes, and a friend sees you begin." : cue ? `Your plan: ${cue.label.toLowerCase()}.` : planned ? `You planned to start ${planned}.` : "One start is enough for today."}</p></div>
        {!calm && streak > 0 && <button onClick={() => go("me")} className="rounded-full bg-secondary/70 px-3 py-1.5 text-sm hover:bg-secondary" aria-label={`${streak} days showing up`}>{streak} {streak === 1 ? "day" : "days"} in a row</button>}
      </div>
      <div className="space-y-4 lg:col-span-3">
        {banner && <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-4 text-sm" role="status"><div className="min-w-0 flex-1">{banner === "back" ? <><b>Welcome back, {name.split(" ")[0]}.</b> <span className="text-muted-foreground">Nothing is lost and nothing withered. One tiny start?</span></> : <><b>{freshLabel || (first ? "New month." : "New week.")}</b> <span className="text-muted-foreground">A fresh page. What will you start first?</span></>}</div><div className="flex shrink-0 items-center gap-2"><button onClick={focusStart} className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground">Pick one</button><button onClick={dismissBanner} className="text-xs text-muted-foreground hover:text-foreground">Not now</button></div></div>}
        <CoachHero drive={drive} suggestion={nextStep?.t.title ?? ""} onStart={onStart} onCoach={t => setCoach(t)} mood={mood} rabbitLine={rabbitLine} quiet={quietRabbit} />
        {coach && <CoachSheet task={coach} onStart={onStart} onClose={() => setCoach(null)} friends={friends.map(f => ({ id: f.id, name: f.name }))} onPledge={onPinky} />}
        {!firstRun && <NextMove moves={moves} />}
        {!firstRun && <MomentumRing steps={ringSteps} boxReady={boxReady} onBox={game.openBox} />}
        <div className="grid grid-cols-3 gap-2" role="group" aria-label={tr("Quick links")}>
          {([["circle", "Start together", Users], ["plan", "Plan my day", CalendarCheck], ["me", "Write a line", PenLine]] as const).map(([id, label, I]) => (
            <button key={id} onClick={() => go(id)} className="glass flex items-center justify-center gap-2 rounded-2xl px-2 py-2.5 text-xs text-foreground transition hover:scale-[1.03]"><I className="h-4 w-4 text-primary" />{tr(label)}</button>))}
        </div>
      </div>
      <div className="space-y-4 lg:col-span-2">
        {firstRun && <HowItWorks />}
        {(!firstRun || friends.length > 0) && <FriendsHere friends={friends} hops={hops} burrow={burrow} username={username} onOpen={id => go("circle:" + id)} onQuestDone={f => { game.earn("buddy"); burst(); toast(`Quest done with ${f.name.split(" ")[0]}`, "You both started on 3 days this week. +12 sparks."); }} />}
        {!firstRun && <>
          <InstallNudge started={started} />
          <EveningWrap j={j} game={game} plan={plan} name={name} />
          {deep && <WeekDots g={game.g} name={name} avatar={avatar} />}
          {deep && <>
            <button onClick={() => setMore(m => !m)} aria-expanded={more} className="mx-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">{more ? "Less" : "More for today"}<ChevronDown className={`h-4 w-4 transition ${more ? "rotate-180" : ""}`} /></button>
            {more && <div className="space-y-5">
              <DriveCard tasks={plan.tasks} friendsStarted={friendsStartedN} hasFriends={friends.length > 0} sliders={sliders ?? null} onStart={onStart} openPattern={() => go("pattern")} />
              <NameCheck />
          <WeeklyLetter j={j} game={game} name={name} />
          <FreshStart />
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
              <StoryCard />
            </div>}
          </>}
        </>}
      </div>
      <RabbitRoamer />
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

