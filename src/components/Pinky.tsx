import { useState } from "react";
import { Check, Clock, DoorOpen, HeartHandshake, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr } from "@/i18n";
import { Avatar } from "@/components/Avatar";
import { CUES, TINY, keptTogether, myState, timeLeft, windowEnd, type Pact, type PinkyEvt, type PinkyMode, type WindowChoice } from "@/engine/pinky";
import type { Friend } from "@/store/usePeople";

const clean = (s: string) => s.trim().replace(/[.\s]+$/, "");
const lc = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`;
const MODES: [PinkyMode, string, string][] = [["side", "Side by side", "Each of you promises your own tiny thing."], ["same", "Same thing", "You both do the same thing."], ["cheer", "Cheer for me", "Only I promise. You cheer me on."]];
const WINDOWS: [WindowChoice, string][] = [["tonight", "Tonight"], ["day", "Within 24 hours"], ["tomorrow", "Tomorrow evening"]];

/** Builds the if-then promise. Tiny on purpose: the hint asks if it could start in 2 minutes. */
export function PinkyForm({ first, onSend, onClose }: { first: string; onSend: (e: PinkyEvt, remind: boolean) => Promise<void>; onClose: () => void }) {
  const [cue, setCue] = useState(""); const [act, setAct] = useState(""); const [win, setWin] = useState<WindowChoice>("day"); const [mode, setMode] = useState<PinkyMode>("side"); const [remind, setRemind] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const ready = clean(cue).length > 1 && clean(act).length > 1;
  const send = async () => { if (!ready || busy) return; setBusy(true); setErr(""); try { await onSend({ id: crypto.randomUUID(), op: "make", mode, text: tr("When {cue}, I will {act}.").replace("{cue}", lc(clean(cue))).replace("{act}", lc(clean(act))).slice(0, 160), end: windowEnd(win) }, remind); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-background p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold"><HeartHandshake className="h-4 w-4 text-primary" />A Pinky with {first}</div>
      <p className="text-muted-foreground">A tiny promise you both can see. If time runs out, nothing is lost. You can keep it, shrink it, or let it go.</p>
      <div className="space-y-2"><label className="font-medium" htmlFor="pk-cue">When...</label>
        <input id="pk-cue" value={cue} onChange={e => setCue(e.target.value)} maxLength={60} placeholder="I get home" translate="no" dir="auto" className="h-11 w-full rounded-2xl bg-secondary/60 px-3 outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex flex-wrap gap-1.5">{CUES.map(c => <button key={c} type="button" onClick={() => setCue(tr(c))} className={chip(cue === tr(c))}>{c}</button>)}</div></div>
      <div className="space-y-2"><label className="font-medium" htmlFor="pk-act">I will...</label>
        <input id="pk-act" value={act} onChange={e => setAct(e.target.value)} maxLength={80} placeholder="open my notes for 2 minutes" translate="no" dir="auto" className="h-11 w-full rounded-2xl bg-secondary/60 px-3 outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex flex-wrap gap-1.5">{TINY.map(t => <button key={t} type="button" onClick={() => setAct(tr(t))} className={chip(act === tr(t))}>{t}</button>)}</div>
        <p className="text-xs text-muted-foreground">Tiny enough to start in 2 minutes? Smaller is better.</p></div>
      <div className="space-y-2"><div className="font-medium">Within</div><div className="flex flex-wrap gap-1.5">{WINDOWS.map(([k, l]) => <button key={k} type="button" onClick={() => setWin(k)} className={chip(win === k)}>{l}</button>)}</div></div>
      <div className="space-y-2"><div className="font-medium">Kind</div><div className="flex flex-wrap gap-1.5">{MODES.map(([k, l]) => <button key={k} type="button" onClick={() => setMode(k)} className={chip(mode === k)}>{l}</button>)}</div><p className="text-xs text-muted-foreground">{MODES.find(m => m[0] === mode)![2]}</p></div>
      <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" checked={remind} onChange={e => setRemind(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />Remind me before the time runs out</label>
      {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2"><Button variant="hero" className="rounded-full" disabled={!ready || busy} onClick={send}><HeartHandshake className="mr-1 h-4 w-4" />Send Pinky</Button><Button variant="ghost" className="rounded-full" onClick={onClose}>Cancel</Button></div>
    </div>);
}

interface CardProps { pact: Pact; me: string; first: string; now: number; busy?: boolean;
  onJoin: (text: string) => void; onStart: (text: string) => void; onDone: () => void; onKeep: () => void; onSmaller: (text: string) => void; onLetGo: () => void; onCheer: () => void }
const STATUS: Record<string, string> = { done: "done", open: "open", rolled: "kept for later", letgo: "let go", join: "not yet", watching: "cheering" };

/** One Pinky inside the chat. Never says "failed" or "missed". */
export function PinkyCard(p: CardProps) {
  const { pact, me, first, now } = p; const ms = myState(pact, me, now); const other = Object.keys(pact.parts).find(i => i !== me); const kept = keptTogether(pact);
  const [mine, setMine] = useState(""); const [shrink, setShrink] = useState(false);
  const left0 = timeLeft(pact.end, now); const lm = /^(\d+) (min|h) left$/.exec(left0); const left = lm ? tr(lm[2] === "min" ? "{n} min left" : "{n} h left").replace("{n}", lm[1]) : left0 ? tr(left0) : ""; const mineText = pact.parts[me]?.text; const theirs = other ? pact.parts[other] : undefined;
  const theirState = !theirs ? (pact.mode === "cheer" ? "" : "not yet") : theirs.doneAt ? "done" : theirs.letGo ? "let go" : now > pact.end ? "kept for later" : "open";
  const Row = ({ who, text, state }: { who: string; text?: string; state: string }) => (
    <div className="flex items-start gap-2 py-1"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${state === "done" ? "bg-primary text-primary-foreground" : "border border-current opacity-60"}`}>{state === "done" ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}</span>
      <div className="min-w-0"><div className="text-xs opacity-80">{who} · {state}</div>{text && <div className="text-sm" translate="no" dir="auto">{text}</div>}</div></div>);
  return (
    <div className="min-w-[15rem] max-w-full">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] opacity-80"><HeartHandshake className="h-3.5 w-3.5" />Pinky{pact.mode === "same" ? " · same thing" : pact.mode === "cheer" ? " · cheering" : ""}{!kept && left && (ms === "open" || ms === "join" || ms === "watching") && <span className="ms-auto normal-case tracking-normal">{left}</span>}</div>
      <div className="mt-1"><Row who={tr("You")} text={mineText} state={mineText ? STATUS[ms] : "not yet"} />
        {(other || pact.mode !== "cheer") && <Row who={first} text={theirs?.text} state={theirState} />}
        {pact.mode === "cheer" && me !== pact.creator && <Row who={first} text={pact.parts[pact.creator]?.text} state={pact.parts[pact.creator]?.doneAt ? "done" : "open"} />}</div>
      {kept && <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-4 w-4" />Kept together</div>}
      {!kept && ms === "join" && (pact.mode === "same"
        ? <Button size="sm" variant="hero" className="mt-2 rounded-full" disabled={p.busy} onClick={() => p.onJoin("")}>I am in</Button>
        : <div className="mt-2 space-y-2"><input value={mine} onChange={e => setMine(e.target.value)} maxLength={140} aria-label="Your own tiny promise" placeholder="When..., I will..." translate="no" dir="auto" className="h-10 w-full rounded-2xl bg-background/80 px-3 text-sm text-foreground outline-none" />
            <div className="flex flex-wrap gap-1.5">{TINY.slice(0, 3).map(t => <button key={t} type="button" onClick={() => setMine(tr("When {cue}, I will {act}.").replace("{cue}", tr("I have a minute")).replace("{act}", tr(t)))} className="rounded-full border border-current/30 px-2.5 py-1 text-xs opacity-90">{t}</button>)}</div>
            <Button size="sm" variant="hero" className="rounded-full" disabled={!mine.trim() || p.busy} onClick={() => p.onJoin(mine.trim())}>Make mine</Button></div>)}
      {!kept && ms === "watching" && <Button size="sm" variant="hero" className="mt-2 rounded-full" disabled={p.busy} onClick={p.onCheer}>Cheer them on</Button>}
      {!kept && ms === "open" && <div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="hero" className="rounded-full" disabled={p.busy} onClick={() => p.onStart(mineText!)}><Play className="mr-1 h-3.5 w-3.5" />Start 2 min</Button><Button size="sm" variant="outline" className="rounded-full bg-transparent" disabled={p.busy} onClick={p.onDone}>Done</Button></div>}
      {!kept && ms === "rolled" && !shrink && <div className="mt-2 space-y-1.5"><div className="text-sm opacity-90">Time ran out. No problem.</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="hero" className="rounded-full" disabled={p.busy} onClick={p.onKeep}>Keep for tomorrow</Button>{pact.mode !== "same" && <Button size="sm" variant="outline" className="rounded-full bg-transparent" onClick={() => { setMine(mineText ?? ""); setShrink(true); }}>Make it smaller</Button>}<Button size="sm" variant="ghost" className="rounded-full" disabled={p.busy} onClick={p.onLetGo}>Let it go</Button></div></div>}
      {!kept && ms === "rolled" && shrink && <div className="mt-2 space-y-2"><input value={mine} onChange={e => setMine(e.target.value)} maxLength={140} aria-label="A smaller promise" translate="no" dir="auto" className="h-10 w-full rounded-2xl bg-background/80 px-3 text-sm text-foreground outline-none" /><div className="flex flex-wrap gap-2"><Button size="sm" variant="hero" className="rounded-full" disabled={!mine.trim() || p.busy} onClick={() => { p.onSmaller(mine.trim()); setShrink(false); }}>Save smaller</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={() => setShrink(false)}>Back</Button></div></div>}
      {!kept && ms === "done" && <div className="mt-2 text-sm opacity-90">You kept yours.{theirState === "open" ? " " + tr("Waiting for {name}, no rush.").replace("{name}", first) : theirState === "not yet" ? " " + tr("{name} has not made theirs yet.").replace("{name}", first) : ""}</div>}
      {!kept && ms === "letgo" && <div className="mt-2 text-sm opacity-90">You let this one go. That is okay.</div>}
    </div>);
}

