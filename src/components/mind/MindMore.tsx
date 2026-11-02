import { useEffect, useRef, useState } from "react";
import { BUNDLE_IDEAS, TMT_LEVERS, WHEEL, avg, clock, energyMap, parseClock, sleepAdvice, sleepNight, sleepSummary, tmtAdvice, tmtIndex, type SleepNight } from "@/engine/mind";
import { INSTRUMENTS, fmtScore, scoreOf } from "@/engine/mind";
import { loadLog } from "@/lib/startlog";
import { emptyMind, saveMind, sameDay } from "@/store/useMind";
import { Card, Field, Help, Pills, Primary, Rate, Saved, Screen, Spark, type MindProps } from "@/components/mind/MindParts";

const cls = "rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"; const ghost = "rounded-full border border-border px-4 py-2 text-sm";
const dayStr = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

/** Sleep diary with the basic CBT-I rules. Needs about a week of nights to say anything useful. */
export function Sleep({ mind, update, done, back }: MindProps) {
  const last = mind.sleep[mind.sleep.length - 1];
  const [bed, setBed] = useState(clock(last?.bed ?? 23 * 60)); const [wake, setWake] = useState(clock(last?.wake ?? 7 * 60)); const [up, setUp] = useState(clock(last?.up ?? 7 * 60 + 15));
  const [lat, setLat] = useState(last?.latency ?? 20); const [aw, setAw] = useState(last?.awake ?? 10); const [q, setQ] = useState<number | null>(null); const [saved, setSaved] = useState(false);
  const draft: SleepNight = { ts: Date.now(), day: dayStr(), bed: parseClock(bed), latency: lat, awake: aw, wake: parseClock(wake), up: parseClock(up), q: q ?? 3 }; const now = sleepNight(draft);
  const all = saved ? mind.sleep : [...mind.sleep, ...[]]; const sum = sleepSummary(all); const adv = sum ? sleepAdvice(sum) : [];
  const t = "w-full rounded-2xl border border-input bg-background/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <Screen title="Sleep diary" sub="Log last night. After a week the app shows your real pattern and one thing to change." back={back} credit="Digital CBT for insomnia improves self-reported sleep efficiency by about 8 to 10 points against no treatment (2025 meta-analyses of 14 to 29 trials). Stimulus control: small to large gains vs passive controls; evidence graded low-quality by the AASM (2021). This is self-help, not treatment for insomnia.">
      <Card className="grid grid-cols-2 gap-3">
        <label className="text-sm">Lights out<input type="time" value={bed} onChange={e => { setSaved(false); setBed(e.target.value); }} className={t + " mt-1"} /></label>
        <label className="text-sm">Final wake-up<input type="time" value={wake} onChange={e => { setSaved(false); setWake(e.target.value); }} className={t + " mt-1"} /></label>
        <label className="text-sm">Out of bed<input type="time" value={up} onChange={e => { setSaved(false); setUp(e.target.value); }} className={t + " mt-1"} /></label>
        <label className="text-sm">Minutes to fall asleep<input type="number" min={0} max={300} value={lat} onChange={e => { setSaved(false); setLat(+e.target.value || 0); }} className={t + " mt-1"} /></label>
        <label className="col-span-2 text-sm">Minutes awake in the night (total)<input type="number" min={0} max={400} value={aw} onChange={e => { setSaved(false); setAw(+e.target.value || 0); }} className={t + " mt-1"} /></label>
        <div className="col-span-2"><div className="mb-1 text-sm">How rested do you feel?</div><Pills value={q} onChange={setQ} label="Quality" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Awful", "Poor", "Okay", "Good", "Great"][n - 1] }))} /></div>
      </Card>
      <Card><div className="text-sm text-muted-foreground">This night</div><div className="text-lg font-semibold">{Math.floor(now.tst / 60)}h {now.tst % 60}m asleep · {now.se}% efficiency</div><Help>Sleep efficiency is time asleep divided by time in bed. Around 85% or more is the usual target.</Help></Card>
      {!saved ? <Primary disabled={q == null} onClick={() => { update(m => ({ ...m, sleep: [...m.sleep.filter(s => s.day !== draft.day), draft] })); setSaved(true); done("sleep"); }}>Save last night</Primary> : <Saved text="Saved." />}
      {sum && <Card><div className="text-sm font-semibold">Your last {sum.n} night{sum.n > 1 ? "s" : ""}</div><div className="mt-1 text-sm">{sum.tst} h average · {sum.se}% efficiency · wake-up varies about {sum.wakeSd} min</div>
        {mind.sleep.length > 1 && <div className="mt-2"><Spark values={mind.sleep.slice(-10).map(s => sleepNight(s).se)} min={50} max={100} /></div>}
        <ul className="mt-2 space-y-2 text-sm">{adv.map(a => <li key={a}>• {a}</li>)}</ul></Card>}
    </Screen>
  );
}

