import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CUES, MOODS, TACTICS, loadCoach, logCoach, tacticFor, type Friction, type Mood } from "@/engine/coach";
import { SAFETY_TEXT, openingLine, read, type Intent } from "@/engine/coachNlu";
import { loadLog } from "@/lib/startlog";
import { proof } from "@/engine/proof";
import { suggestSteps } from "@/engine/plan";

const LABEL: Record<string, string> = { ...Object.fromEntries(TACTICS.map(t => [t.id, t.label])), feeling: "I am feeling something", ready: "I am ready, just give me a step" };

/** A slow minute: in for 4, out for 6. */
function Breathe({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(x => x + 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (t >= 60) onDone(); }, [t, onDone]);
  const c = t % 10, inhale = c < 4;
  return (
    <div className="text-center">
      <div className="mx-auto my-4 flex h-32 w-32 items-center justify-center rounded-full bg-primary/20 text-sm transition-transform ease-in-out" style={{ transform: `scale(${inhale ? 1.25 : 0.85})`, transitionDuration: inhale ? "4s" : "6s" }}>{inhale ? "Breathe in" : "Out, slowly"}</div>
      <div className="text-xs text-muted-foreground">{Math.max(0, 60 - t)} seconds</div>
      <button onClick={onDone} className="mt-3 text-sm text-muted-foreground underline">Skip</button>
    </div>);
}
/** A one-minute reset that matches the feeling you named. */
function MoodReset({ mood, onDone }: { mood: Mood; onDone: () => void }) {
  const m = MOODS.find(x => x.id === mood)!; const [t, setT] = useState(0);
  useEffect(() => { const i = setInterval(() => setT(x => x + 1), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { if (t >= 60) onDone(); }, [t, onDone]);
  if (mood === "anxious") return <Breathe onDone={onDone} />;
  const cur = [...m.steps].reverse().find(s => t >= s.at) ?? m.steps[0];
  return (
    <div className="text-center">
      <div className="mx-auto my-4 flex min-h-[7rem] max-w-xs items-center justify-center rounded-3xl bg-primary/15 p-5 text-lg leading-snug" aria-live="polite">{cur.text}</div>
      <div className="text-xs text-muted-foreground">{Math.max(0, 60 - t)} seconds</div>
      <button onClick={onDone} className="mt-3 text-sm text-muted-foreground underline">Skip</button>
    </div>);
}

type Phase = "pick" | "do" | "mood" | "plan";
/** "Why is this hard?" in a few taps: say it or tap it, one small move that fits, then an if-then plan and an optional friend pledge. */
export function CoachSheet({ task, onStart, onClose, friends = [], onPledge }: { task: string; onStart: (title: string, step: string) => void; onClose: () => void; friends?: { id: string; name: string }[]; onPledge?: (friendId: string) => void }) {
  const [f, setF] = useState<Friction | null>(null); const [mood, setMood] = useState<Mood | null>(null); const [ans, setAns] = useState(""); const [phase, setPhase] = useState<Phase>("pick"); const [cue, setCue] = useState("Now"); const [resetDone, setResetDone] = useState(false);
  const [showAll, setShowAll] = useState(false); const [showMoods, setShowMoods] = useState(false); const [free, setFree] = useState(""); const [rd, setRd] = useState<Awaited<ReturnType<typeof read>> | null>(null); const [line, setLine] = useState("");
  const pr = (() => { try { return proof(loadLog(), loadCoach().events); } catch { return null; } })();
  const usual = (() => { try { const ev = loadCoach().events; return [...TACTICS].map((t, i) => ({ t, i, n: ev.filter(e => e.friction === t.id).length })).sort((a, b) => b.n - a.n || a.i - b.i).map(x => x.t); } catch { return TACTICS; } })();
  const tac = f ? tacticFor(f) : null; const defaultStep = suggestSteps(task)[0]?.text ?? "Open it and look at it";
  const built = tac ? tac.build(task, ans) : { step: defaultStep, line: "Small and real." };
  const choose = (i: Intent) => {
    setRd(null); if (i === "other") return;
    if (i === "feeling") { setLine("Which feeling is closest? Tap one below."); setF(null); return; }
    if (i === "ready") { setF(null); setMood(null); setPhase("plan"); return; }
    setLine(openingLine(i)); setF(i); setAns(""); setResetDone(false); setPhase("do");
  };
  const ask = async () => { const r = await read(free); setRd(r); setLine(!r.safety && (r.top.length === 0 || r.top[0].intent === "other") ? "I did not quite catch that. Tell me a bit more, or tap the closest one below." : ""); };
  const go = () => { logCoach({ ts: Date.now(), task, friction: f ?? "unclear", cue }, built.step); onClose(); if (cue === "Now") onStart(task, built.step); };
  const back = () => { if (phase === "plan") setPhase(f ? "do" : mood ? "mood" : "pick"); else setPhase("pick"); };
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-3 backdrop-blur sm:items-center" role="dialog" aria-label="Get unstuck">
      <div className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          {phase !== "pick" ? <button aria-label="Back" onClick={back} className="rounded-full p-1.5 text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button> : <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Get unstuck</span>}
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 truncate text-sm text-muted-foreground">{task}</div>

        {phase === "pick" && (<>
          <h2 className="text-2xl leading-snug">What is the hard part?</h2>
          {pr && pr.starts > 0 && <p className="mt-2 rounded-2xl bg-primary/10 px-3 py-2 text-sm">You have started {pr.starts} {pr.starts === 1 ? "time" : "times"} before{pr.hardDays > 0 ? `, ${pr.hardDays} of those on hard days` : ""}. You can do this.</p>}
          <div className="mt-3 flex gap-2"><input value={free} onChange={e => setFree(e.target.value)} onKeyDown={e => e.key === "Enter" && free.trim() && ask()} maxLength={160} placeholder="Say it in your own words" aria-label="Say it in your own words" className="h-11 min-w-0 flex-1 rounded-2xl border border-border bg-secondary/40 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /><button disabled={!free.trim()} onClick={ask} className="rounded-full bg-primary px-4 text-sm text-primary-foreground disabled:opacity-40">Go</button></div>
          {rd?.safety && <div className="mt-3 rounded-2xl border border-border bg-secondary/50 p-3 text-sm" role="alert">{SAFETY_TEXT}</div>}
          {rd && !rd.safety && rd.top.length > 0 && rd.top[0].intent !== "other" && <div className="mt-3 rounded-2xl bg-secondary/50 p-3 text-sm"><div className="mb-2 text-muted-foreground">{rd.confident ? "That sounds like:" : "That could be either of these:"}</div><div className="flex flex-col gap-2">{rd.top.slice(0, rd.confident ? 1 : 2).map(t => <button key={t.intent} onClick={() => choose(t.intent)} className="rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2 text-start hover:bg-primary/20">{LABEL[t.intent]}</button>)}</div><div className="mt-2 text-xs text-muted-foreground">Not right? Tap another below.</div></div>}
          {line && !rd?.safety && <p className="mt-3 text-sm text-muted-foreground">{line}</p>}
          <div className="mt-4 space-y-2">{(showAll ? usual : usual.slice(0, 3)).map(t => <button key={t.id} onClick={() => { setF(t.id); setAns(""); setResetDone(false); setLine(""); setRd(null); setPhase("do"); }} className="w-full rounded-2xl border border-border px-4 py-3 text-start text-[15px] transition hover:border-primary hover:bg-primary/5">{t.label}</button>)}</div>
          {!showAll && <button onClick={() => setShowAll(true)} className="mt-2 text-sm text-primary underline-offset-4 hover:underline">Something else ({usual.length - 3} more)</button>}
          {!showMoods ? <button onClick={() => setShowMoods(true)} className="mt-3 block text-sm text-muted-foreground underline-offset-4 hover:underline">Or name a feeling instead</button> : <><div className="mt-4 text-sm font-medium">How do you feel right now?</div>
          <div className="mt-2 flex flex-wrap gap-2">{MOODS.map(m => <button key={m.id} onClick={() => { setMood(m.id); setF(null); setResetDone(false); setRd(null); setLine(""); setPhase("mood"); }} className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground">{m.label}</button>)}</div></>}
          <p className="mt-3 text-xs text-muted-foreground">No wrong answer. This stays on your device. If things ever feel unsafe, findahelpline.com lists free lines by country.</p>
        </>)}

        {phase === "mood" && mood && (() => { const m = MOODS.find(x => x.id === mood)!; return (<>
          <h2 className="text-2xl leading-snug">One minute for that</h2>
          <p className="mt-1 text-sm text-muted-foreground">{m.label}. Naming it is already a step.</p>
          {!resetDone ? <MoodReset mood={mood} onDone={() => setResetDone(true)} /> : <div className="mt-4"><div className="rounded-2xl bg-primary/10 p-3 text-sm">Good. Now one tiny thing: <b>{defaultStep}</b></div></div>}
          <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Why this helps <span className="ml-1 rounded-full bg-foreground/[.07] px-2 py-0.5 text-[10px]">Exploratory</span></summary><p className="mt-2">{m.idea}</p></details>
          <Button variant="hero" className="mt-4 h-12 w-full rounded-2xl" disabled={!resetDone} onClick={() => setPhase("plan")}>Next</Button>
          <button onClick={onClose} className="mt-2 w-full text-center text-sm text-muted-foreground">Rest is okay too. No shame.</button>
        </>); })()}

        {phase === "do" && tac && (<>
          <h2 className="text-2xl leading-snug">{tac.name}</h2>
          {line && <p className="mt-1 text-sm text-muted-foreground">{line}</p>}
          {tac.reset && !resetDone && <><p className="mt-2 text-sm">Take one slow minute first.</p><Breathe onDone={() => setResetDone(true)} /></>}
          {(!tac.reset || resetDone) && <>
            {tac.ask && <div className="mt-3"><div className="mb-2 text-sm">{tac.ask.q}</div>
              {tac.ask.chips && <div className="mb-2 flex flex-wrap gap-2">{tac.ask.chips.map(c => <button key={c} onClick={() => setAns(c)} className={`rounded-full border px-3 py-1.5 text-sm ${ans === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{c}</button>)}</div>}
              {tac.id === "big" && <div className="mb-2 flex flex-wrap gap-2">{suggestSteps(task).slice(0, 3).map(s => <button key={s.id} onClick={() => setAns(s.text)} className={`rounded-full border px-3 py-1.5 text-sm ${ans === s.text ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{s.text}</button>)}</div>}
              {(tac.ask.ph || tac.id === "big") && <input value={ans} onChange={e => setAns(e.target.value)} placeholder={tac.ask.ph || "Or write your own"} maxLength={120} className="h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3 outline-none focus:ring-2 focus:ring-primary/30" />}</div>}
            <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm"><div className="text-xs uppercase tracking-[0.15em] text-primary">Your first step</div><div className="mt-0.5 font-medium">{built.step}</div><div className="mt-1 text-muted-foreground">{built.line}</div></div>
            <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Why this helps <span className="ml-1 rounded-full bg-foreground/[.07] px-2 py-0.5 text-[10px]">{tac.strength}</span></summary><p className="mt-2">{tac.idea}</p></details>
            <Button variant="hero" className="mt-4 h-12 w-full rounded-2xl" onClick={() => setPhase("plan")}>Next</Button>
            {tac.id === "tired" && <button onClick={onClose} className="mt-2 w-full text-center text-sm text-muted-foreground">Rest is okay too. No shame.</button>}
          </>}
        </>)}

        {phase === "plan" && (<>
          <h2 className="text-2xl leading-snug">When will you do it?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Pick a moment you already have. "When ___, I will ___" works better than "I will try".</p>
          <div className="mt-3 flex flex-wrap gap-2">{CUES.map(c => <button key={c} onClick={() => setCue(c)} className={`rounded-full border px-3 py-1.5 text-sm ${cue === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{c === "Now" ? "Right now" : c}</button>)}</div>
          <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm">{cue === "Now" ? <>Starting now: <b>{built.step}</b></> : <>When <b>{cue}</b>, I will <b>{built.step.toLowerCase()}</b>.</>}</div>
          <Button variant="hero" className="mt-4 h-12 w-full rounded-2xl" onClick={go}>{cue === "Now" ? "Start for 2 minutes" : "Save my plan"}</Button>
          {friends.length > 0 && onPledge && <div className="mt-4 rounded-2xl border border-border p-3 text-sm"><div className="font-medium">Tell a friend? A soft pledge.</div><div className="mb-2 text-xs text-muted-foreground">No pressure. If time runs out, nothing is lost.</div>
            <div className="flex flex-wrap gap-2">{friends.slice(0, 3).map(fr => <button key={fr.id} onClick={() => { sessionStorage.setItem("lagomo.pinky.prefill", JSON.stringify({ cue: cue === "Now" ? "I sit down to start" : cue, act: built.step.toLowerCase().slice(0, 80) })); logCoach({ ts: Date.now(), task, friction: f ?? "unclear", cue }, built.step); onClose(); onPledge(fr.id); }} className="rounded-full border border-primary/40 px-3 py-1.5 text-primary hover:bg-primary/10">Tell {fr.name.split(" ")[0]}</button>)}</div></div>}
        </>)}
      </div>
    </div>, document.body);
}