/** The daily door on Today. It opens after you have shown up, once a day, at the time you prefer. */
export function PinkyDoor({ friends, onPick, onHide, when, setWhen }: { friends: Friend[]; onPick: (id: string) => void; onHide: () => void; when: "morning" | "evening" | "any"; setWhen: (w: "morning" | "evening" | "any") => void }) {
  const [opts, setOpts] = useState(false);
  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground"><DoorOpen className="h-4 w-4" />The Pinky door is open</div>
      <p className="mt-1 text-lg font-semibold">What tiny thing will you start next, together?</p>
      <p className="text-sm text-muted-foreground">Make a small promise with a friend. If time runs out, nothing is lost.</p>
      <div className="mt-3 flex flex-wrap gap-2">{friends.slice(0, 4).map(f => <button key={f.id} onClick={() => onPick(f.id)} className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm"><Avatar spec={f.avatar} size={28} /><span translate="no">{f.name.split(" ")[0]}</span></button>)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <button className="-m-2 p-2 hover:text-foreground" onClick={onHide}>Not today</button>
        <button className="-m-2 p-2 hover:text-foreground" onClick={() => setOpts(o => !o)} aria-expanded={opts}>When should the door open?</button></div>
      {opts && <div className="mt-2 flex flex-wrap gap-1.5">{(["morning", "evening", "any"] as const).map(w => <button key={w} onClick={() => setWhen(w)} className={chip(when === w)}>{w === "any" ? "Any time" : w === "morning" ? "Morning" : "Evening"}</button>)}</div>}
    </div>);
}
