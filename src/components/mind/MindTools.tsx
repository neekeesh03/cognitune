import { useState } from "react";
import { DEFUSE, DISTORTIONS, REFRAME_Q, TLX_DIMS, VALUES, avg, pmRank, tlxAdvice, tlxBand, tlxLoads, tlxRaw } from "@/engine/mind";
import { saveTomorrow } from "@/engine/director";
import { Card, Field, Help, Pills, Primary, Rate, Saved, Screen, Spark, type MindProps } from "@/components/mind/MindParts";

/** NASA-TLX, raw scoring: six ratings, averaged, and the heaviest ones get a matching fix. */
export function Tlx({ mind, update, done, back, go }: MindProps) {
  const [task, setTask] = useState(() => { try { return sessionStorage.getItem("lagomo.mind.task") || ""; } catch { return ""; } });
  const [v, setV] = useState<number[]>(TLX_DIMS.map(d => (d.id === "performance" ? 50 : 30))); const [fin, setFin] = useState(false);
  const raw = tlxRaw(v); const adv = tlxAdvice(v); const hist = mind.tlx.slice(-8);
  const drivers = (() => { if (mind.tlx.length < 3) return null; const sums = TLX_DIMS.map((_, i) => avg(mind.tlx.slice(-12).map(t => tlxLoads(t.v)[i]))); const i = sums.indexOf(Math.max(...sums)); return { label: TLX_DIMS[i].label, val: sums[i] }; })();
  return (
    <Screen title="How heavy was it?" sub="Based on the NASA Task Load Index. Pilots, surgeons and engineers use it to find out why a task feels hard." back={back} credit="NASA-TLX, Hart and Staveland (NASA Ames). Raw (unweighted) scoring; prompts reworded in plain language.">
      <Card className="space-y-4">
        <Field label="What did you work on?" value={task} onChange={setTask} rows={1} ph="e.g. chemistry report" />
        {TLX_DIMS.map((d, i) => <Rate key={d.id} label={d.label} ask={d.ask} lo={d.lo} hi={d.hi} value={v[i]} onChange={n => { setFin(false); setV(x => x.map((y, j) => (j === i ? n : y))); }} />)}
      </Card>
      <Card><div className="text-sm text-muted-foreground">Workload</div><div className="text-3xl font-semibold">{raw}<span className="text-base font-normal text-muted-foreground"> / 100 · {tlxBand(raw)}</span></div></Card>
      {!fin ? <Primary onClick={() => { update(m => ({ ...m, tlx: [...m.tlx, { ts: Date.now(), task: task.trim().slice(0, 80) || "Something I worked on", v, raw }] })); setFin(true); done("tlx"); }}>Save and see what would help</Primary> : (
        <>
          <Saved text="Saved." />
          {adv.length === 0 ? <Card><p className="text-sm">Nothing stood out as heavy. Whatever you did here is a pace that works for you. Note what made it light, and use it next time.</p></Card> :
            adv.map(a => <Card key={a.id}><div className="text-sm font-semibold">{TLX_DIMS.find(d => d.id === a.id)!.label} was the heavy part</div><p className="mt-1 text-sm">{a.why} {a.fix}</p><button onClick={() => go(a.tool)} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{a.toolLabel}</button></Card>)}
        </>
      )}
      {hist.length > 1 && <Card><div className="text-sm font-medium">Your last {hist.length} checks</div><Spark values={hist.map(h => h.raw)} min={0} max={100} good="low" />{drivers && <Help>Your heaviest area over the last few checks: <b>{drivers.label}</b> (average {drivers.val}/100).</Help>}</Card>}
    </Screen>
  );
}

