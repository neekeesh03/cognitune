import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CUES, TACTICS, logCoach, tacticFor, type Friction } from "@/engine/coach";
import { suggestSteps } from "@/engine/plan";

/** A slow minute: in for 4, out for 6. */
function Reset({ onDone }: { onDone: () => void }) {
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

/** "Why is this hard?" in three taps: the reason, one small move that fits it, then an if-then plan. */
export function CoachSheet({ task, onStart, onClose }: { task: string; onStart: (title: string, step: string) => void; onClose: () => void }) {
  const [f, setF] = useState<Friction | null>(null); const [ans, setAns] = useState(""); const [phase, setPhase] = useState<"pick" | "do" | "plan">("pick"); const [cue, setCue] = useState("Now"); const [resetDone, setResetDone] = useState(false);
  const tac = f ? tacticFor(f) : null; const built = tac ? tac.build(task, ans) : null;
  const canNext = !!tac && (!tac.reset || resetDone);
  const go = () => { if (!tac || !built) return; logCoach({ ts: Date.now(), task, friction: tac.id, cue }, built.step); onClose(); if (cue === "Now") onStart(task, built.step); };
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-3 backdrop-blur sm:items-center" role="dialog" aria-label="Get unstuck">
      <div className="glass max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl p-5 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          {phase !== "pick" ? <button aria-label="Back" onClick={() => setPhase(phase === "plan" ? "do" : "pick")} className="rounded-full p-1.5 text-muted-foreground"><ChevronLeft className="h-5 w-5" /></button> : <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Get unstuck</span>}
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-3 truncate text-sm text-muted-foreground">{task}</div>
        {phase === "pick" && (<>
          <h2 className="text-2xl leading-snug">What is the hard part?</h2>
          <div className="mt-4 space-y-2">{TACTICS.map(t => <button key={t.id} onClick={() => { setF(t.id); setAns(""); setResetDone(false); setPhase("do"); }} className="w-full rounded-2xl border border-border px-4 py-3 text-start text-[15px] transition hover:border-primary hover:bg-primary/5">{t.label}</button>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">No wrong answer. This stays on your device.</p>
        </>)}
        {phase === "do" && tac && built && (<>
          <h2 className="text-2xl leading-snug">{tac.name}</h2>
          {tac.reset && !resetDone && <><p className="mt-2 text-sm">Take one slow minute first.</p><Reset onDone={() => setResetDone(true)} /></>}
          {(!tac.reset || resetDone) && <>
            {tac.ask && <div className="mt-3"><div className="mb-2 text-sm">{tac.ask.q}</div>
              {tac.ask.chips && <div className="mb-2 flex flex-wrap gap-2">{tac.ask.chips.map(c => <button key={c} onClick={() => setAns(c)} className={`rounded-full border px-3 py-1.5 text-sm ${ans === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{c}</button>)}</div>}
              {tac.id === "big" && <div className="mb-2 flex flex-wrap gap-2">{suggestSteps(task).slice(0, 3).map(s => <button key={s.id} onClick={() => setAns(s.text)} className={`rounded-full border px-3 py-1.5 text-sm ${ans === s.text ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{s.text}</button>)}</div>}
              {(tac.ask.ph || tac.id === "big") && <input value={ans} onChange={e => setAns(e.target.value)} placeholder={tac.ask.ph || "Or write your own"} maxLength={120} className="h-11 w-full rounded-2xl border border-border bg-secondary/40 px-3 outline-none focus:ring-2 focus:ring-primary/30" />}</div>}
            <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm"><div className="text-xs uppercase tracking-[0.15em] text-primary">Your first step</div><div className="mt-0.5 font-medium">{built.step}</div><div className="mt-1 text-muted-foreground">{built.line}</div></div>
            <details className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Why this helps <span className="ml-1 rounded-full bg-foreground/[.07] px-2 py-0.5 text-[10px]">{tac.strength}</span></summary><p className="mt-2">{tac.idea}</p></details>
            <Button variant="hero" className="mt-4 h-12 w-full rounded-2xl" disabled={!canNext} onClick={() => setPhase("plan")}>Next</Button>
            {tac.id === "tired" && <button onClick={onClose} className="mt-2 w-full text-center text-sm text-muted-foreground">Rest is okay too. No shame.</button>}
          </>}
        </>)}
        {phase === "plan" && tac && built && (<>
          <h2 className="text-2xl leading-snug">When will you do it?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Pick a moment you already have. "When ___, I will ___" works better than "I will try".</p>
          <div className="mt-3 flex flex-wrap gap-2">{CUES.map(c => <button key={c} onClick={() => setCue(c)} className={`rounded-full border px-3 py-1.5 text-sm ${cue === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{c === "Now" ? "Right now" : c}</button>)}</div>
          <div className="mt-4 rounded-2xl bg-primary/10 p-3 text-sm">{cue === "Now" ? <>Starting now: <b>{built.step}</b></> : <>When <b>{cue}</b>, I will <b>{built.step.toLowerCase()}</b>.</>}</div>
          <Button variant="hero" className="mt-4 h-12 w-full rounded-2xl" onClick={go}>{cue === "Now" ? "Start for 2 minutes" : "Save my plan"}</Button>
        </>)}
      </div>
    </div>, document.body);
}