const DOMAINS = ["Family", "Friends", "Health", "Learning", "Work or study", "Fun and rest", "Calm", "Helping others", "Creativity", "Meaning or faith"];
/** Values compass (ACT): what matters, how much you are living it now, and one small action for the biggest gap. */
export function Compass({ mind, update, done, back, onStart }: MindProps) {
  const last = mind.compass[mind.compass.length - 1];
  const [r, setR] = useState<Record<string, { imp: number; now: number }>>(last?.r ?? Object.fromEntries(DOMAINS.map(d => [d, { imp: 5, now: 5 }]))); const [step, setStep] = useState<"rate" | "act">("rate"); const [action, setAction] = useState(""); const [saved, setSaved] = useState(false);
  const gaps = DOMAINS.map(d => ({ d, g: r[d].imp - r[d].now, imp: r[d].imp })).filter(x => x.imp >= 6).sort((a, b) => b.g - a.g); const top = gaps[0];
  return (
    <Screen title="Values compass" sub="Values are directions you care about, not goals to finish. See where your days and your values drift apart." back={back} credit="From Acceptance and Commitment Therapy. Evidence for values work on its own is mixed (systematic reviews), so treat this as reflection. Its job here is to give your next small action a reason.">
      {step === "rate" && <><Card className="space-y-4">{DOMAINS.map(d => <div key={d}><div className="text-sm font-medium">{d}</div>
        <Rate label="How much it matters to me" value={r[d].imp} max={10} step={1} onChange={n => setR(x => ({ ...x, [d]: { ...x[d], imp: n } }))} />
        <Rate label="How much I am living it lately" value={r[d].now} max={10} step={1} onChange={n => setR(x => ({ ...x, [d]: { ...x[d], now: n } }))} /></div>)}</Card>
        <Primary disabled={!top} onClick={() => setStep("act")}>See my biggest gap</Primary></>}
      {step === "act" && top && <><Card><div className="text-xs text-muted-foreground">Biggest gap among what matters most</div><div className="text-xl font-semibold">{top.d}</div><div className="text-sm">Matters {r[top.d].imp}/10, living it {r[top.d].now}/10.</div></Card>
        <Card className="space-y-3"><Field label={`One small thing this week that serves "${top.d.toLowerCase()}"`} hint="Something you could do in under 10 minutes." value={action} onChange={setAction} rows={2} ph="Call my sister for 10 minutes" />
          {!saved ? <Primary disabled={action.trim().length < 3} onClick={() => { update(m => ({ ...m, compass: [...m.compass, { ts: Date.now(), r, domain: top.d, action: action.trim() }] })); setSaved(true); done("compass"); }}>Save</Primary> : <><Saved text="Saved." /><button onClick={() => onStart(action.slice(0, 60), "Do just the first two minutes")} className={cls}>Start 2 minutes now</button></>}</Card></>}
    </Screen>
  );
}