/** WOOP (mental contrasting with implementation intentions): Wish, Outcome, Obstacle, Plan. */
export function Woop({ mind, update, done, back, onStart }: MindProps) {
  const [s, setS] = useState(0); const [f, setF] = useState({ wish: "", outcome: "", obstacle: "", plan: "" }); const [fin, setFin] = useState(false);
  const steps = [
    { k: "wish" as const, t: "Wish", q: "What do you want to get done? Something that is hard but doable.", ph: "Write the first page of my essay today" },
    { k: "outcome" as const, t: "Outcome", q: "Picture the best result. How will it feel when it is done?", ph: "I'll feel lighter and proud, and I can relax tonight" },
    { k: "obstacle" as const, t: "Obstacle", q: "What inside you is most likely to get in the way? A feeling, a thought or a habit.", ph: "I'll tell myself I need more time first and scroll my phone" },
    { k: "plan" as const, t: "Plan", q: "Finish this sentence: If that happens, then I will...", ph: "If I reach for my phone, then I will put it in the other room and write one sentence" },
  ];
  const cur = steps[s]; const last = mind.woop[mind.woop.length - 1];
  if (fin) return (
    <Screen title="Your plan" back={back} credit="WOOP / mental contrasting with implementation intentions (Oettingen; Gollwitzer). Meta-analysis: g = 0.34 on goal attainment, larger with an if-then plan.">
      <Card className="space-y-2 text-sm"><div><b>Wish:</b> {f.wish}</div><div><b>Best outcome:</b> {f.outcome}</div><div><b>Obstacle:</b> {f.obstacle}</div><div><b>If-then:</b> {f.plan}</div></Card>
      <Saved text="Saved. It will show on Today when you open the app." />
      <div className="flex flex-wrap gap-2"><button onClick={() => onStart(f.wish.slice(0, 60), f.plan.replace(/^if [^,]*, ?then /i, "").slice(0, 80) || "Take the first small step")} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Start 2 minutes now</button>
        <button onClick={() => { saveTomorrow(f.wish.slice(0, 60), f.plan.slice(0, 100)); back(); }} className="rounded-full border border-border px-4 py-2 text-sm">Use as tomorrow's first step</button></div>
    </Screen>
  );
  return (
    <Screen title="WOOP" sub={`Step ${s + 1} of 4: ${cur.t}`} back={back} credit="Picturing the good outcome and then the real obstacle, with an if-then plan, works better than positive thinking alone.">
      {last && s === 0 && !f.wish && <Card><div className="text-xs text-muted-foreground">Last time</div><div className="text-sm">{last.wish}</div><button onClick={() => setF({ wish: last.wish, outcome: last.outcome, obstacle: last.obstacle, plan: last.plan })} className="mt-1 text-sm underline">Reuse it</button></Card>}
      <Card><Field label={cur.q} value={f[cur.k]} onChange={t => setF(x => ({ ...x, [cur.k]: t }))} rows={3} ph={cur.ph} /></Card>
      <div className="flex gap-2">{s > 0 && <button onClick={() => setS(s - 1)} className="rounded-full border border-border px-4 py-2 text-sm">Back</button>}
        <div className="flex-1"><Primary disabled={f[cur.k].trim().length < 3} onClick={() => { if (s < 3) { setS(s + 1); return; } update(m => ({ ...m, woop: [...m.woop, { ts: Date.now(), ...f }] })); setFin(true); done("woop"); }}>{s < 3 ? "Next" : "Save my plan"}</Primary></div></div>
    </Screen>
  );
}

