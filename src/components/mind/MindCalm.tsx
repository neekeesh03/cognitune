import { useEffect, useRef, useState } from "react";
import { BREATHS, GROUND } from "@/engine/mind";
import { saveTomorrow } from "@/engine/director";
import { Card, Field, Help, Pills, Primary, Saved, Screen, type MindProps } from "@/components/mind/MindParts";

const mood = [1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Tense", "Uneasy", "Okay", "Calm", "Very calm"][n - 1] }));

/** Slow breathing with a pacing circle, plus a grounding list. */
export function Breathe({ update, done, back }: MindProps) {
  const [kind, setKind] = useState<"sigh" | "box">("sigh"); const [mins, setMins] = useState(2); const [run, setRun] = useState(false); const [left, setLeft] = useState(0);
  const [phase, setPhase] = useState(0); const [before, setBefore] = useState<number | null>(null); const [after, setAfter] = useState<number | null>(null); const [end, setEnd] = useState(false); const [g, setG] = useState(-1);
  const steps = BREATHS[kind].steps; const t0 = useRef(0);
  useEffect(() => {
    if (!run) return; t0.current = Date.now(); const total = mins * 60; setLeft(total);
    let idx = 0, tick = 0; setPhase(0);
    const id = window.setInterval(() => { tick += 1; if (tick >= steps[idx].s) { tick = 0; idx = (idx + 1) % steps.length; setPhase(idx); } const l = total - Math.floor((Date.now() - t0.current) / 1000); setLeft(Math.max(0, l)); if (l <= 0) { window.clearInterval(id); setRun(false); setEnd(true); } }, 1000);
    return () => window.clearInterval(id);
  }, [run, kind, mins]); // eslint-disable-line react-hooks/exhaustive-deps
  const grow = run && (steps[phase].t === "In" || steps[phase].t === "Top up"); const hold = run && steps[phase].t === "Hold";
  const save = () => { update(m => ({ ...m, calm: [...m.calm, { ts: Date.now(), kind, sec: mins * 60, before: before ?? undefined, after: after ?? undefined }] })); done("breathe"); back(); };
  return (
    <Screen title="Slow breathing" sub="Long exhales tell the body it is safe. Two minutes is enough." back={back} credit="Balban et al., Cell Reports Medicine 2023 (RCT): 5 minutes a day of cyclic sighing improved mood more than mindfulness and lowered breathing rate.">
      {!run && !end && <>
        <Card className="space-y-3"><Pills value={kind} onChange={setKind} label="Pattern" options={[{ v: "sigh" as const, label: "Cyclic sighing" }, { v: "box" as const, label: "Box breathing" }]} /><Help>{BREATHS[kind].note}</Help>
          <Pills value={mins} onChange={setMins} label="Minutes" options={[1, 2, 5].map(n => ({ v: n, label: `${n} min` }))} />
          <div><div className="mb-1 text-sm font-medium">How tense are you now?</div><Pills value={before} onChange={setBefore} options={mood} label="Before" /></div></Card>
        <Primary onClick={() => setRun(true)}>Begin</Primary></>}
      {run && <Card className="flex flex-col items-center py-8"><div className="flex h-44 w-44 items-center justify-center"><div className="rounded-full bg-primary/25 ring-2 ring-primary transition-all ease-in-out" style={{ width: grow || hold ? 168 : 80, height: grow || hold ? 168 : 80, transitionDuration: `${steps[phase].s}s` }} /></div>
        <div className="mt-2 text-2xl font-semibold" aria-live="polite">{steps[phase].t}</div><div className="text-sm tabular-nums text-muted-foreground">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
        <button onClick={() => { setRun(false); setEnd(true); }} className="mt-4 text-sm text-muted-foreground underline">Stop</button></Card>}
      {end && <><Card className="space-y-3"><div className="font-medium">How tense are you now?</div><Pills value={after} onChange={setAfter} options={mood} label="After" />
        {before != null && after != null && <Help>{after > before ? `Tension eased by ${after - before} step${after - before > 1 ? "s" : ""}.` : after === before ? "No change this time. It often takes a few days of practice." : "A bit higher. Sometimes noticing is the first step. Try the grounding list below."}</Help>}</Card><Primary onClick={save}>Save and finish</Primary></>}
      {!run && <Card><div className="text-sm font-semibold">5-4-3-2-1 grounding</div><p className="mt-1 text-sm text-muted-foreground">Good when your thoughts are racing. Tap through slowly.</p>
        {g >= 0 && <div className="mt-2 rounded-2xl bg-primary/10 p-3 text-center text-lg font-medium" aria-live="polite">{GROUND[g]}</div>}
        <button onClick={() => setG(x => (x >= GROUND.length - 1 ? -1 : x + 1))} className="mt-2 rounded-full border border-border px-4 py-2 text-sm">{g < 0 ? "Start" : g === GROUND.length - 1 ? "Finish" : "Next"}</button></Card>}
    </Screen>
  );
}

/** Self-compassion break (three parts: noticing, common humanity, kindness) with a before and after rating. */
export function Kind({ update, done, back }: MindProps) {
  const [s, setS] = useState(0); const [what, setWhat] = useState(""); const [line, setLine] = useState(""); const [before, setBefore] = useState<number | null>(null); const [after, setAfter] = useState<number | null>(null);
  const parts = [
    { t: "Notice", q: "What is hard right now? Say it plainly.", ph: "I put off the report again and I feel behind", f: what, set: setWhat, cue: "This is a moment of struggle. It hurts a little. That is allowed." },
    { t: "You are not alone", q: "", cue: "Struggling to start is part of being human. Many people feel this exact way over work they care about.", f: "", set: () => undefined },
    { t: "Be kind", q: "What would you say to a friend in this spot? Say it to yourself.", ph: "It's okay. Two minutes is enough. You can begin small.", f: line, set: setLine, cue: "Put a hand on your chest if it helps. Breathe out slowly." },
  ];
  const p = parts[s];
  return (
    <Screen title="Kind reset" sub="One minute. Being harsh about avoiding a task usually makes the next start harder." back={back} credit="Self-compassion break (Neff). A 14-day online self-compassion program cut bedtime procrastination in a 2025 RCT (n = 459).">
      {s === 0 && <Card><div className="mb-1 text-sm font-medium">How hard on yourself are you right now?</div><Pills value={before} onChange={setBefore} options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Not at all", "A little", "Some", "Quite", "Very"][n - 1] }))} label="Self-criticism before" /></Card>}
      <Card className="space-y-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">{s + 1} of 3 · {p.t}</div><p className="text-base">{p.cue}</p>{p.q && <Field label={p.q} value={p.f} onChange={p.set} rows={2} ph={p.ph} />}</Card>
      {s < 2 ? <Primary disabled={s === 0 && (what.trim().length < 3 || before == null)} onClick={() => setS(s + 1)}>Next</Primary> : <>
        <Card><div className="mb-1 text-sm font-medium">How hard on yourself now?</div><Pills value={after} onChange={setAfter} options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Not at all", "A little", "Some", "Quite", "Very"][n - 1] }))} label="Self-criticism after" /></Card>
        <Primary disabled={line.trim().length < 3 || after == null} onClick={() => { update(m => ({ ...m, calm: [...m.calm, { ts: Date.now(), kind: "kind", sec: 60, before: before ?? undefined, after: after ?? undefined }] })); done("kind"); back(); }}>Save</Primary></>}
    </Screen>
  );
}

/** Wind-down: write a specific list for tomorrow (it helps people fall asleep faster), and give worries a place. */
export function Wind({ update, done, back }: MindProps) {
  const [items, setItems] = useState(["", "", ""]); const [worries, setWorries] = useState<{ w: string; act: string }[]>([]); const [w, setW] = useState(""); const [act, setAct] = useState(""); const [fin, setFin] = useState(false);
  const clean = items.map(x => x.trim()).filter(Boolean);
  const save = () => { update(m => ({ ...m, wind: [...m.wind, { ts: Date.now(), items: clean, worries }] })); if (clean[0]) saveTomorrow(clean[0], "Open it and do the first two minutes"); setFin(true); done("wind"); };
  return (
    <Screen title="Wind-down" sub="Empty your head onto the page so your brain can stop rehearsing it." back={back} credit="Scullin et al. 2018 (polysomnography, n = 57): writing a specific to-do list for 5 minutes fell asleep about 9 minutes faster than writing what was done. 'Worry time' is a standard CBT tool (NHS Every Mind Matters).">
      <Card className="space-y-2"><div className="text-sm font-semibold">1. Tomorrow's list (be specific)</div><Help>"Email Dr Rao about the form" works better than "emails". The first line becomes tomorrow's first step on Today.</Help>
        {items.map((x, i) => <input key={i} value={x} onChange={e => setItems(a => a.map((y, j) => (j === i ? e.target.value.slice(0, 120) : y)))} placeholder={i === 0 ? "The one thing that matters most" : "Another thing"} aria-label={`Item ${i + 1}`} className="w-full rounded-2xl border border-input bg-background/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />)}
        {items.length < 8 && <button onClick={() => setItems(a => [...a, ""])} className="text-sm underline">Add another</button>}</Card>
      <Card className="space-y-2"><div className="text-sm font-semibold">2. Worry time (optional)</div><Help>Write the worry. If you can act on it, write the next action. If you cannot, write "Can't act on this tonight" and let it wait.</Help>
        {worries.map((x, i) => <div key={i} className="rounded-2xl bg-secondary/50 p-2 text-sm"><b>{x.w}</b><div className="text-muted-foreground">{x.act}</div></div>)}
        <Field label="A worry" value={w} onChange={setW} rows={1} /><Field label="What can I do about it?" value={act} onChange={setAct} rows={1} ph="Call the bank at 10am, or: can't act on this tonight" />
        <button disabled={!w.trim() || !act.trim()} onClick={() => { setWorries(a => [...a, { w: w.trim(), act: act.trim() }]); setW(""); setAct(""); }} className="rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40">Add worry</button></Card>
      {!fin ? <Primary disabled={clean.length === 0} onClick={save}>Done for tonight</Primary> : <><Saved text={clean[0] ? `Saved. Tomorrow's first step is "${clean[0]}".` : "Saved."} /><Card><p className="text-sm">Your list is on paper now, so your mind does not have to hold it. Put the phone away and breathe out slowly.</p></Card></>}
    </Screen>
  );
}