/** Behavioural experiment: test a prediction in real life, compare, and note what you learned. */
export function Experiment({ mind, update, done, back, preset }: MindProps & { preset?: "enough" }) {
  const open = mind.exps.filter(e => e.outcome === undefined); const [pick, setPick] = useState<number | null>(open.length ? open[open.length - 1].ts : null);
  const [belief, setBelief] = useState(""); const [before, setBefore] = useState(70); const [test, setTest] = useState(""); const [outcome, setOutcome] = useState(""); const [after, setAfter] = useState(40); const [learn, setLearn] = useState(""); const [made, setMade] = useState(false); const [closed, setClosed] = useState(false);
  const cur = mind.exps.find(e => e.ts === pick);
  return (
    <Screen title={preset === "enough" ? "Good-enough test" : "Test a worry"} sub={preset === "enough" ? "Hand in or share a deliberately 80% version and see what really happens." : "Thoughts get weaker when you test them, not only when you argue with them."} back={back} credit="Behavioural experiments (CBT). In a 2012 trial (n = 91), one experiment shifted beliefs and behaviour about as well as a thought record, with a small early advantage. Perfectionism programmes use this kind of test; internet CBT for perfectionism helped students, with low module completion.">
      {cur && !closed ? <>
        <Card className="space-y-1 text-sm"><div className="text-xs text-muted-foreground">Your experiment</div><div><b>Prediction:</b> {cur.belief} ({cur.before}% sure)</div><div><b>Test:</b> {cur.test}</div></Card>
        <Card className="space-y-3"><div className="font-medium">After you tried it</div><Field label="What actually happened?" value={outcome} onChange={setOutcome} rows={2} /><Rate label="How sure are you of the original prediction now?" value={after} onChange={setAfter} lo="Not at all" hi="Completely" /><Field label="What did you learn?" value={learn} onChange={setLearn} rows={2} />
          <Primary disabled={outcome.trim().length < 3} onClick={() => { update(m => ({ ...m, exps: m.exps.map(e => (e.ts === cur.ts ? { ...e, outcome: outcome.trim(), after, learn: learn.trim() } : e)) })); setClosed(true); done("exp"); }}>Save result</Primary></Card></> :
        closed ? <><Saved text={cur && after < cur.before ? `Your certainty fell from ${cur.before}% to ${after}%. That is evidence you can use.` : "Saved. If it held up, that is information too."} /><button onClick={() => { setClosed(false); setPick(null); setMade(false); setBelief(""); setTest(""); setOutcome(""); setLearn(""); }} className={ghost}>Test another</button></> : <>
          <Card className="space-y-3"><Field label="What do you predict will happen?" hint="A specific, checkable prediction." value={belief} onChange={setBelief} rows={2} ph="If I send my draft to Sam, he will think it is bad and stop replying" />
            <Rate label="How sure are you?" value={before} onChange={setBefore} lo="Not at all" hi="Completely" />
            <Field label="How will you test it, and when?" hint="One small, safe step." value={test} onChange={setTest} rows={2} ph="Send the draft tonight and note his reply by tomorrow noon" /></Card>
          {!made ? <Primary disabled={belief.trim().length < 5 || test.trim().length < 5} onClick={() => { update(m => ({ ...m, exps: [...m.exps, { ts: Date.now(), belief: belief.trim(), before, test: test.trim() }] })); setMade(true); }}>Save and go test it</Primary> : <Saved text="Saved. Come back here after you have tried it." />}
          {mind.exps.filter(e => e.outcome !== undefined).length > 0 && <Help>You have completed {mind.exps.filter(e => e.outcome !== undefined).length}. Average certainty change: {avg(mind.exps.filter(e => e.after != null).map(e => e.before - e.after!))} points.</Help>}</>}
    </Screen>
  );
}