/** Thought unhooker: write the thought, rate belief, then defuse it or reframe it, and rate again. */
export function Thoughts({ mind, update, done, back }: MindProps) {
  const [step, setStep] = useState<"write" | "way" | "work" | "after" | "end">("write");
  const [text, setText] = useState(""); const [before, setBefore] = useState(70); const [after, setAfter] = useState(70); const [way, setWay] = useState<"unhook" | "reframe">("unhook"); const [tags, setTags] = useState<string[]>([]); const [fair, setFair] = useState(""); const [d, setD] = useState(0);
  const hist = mind.thoughts; const drop = hist.length ? avg(hist.map(h => h.before - h.after)) : 0;
  const finish = () => { update(m => ({ ...m, thoughts: [...m.thoughts, { ts: Date.now(), text: text.slice(0, 200), before, after, way, tags, fair: fair.slice(0, 200) || undefined }] })); setStep("end"); done("thought"); };
  return (
    <Screen title="Unhook from a thought" sub="Thoughts feel like facts. This gives you some room from them." back={back} credit="Cognitive defusion (ACT) and cognitive restructuring (CBT). In a 2018 trial of two apps, both helped about equally; defusion was more consistent.">
      {step === "write" && <>
        <Card className="space-y-3"><Field label="What is the thought?" hint="The exact words your mind is saying." value={text} onChange={setText} rows={2} ph="I'll never get this done, I'm so lazy" />
          <Rate label="How much do you believe it right now?" value={before} onChange={setBefore} lo="Not at all" hi="Completely" /></Card>
        <Primary disabled={text.trim().length < 4} onClick={() => setStep("way")}>Next</Primary></>}
      {step === "way" && <>
        <Card><div className="mb-2 text-sm font-medium">Which feels right today?</div>
          <Pills value={way} onChange={setWay} label="Approach" options={[{ v: "unhook" as const, label: "Step back from it (defuse)" }, { v: "reframe" as const, label: "Check it (reframe)" }]} />
          <Help>{way === "unhook" ? "You do not argue with the thought. You see it as words your mind is making, and loosen its grip." : "You test the thought against the evidence and find a fairer version."}</Help></Card>
        {way === "reframe" && <Card><div className="mb-2 text-sm font-medium">Which thinking trap fits? (pick any)</div><div className="flex flex-wrap gap-2">{DISTORTIONS.map(x => <button key={x.id} title={x.hint} onClick={() => setTags(t => (t.includes(x.id) ? t.filter(y => y !== x.id) : [...t, x.id]))} className={`rounded-full border px-3 py-1.5 text-sm ${tags.includes(x.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60"}`}>{x.label}</button>)}</div>
          {tags.length > 0 && <Help>{tags.map(t => DISTORTIONS.find(x => x.id === t)?.hint).join(" ")}</Help>}</Card>}
        <Primary onClick={() => setStep("work")}>Begin</Primary></>}
      {step === "work" && <>
        <Card className="bg-primary/5"><div className="text-xs text-muted-foreground">Your thought</div><div className="font-medium">"{text}"</div></Card>
        {way === "unhook" ? <Card><div className="text-xs text-muted-foreground">Try this ({d + 1} of {DEFUSE.length})</div><p className="mt-1 text-base">{DEFUSE[d]}</p>
          <div className="mt-3 flex gap-2">{d + 1 < DEFUSE.length ? <button onClick={() => setD(d + 1)} className="rounded-full border border-border px-4 py-2 text-sm">Another way</button> : null}<button onClick={() => setStep("after")} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">I tried it</button></div></Card>
          : <Card className="space-y-3">{REFRAME_Q.slice(0, 3).map(q => <div key={q} className="text-sm">• {q}</div>)}<Field label={REFRAME_Q[3]} value={fair} onChange={setFair} rows={2} ph="I haven't started yet, and that's fixable in two minutes" /><Primary disabled={fair.trim().length < 4} onClick={() => setStep("after")}>Next</Primary></Card>}</>}
      {step === "after" && <><Card className="space-y-3"><div className="text-sm">{way === "reframe" && fair ? <>Fairer thought: <b>"{fair}"</b></> : <>Same thought: <b>"{text}"</b></>}</div><Rate label="How much do you believe the original thought now?" value={after} onChange={setAfter} lo="Not at all" hi="Completely" /></Card>
        <Primary onClick={finish}>Save</Primary></>}
      {step === "end" && <><Saved text={before - after > 0 ? `Belief went from ${before} to ${after}.` : "Saved. It is fine if it did not shift. Thoughts take practice."} />
        <Card><p className="text-sm">{before - after >= 10 ? "That is some room. Do one tiny thing now while the thought is quieter." : "You noticed the thought instead of being run by it. That is the skill."}</p></Card></>}
      {hist.length > 0 && step === "write" && <Card><div className="text-sm font-medium">Your practice</div><Help>{hist.length} thought{hist.length > 1 ? "s" : ""} so far. Belief fell by {drop} points on average.</Help></Card>}
    </Screen>
  );
}