/** Exposure ladder for something you keep avoiding: tiny steps from easy to hard, rating anxiety before, during and after. */
export function Ladder({ mind, update, done, back, onStart }: MindProps) {
  const [id, setId] = useState<string | null>(mind.ladders[mind.ladders.length - 1]?.id ?? null); const lad = mind.ladders.find(l => l.id === id);
  const [title, setTitle] = useState(""); const [txt, setTxt] = useState(""); const [d, setD] = useState(3); const [run, setRun] = useState<number | null>(null); const [b, setB] = useState(5); const [pk, setPk] = useState(6); const [af, setAf] = useState(3);
  const patch = (fn: (l: NonNullable<typeof lad>) => NonNullable<typeof lad>) => update(m => ({ ...m, ladders: m.ladders.map(l => (l.id === id ? fn(l) : l)) }));
  if (!lad) return (
    <Screen title="Step ladder" sub="For something you keep avoiding because it makes you anxious: an email, a call, an office visit, a presentation." back={back} credit="Graded exposure (CBT): facing a feared thing in small steps, staying until anxiety passes on its own, builds confidence. Exposure hierarchy ratings are a reliable way to track progress (Behavior Modification 2008).">
      <Card className="space-y-3"><Field label="What are you avoiding?" value={title} onChange={setTitle} rows={1} ph="Calling the bank" /><Help>Then you will break it into 4 to 6 steps, from very easy to hard.</Help><Primary disabled={title.trim().length < 3} onClick={() => { const n = { id: crypto.randomUUID(), ts: Date.now(), title: title.trim().slice(0, 60), steps: [] }; update(m => ({ ...m, ladders: [...m.ladders, n] })); setId(n.id); }}>Build the ladder</Primary></Card>
    </Screen>
  );
  const steps = [...lad.steps].map((s, i) => ({ ...s, i })).sort((a, z) => a.d - z.d); const next = steps.find(s => !s.doneAt);
  return (
    <Screen title={lad.title} sub="Do the easiest undone step. Stay with it until the anxiety drops, then rate it." back={back} credit="Graded exposure (CBT). Go at a pace that is hard but safe. If a step is for a trauma or panic, do it with a professional.">
      <Card className="space-y-2">{steps.length === 0 && <p className="text-sm text-muted-foreground">Add your first step (start very small).</p>}
        {steps.map(s => <div key={s.i} className={`flex items-center justify-between gap-2 rounded-2xl p-2 text-sm ${s.doneAt ? "bg-primary/10" : next?.i === s.i ? "ring-2 ring-primary" : "bg-secondary/40"}`}><span className="min-w-0 flex-1">{s.doneAt ? "✓ " : ""}{s.text}</span><span className="shrink-0 text-xs text-muted-foreground">{s.doneAt ? `${s.before ?? "-"} → ${s.peak ?? "-"} → ${s.after ?? "-"}` : `anxiety ${s.d}/10`}</span></div>)}
        {lad.steps.length < 8 && run === null && <div className="space-y-2 pt-2"><Field label="Add a step" value={txt} onChange={setTxt} rows={1} ph="Find the bank's number and save it" /><Rate label="How anxious would this step feel?" value={d} max={10} step={1} onChange={setD} lo="Calm" hi="Very" /><button disabled={txt.trim().length < 3} onClick={() => { patch(l => ({ ...l, steps: [...l.steps, { text: txt.trim().slice(0, 80), d }] })); setTxt(""); }} className={ghost + " disabled:opacity-40"}>Add step</button></div>}</Card>
      {next && run === null && <button onClick={() => { setRun(next.i); setB(next.d); }} className={cls}>Do the next step</button>}
      {run !== null && lad.steps[run] && <Card className="space-y-3"><div className="font-medium">{lad.steps[run].text}</div><Rate label="Anxiety right before" value={b} max={10} step={1} onChange={setB} /><button onClick={() => onStart(lad.steps[run].text, "Do only this step. Stay until the anxiety eases.")} className={ghost}>Start a 2-minute timer</button>
        <Rate label="Peak anxiety during" value={pk} max={10} step={1} onChange={setPk} /><Rate label="Anxiety afterwards" value={af} max={10} step={1} onChange={setAf} />
        <Primary onClick={() => { patch(l => ({ ...l, steps: l.steps.map((s, i) => (i === run ? { ...s, doneAt: Date.now(), before: b, peak: pk, after: af } : s)) })); setRun(null); done("ladder"); }}>Mark step done</Primary></Card>}
      {lad.steps.some(s => s.doneAt) && <Help>{lad.steps.filter(s => s.doneAt).length} of {lad.steps.length} done. Anxiety usually falls after the peak. You can see yours above (before → peak → after).</Help>}
      <button onClick={() => setId(null)} className="text-sm text-muted-foreground underline">Start a different ladder</button>
    </Screen>
  );
}