/** Behavioural activation: log activities with pleasure and mastery, see which ones lift you, plan another. */
export function Pm({ mind, update, done, back, onStart }: MindProps) {
  const [what, setWhat] = useState(""); const [p, setP] = useState(5); const [m, setM] = useState(5); const [b, setB] = useState<number | null>(null); const [a, setA] = useState<number | null>(null); const [val, setVal] = useState<string | null>(null); const [saved, setSaved] = useState(false);
  const rank = pmRank(mind.pm); const best = rank.filter(r => r.n >= 1).slice(0, 4); const mood = [1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Low", "Down", "Okay", "Good", "Great"][n - 1] }));
  const weekVals = mind.pm.filter(e => Date.now() - e.ts < 7 * 864e5 && e.value).length;
  return (
    <Screen title="Pleasure and mastery" sub="Low energy shrinks life. Small activities that bring enjoyment (pleasure) or a sense of getting something done (mastery) turn it around. Log one, then see what actually lifts you." back={back} credit="Behavioural activation: activity monitoring and scheduling. Digital versions reduce low mood for 2 to 6 months in trials (JMIR 2025 meta-analysis).">
      {best.length > 0 && <Card><div className="text-sm font-semibold">What lifts you most</div><div className="mt-2 space-y-1">{best.map(r => <div key={r.what} className="flex items-center justify-between gap-2 text-sm"><span>{r.what}</span><span className="text-muted-foreground">P {r.p} · M {r.m}{r.lift != null ? ` · mood ${r.lift >= 0 ? "+" : ""}${r.lift}` : ""}</span></div>)}</div>
        <button onClick={() => onStart(best[0].what, "Do just the first two minutes of it")} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Do "{best[0].what}" for 2 minutes</button></Card>}
      <Card className="space-y-4">
        <Field label="What did you do (or what will you do)?" value={what} onChange={t => { setSaved(false); setWhat(t); }} rows={1} ph="Walked to the shop, called Maya, cleaned my desk" />
        <Rate label="Pleasure: how enjoyable?" value={p} onChange={setP} max={10} step={1} lo="None" hi="A lot" />
        <Rate label="Mastery: how much did it feel like an achievement?" value={m} onChange={setM} max={10} step={1} lo="None" hi="A lot" />
        <div><div className="mb-1 text-sm font-medium">Mood before</div><Pills value={b} onChange={setB} options={mood} label="Mood before" /></div>
        <div><div className="mb-1 text-sm font-medium">Mood after</div><Pills value={a} onChange={setA} options={mood} label="Mood after" /></div>
        <div><div className="mb-1 text-sm font-medium">Which value did it serve? <span className="font-normal text-muted-foreground">(optional)</span></div><Pills value={val} onChange={setVal} options={VALUES.map(v => ({ v, label: v }))} label="Value" /></div>
      </Card>
      {!saved ? <Primary disabled={what.trim().length < 3} onClick={() => { update(x => ({ ...x, pm: [...x.pm, { ts: Date.now(), what: what.trim().slice(0, 60), p, m, before: b ?? undefined, after: a ?? undefined, value: val ?? undefined }] })); setSaved(true); done("pm"); }}>Save</Primary> : <Saved text="Saved. Your 'what lifts you' list updates as you log more." />}
      <Help>{weekVals > 0 ? `${weekVals} value-guided action${weekVals > 1 ? "s" : ""} in the last 7 days. ` : ""}Aim for one pleasure and one mastery activity a day, even tiny ones. The goal is to act first, and let the mood follow.</Help>
    </Screen>
  );
}