/** Why am I avoiding it? Four sliders from Temporal Motivation Theory, with the lever that would help most. */
export function Why({ mind, update, done, back, go }: MindProps) {
  const [task, setTask] = useState(""); const [e, setE] = useState(5); const [v, setV] = useState(5); const [d, setD] = useState(5); const [i, setI] = useState(5); const [saved, setSaved] = useState(false);
  const adv = tmtAdvice({ e, v, d, i }); const idx = tmtIndex({ e, v, d, i }); const hist = mind.tmt.slice(-6);
  return (
    <Screen title="Why am I avoiding it?" sub="Four things decide whether you start. Find out which one is holding you back." back={back} credit="Temporal Motivation Theory (Steel and Koenig, 2006): motivation rises with confidence and value, and falls with delay and distraction. A useful framework, not a validated test; the score is a rough guide.">
      <Card className="space-y-4"><Field label="What are you avoiding?" value={task} onChange={t => { setSaved(false); setTask(t); }} rows={1} ph="The chemistry report" />
        <Rate label="Confidence: can I actually do it?" value={e} max={10} step={1} onChange={n => { setSaved(false); setE(n); }} lo="No idea how" hi="Sure I can" />
        <Rate label="Value: does it matter to me?" value={v} max={10} step={1} onChange={n => { setSaved(false); setV(n); }} lo="Pointless" hi="Matters a lot" />
        <Rate label="Delay: how far away is the payoff or deadline?" value={d} max={10} step={1} onChange={n => { setSaved(false); setD(n); }} lo="Right now" hi="Far away" />
        <Rate label="Distraction: how tempting are other things?" value={i} max={10} step={1} onChange={n => { setSaved(false); setI(n); }} lo="Not at all" hi="Very" /></Card>
      <Card><div className="text-sm text-muted-foreground">Pull to start</div><div className="text-3xl font-semibold">{idx}<span className="text-base font-normal text-muted-foreground"> / 100</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${idx}%` }} /></div><Help>50 means the pull to start and the pull to avoid are even. Below 50, avoiding wins.</Help></Card>
      {adv.top.map(a => <Card key={a.key}><div className="text-sm font-semibold">{a.name} is the lever that helps most (+{a.gain} points)</div><p className="mt-1 text-sm">{a.fix}</p><button onClick={() => go(a.tool)} className={cls + " mt-2"}>{a.label}</button></Card>)}
      {!saved ? <Primary disabled={task.trim().length < 3} onClick={() => { update(m => ({ ...m, tmt: [...m.tmt, { ts: Date.now(), task: task.trim().slice(0, 60), e, v, d, i }] })); setSaved(true); done("why"); }}>Save</Primary> : <Saved text="Saved." />}
      {hist.length > 1 && <Help>Your usual weakest lever across these: {(() => { const s = { e: avg(hist.map(h => h.e)), v: avg(hist.map(h => h.v)), d: 10 - avg(hist.map(h => h.d)), i: 10 - avg(hist.map(h => h.i)) }; const k = (Object.keys(s) as (keyof typeof s)[]).sort((a, b) => s[a] - s[b])[0]; return TMT_LEVERS[k].name; })()}.</Help>}
    </Screen>
  );
}

/** Temptation bundling: pair something you want with something you should do, and only allow it together. */
export function Bundle({ mind, update, done, back, onStart }: MindProps) {
  const [want, setWant] = useState(""); const [should, setShould] = useState(""); const [saved, setSaved] = useState(false);
  return (
    <Screen title="Reward pairing" sub="Save a treat for the hard thing. You only get it while you do the task." back={back} credit="Temptation bundling (Milkman, Minson, Volpp 2014). A 2020 digital field experiment with unrestricted audiobook access raised gym visits, about half as strongly as the in-person version.">
      <Card className="space-y-3"><div className="text-sm font-medium">The treat (only during the task)</div><div className="flex flex-wrap gap-2">{BUNDLE_IDEAS.wants.map(w => <button key={w} onClick={() => { setSaved(false); setWant(w); }} className={`rounded-full border px-3 py-1.5 text-sm ${want === w ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60"}`}>{w}</button>)}</div>
        <Field label="Or your own" value={want} onChange={t => { setSaved(false); setWant(t); }} rows={1} /><Field label="The task it goes with" value={should} onChange={t => { setSaved(false); setShould(t); }} rows={1} ph="Folding laundry, or the first page of the report" /></Card>
      {want.trim() && should.trim() && <Card className="bg-primary/5 text-sm"><b>The rule:</b> I only get "{want.trim()}" while I am doing "{should.trim()}".</Card>}
      {!saved ? <Primary disabled={want.trim().length < 3 || should.trim().length < 3} onClick={() => { update(m => ({ ...m, bundles: [...m.bundles, { ts: Date.now(), want: want.trim(), should: should.trim(), used: 0 }] })); setSaved(true); done("bundle"); }}>Save this pairing</Primary> : <><Saved text="Saved." /><button onClick={() => onStart(should.trim().slice(0, 60), `Have "${want.trim().slice(0, 40)}" only while you do this`)} className={cls}>Start 2 minutes with the treat</button></>}
      {mind.bundles.length > 0 && <Card><div className="mb-1 text-sm font-semibold">Your pairings</div>{mind.bundles.slice(-4).reverse().map(b => <div key={b.ts} className="flex items-center justify-between gap-2 py-1 text-sm"><span>{b.want} + {b.should}</span><button onClick={() => { update(m => ({ ...m, bundles: m.bundles.map(x => (x.ts === b.ts ? { ...x, used: x.used + 1 } : x)) })); onStart(b.should.slice(0, 60), `Have "${b.want.slice(0, 40)}" only while you do this`); }} className="shrink-0 text-xs underline">Use again ({b.used})</button></div>)}</Card>}
    </Screen>
  );
}

/** Three good things: three things that went okay today and why. */
export function Good({ mind, update, done, back }: MindProps) {
  const [it, setIt] = useState([{ what: "", why: "" }, { what: "", why: "" }, { what: "", why: "" }]); const [saved, setSaved] = useState(false);
  const wk = mind.good.filter(g => Date.now() - g.ts < 7 * 864e5).length;
  return (
    <Screen title="Three good things" sub="Three things that went okay today, big or tiny, and why they happened." back={back} credit="Seligman et al. 2005; meta-analyses show a modest benefit for well-being (d = 0.31 vs measurement-only, but about 0.14 vs other active exercises). Small and steady, not magic. Do it for a week and see how you feel.">
      {it.map((x, i) => <Card key={i} className="space-y-2"><Field label={`Good thing ${i + 1}`} value={x.what} onChange={t => setIt(a => a.map((y, j) => (j === i ? { ...y, what: t } : y)))} rows={1} ph="The bus was on time" /><Field label="Why did it happen, or why does it matter?" value={x.why} onChange={t => setIt(a => a.map((y, j) => (j === i ? { ...y, why: t } : y)))} rows={1} /></Card>)}
      {!saved ? <Primary disabled={it.filter(x => x.what.trim().length > 2).length < 1} onClick={() => { update(m => ({ ...m, good: [...m.good, { ts: Date.now(), items: it.filter(x => x.what.trim()).map(x => ({ what: x.what.trim(), why: x.why.trim() })) }] })); setSaved(true); done("good"); }}>Save</Primary> : <Saved text="Saved. Sleep well." />}
      <Help>{wk} of the last 7 days done.</Help>
    </Screen>
  );
}

const URGES = ["Scrolling my phone", "Checking messages", "Snacking", "Starting a different task", "Something else"];
const SURF = ["Notice the urge. Where do you feel it in your body?", "Breathe out slowly. You do not have to act on it.", "Watch it like a wave: it rises, peaks, and falls.", "Stay curious. What is it doing right now?", "You are riding it. It is already changing."];
/** Urge surfing: 90 seconds of watching a pull to distract yourself rise and fall, with before and after ratings. */
export function Urge({ mind, update, done, back }: MindProps) {
  const [what, setWhat] = useState<string | null>(null); const [s0, setS0] = useState(6); const [run, setRun] = useState(false); const [left, setLeft] = useState(90); const [pk, setPk] = useState(7); const [end, setEnd] = useState(4); const [fin, setFin] = useState(false); const t0 = useRef(0);
  useEffect(() => { if (!run) return; t0.current = Date.now(); const id = window.setInterval(() => { const l = 90 - Math.floor((Date.now() - t0.current) / 1000); setLeft(Math.max(0, l)); if (l <= 0) { window.clearInterval(id); setRun(false); setFin(true); } }, 500); return () => window.clearInterval(id); }, [run]);
  const drops = mind.urges.map(u => u.start - u.end);
  return (
    <Screen title="Ride the urge" sub="When you feel pulled to scroll or switch tasks, watch the pull for 90 seconds instead of obeying it." back={back} credit="Urge surfing (Marlatt; mindfulness-based relapse prevention). Evidence is mixed: some trials show less craving-driven behaviour, others find no short-term drop in craving. That is why this logs your own before and after.">
      {!run && !fin && <><Card className="space-y-3"><div className="text-sm font-medium">What is pulling you?</div><Pills value={what} onChange={setWhat} label="Urge" options={URGES.map(u => ({ v: u, label: u }))} /><Rate label="How strong is it right now?" value={s0} max={10} step={1} onChange={setS0} /></Card><Primary disabled={!what} onClick={() => setRun(true)}>Ride it for 90 seconds</Primary></>}
      {run && <Card className="flex flex-col items-center py-8"><div className="text-5xl font-semibold tabular-nums">{left}</div><p className="mt-4 max-w-xs text-center text-lg" aria-live="polite">{SURF[Math.min(SURF.length - 1, Math.floor((90 - left) / 18))]}</p><button onClick={() => { setRun(false); setFin(true); }} className="mt-4 text-sm text-muted-foreground underline">Stop</button></Card>}
      {fin && <><Card className="space-y-3"><Rate label="How strong did it get at its peak?" value={pk} max={10} step={1} onChange={setPk} /><Rate label="How strong is it now?" value={end} max={10} step={1} onChange={setEnd} /></Card>
        {!mind.urges.some(u => Date.now() - u.ts < 1000) && <Primary onClick={() => { update(m => ({ ...m, urges: [...m.urges, { ts: Date.now(), what: what ?? "", start: s0, peak: pk, end }] })); done("urge"); back(); }}>Save</Primary>}</>}
      {drops.length >= 3 && <Help>Across {drops.length} tries the pull fell by {avg(drops)} points on average. {avg(drops) <= 0 ? "It may not work for you. That is useful to know." : "It tends to work for you."}</Help>}
    </Screen>
  );
}

/** A short weekly review that uses your own numbers. */
export function Review({ mind, update, done, back }: MindProps) {
  const wk = Date.now() - 7 * 864e5; const starts = loadLog().starts.filter(s => s.ts > wk).length; const used = [mind.tlx, mind.woop, mind.thoughts, mind.pm, mind.wind, mind.calm, mind.good ?? [], mind.sleep ?? [], mind.pulse ?? []].reduce((a, l) => a + l.filter(x => x.ts > wk).length, 0);
  const pm = mind.pm.filter(e => e.ts > wk); const tlx = mind.tlx.filter(t => t.ts > wk);
  const [best, setBest] = useState(""); const [hard, setHard] = useState(""); const [focus, setFocus] = useState(""); const [plan, setPlan] = useState(""); const [saved, setSaved] = useState(false);
  return (
    <Screen title="Weekly review" sub="Three minutes. Look back, learn one thing, set one focus." back={back} credit="Self-monitoring and reflection with a concrete next step (if-then plan) are core parts of behaviour-change interventions.">
      <Card><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This week in numbers</div><div className="mt-1 text-sm">{starts} start{starts === 1 ? "" : "s"} · {used} Mind entr{used === 1 ? "y" : "ies"}{tlx.length ? ` · task load average ${avg(tlx.map(t => t.raw))}` : ""}{pm.length ? ` · ${pm.length} pleasure and mastery log${pm.length > 1 ? "s" : ""}` : ""}</div></Card>
      <Card className="space-y-3"><Field label="What went best this week?" value={best} onChange={setBest} rows={2} /><Field label="What was hardest, and what did it tell you?" value={hard} onChange={setHard} rows={2} /><Field label="One focus for next week" value={focus} onChange={setFocus} rows={1} ph="Start before 10am on weekdays" /><Field label="If-then plan for it" hint="If [situation], then I will [action]" value={plan} onChange={setPlan} rows={2} ph="If it is 9:30 and I am not started, then I will open the file and write one line" /></Card>
      {!saved ? <Primary disabled={focus.trim().length < 3 || plan.trim().length < 5} onClick={() => { update(m => ({ ...m, reviews: [...m.reviews, { ts: Date.now(), best: best.trim(), hard: hard.trim(), focus: focus.trim(), plan: plan.trim() }] })); setSaved(true); done("review"); }}>Save my review</Primary> : <Saved text="Saved. See you next week." />}
    </Screen>
  );
}

/** Ten-second energy and mood taps, plus your own energy map across the day. */
export function Pulse({ mind, update, done, back }: MindProps) {
  const [e, setE] = useState<number | null>(null); const [m, setM] = useState<number | null>(null); const [saved, setSaved] = useState(false);
  const map = energyMap(mind.pulse); const best = map.filter(b => b.e != null && b.count >= 2).sort((a, z) => z.e! - a.e!)[0];
  return (
    <Screen title="10-second pulse" sub="Two taps. Over a couple of weeks you get your own energy map, which beats a generic morning-person quiz." back={back} credit="Experience sampling (momentary self-report). Research on chronotype quizzes finds little main effect on performance, so this uses your real data instead (systematic review, 2025).">
      <Card className="space-y-3"><div><div className="mb-1 text-sm font-medium">Energy right now</div><Pills value={e} onChange={setE} label="Energy" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Drained", "Low", "Okay", "Good", "Buzzing"][n - 1] }))} /></div>
        <div><div className="mb-1 text-sm font-medium">Mood right now</div><Pills value={m} onChange={setM} label="Mood" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Low", "Down", "Okay", "Good", "Great"][n - 1] }))} /></div></Card>
      {!saved ? <Primary disabled={e == null || m == null} onClick={() => { update(x => ({ ...x, pulse: [...x.pulse, { ts: Date.now(), e: e!, m: m! }] })); setSaved(true); done("pulse"); }}>Save</Primary> : <Saved text="Saved." />}
      <Card><div className="mb-2 text-sm font-semibold">Your energy through the day</div>{map.map(b => <div key={b.n} className="mb-1 flex items-center gap-2 text-sm"><span className="w-36 shrink-0 text-muted-foreground">{b.n}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${b.e ? (b.e / 5) * 100 : 0}%` }} /></div><span className="w-14 shrink-0 text-end text-xs text-muted-foreground">{b.e ? `${b.e} (${b.count})` : "-"}</span></div>)}
        <Help>{best ? `Your best window so far: ${best.n.split(" (")[0].toLowerCase()}. Put your hardest task there.` : "Tap in at different times for a week and your best window appears."}</Help></Card>
    </Screen>
  );
}

/** Your data: export, a printable summary to share with a clinician, and delete. */
export function Data({ mind, back }: MindProps) {
  const [sure, setSure] = useState(false); const [msg, setMsg] = useState("");
  const dl = (name: string, body: string, type: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([body], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  const summary = () => {
    const f = (ts: number) => new Date(ts).toLocaleDateString(); const rows: string[] = [];
    (Object.keys(INSTRUMENTS) as (keyof typeof INSTRUMENTS)[]).forEach(id => { const h = mind.checks.filter(c => c.id === id); if (!h.length) return; rows.push(`<h2>${esc(INSTRUMENTS[id].title)}</h2><table><tr><th>Date</th><th>Score</th><th>Band</th></tr>${h.map(c => { const r = scoreOf(id, c.a); return `<tr><td>${f(c.ts)}</td><td>${fmtScore(id, r)}</td><td>${esc(r.band)}</td></tr>`; }).join("")}</table><p class="s">${esc(INSTRUMENTS[id].credit)}</p>`); });
    if (mind.sleep.length) rows.push(`<h2>Sleep diary (last 14)</h2><table><tr><th>Date</th><th>Time asleep</th><th>Efficiency</th><th>Rested (1-5)</th></tr>${mind.sleep.slice(-14).map(n => { const s = sleepNight(n); return `<tr><td>${n.day}</td><td>${Math.floor(s.tst / 60)}h ${s.tst % 60}m</td><td>${s.se}%</td><td>${n.q}</td></tr>`; }).join("")}</table>`);
    if (mind.tlx.length) rows.push(`<h2>Task load (NASA-TLX raw, last 10)</h2><table><tr><th>Date</th><th>Task</th><th>Score</th></tr>${mind.tlx.slice(-10).map(t => `<tr><td>${f(t.ts)}</td><td>${esc(t.task)}</td><td>${t.raw}</td></tr>`).join("")}</table>`);
    if (mind.wheel.length) rows.push(`<h2>Wellbeing wheel (latest)</h2><p>${WHEEL.map((w, i) => `${w.label} ${mind.wheel[mind.wheel.length - 1].v[i]}/10`).join(", ")}</p>`);
    return `<!doctype html><meta charset="utf-8"><title>Lagomo Mind summary</title><style>body{font:14px system-ui;max-width:720px;margin:2rem auto;padding:0 1rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 8px;text-align:left}.s{color:#666;font-size:11px}</style><h1>Lagomo Mind summary</h1><p>Self-reported on ${new Date().toLocaleDateString()}. Screening checks only; not a diagnosis. Generated on the person's own device and shared by them.</p>${rows.join("") || "<p>No data yet.</p>"}`;
  };
  return (
    <Screen title="Your data" sub="Everything in Mind is stored on this device only. You can take it, print it, or delete it." back={back}>
      <Card className="space-y-2"><div className="text-sm font-semibold">Take it with you</div>
        <button onClick={() => dl("lagomo-mind.json", JSON.stringify(mind, null, 2), "application/json")} className={ghost + " w-full"}>Download everything (JSON)</button>
        <button onClick={() => dl("lagomo-mind-summary.html", summary(), "text/html")} className={ghost + " w-full"}>Download a summary to print or show a clinician</button>
        <Help>The summary has your check-in scores, sleep and task-load history. Open it in a browser and print it. You choose who sees it.</Help></Card>
      <Card className="space-y-2"><div className="text-sm font-semibold">Delete Mind data</div>{!sure ? <button onClick={() => setSure(true)} className={ghost + " w-full"}>Delete everything in Mind</button> : <div className="space-y-2"><p className="text-sm">This removes every check, plan, diary and exercise from this device. It cannot be undone.</p><div className="flex gap-2"><button onClick={() => { saveMind(emptyMind()); setSure(false); setMsg("Deleted."); }} className="rounded-full bg-destructive px-4 py-2 text-sm text-destructive-foreground">Yes, delete</button><button onClick={() => setSure(false)} className={ghost}>Keep</button></div></div>}{msg && <Saved text={msg} />}</Card>
    </Screen>
  );
}
void sameDay;
