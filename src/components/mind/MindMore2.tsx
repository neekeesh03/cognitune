import { useEffect, useState } from "react";
import { BODY, DAY_MS, FEELINGS, GUESS_TYPES, analyseTrial, dayOf, multiplier, newCard, parseCards, planDays, queue, resetPile, review, routeFeeling, suggest, todayArm, trialVerdict, type Rating, type Trial } from "@/engine/mind2";
import { avg } from "@/engine/mind";
import { toolEfficacy } from "@/engine/insights";
import { saveTomorrow } from "@/engine/director";
import { Card, Field, Help, Pills, Primary, Rate, Saved, Screen, SupportCard, type MindProps } from "@/components/mind/MindParts";

const cls = "rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"; const ghost = "rounded-full border border-border px-4 py-2 text-sm";

/** Recall Deck: spaced retrieval practice. Paste notes as "question :: answer" and get a small daily set. */
export function Deck({ mind, update, done, back }: MindProps) {
  const [mode, setMode] = useState<"home" | "add" | "study">("home"); const [paste, setPaste] = useState(""); const [added, setAdded] = useState(0);
  const [i, setI] = useState(0); const [show, setShow] = useState(false); const [session, setSession] = useState<{ ids: string[]; good: number; n: number } | null>(null); const [q1, setQ1] = useState(""); const [a1, setA1] = useState("");
  const qs = queue(mind.deck); const cur = session ? mind.deck.find(c => c.id === session.ids[i]) : null;
  const start = () => { const ids = qs.today.map(c => c.id); if (!ids.length) return; setSession({ ids, good: 0, n: 0 }); setI(0); setShow(false); setMode("study"); };
  const rate = (r: Rating) => {
    if (!cur || !session) return; update(m => ({ ...m, deck: m.deck.map(c => (c.id === cur.id ? review(c, r) : c)) })); const g = session.good + (r === "good" || r === "easy" ? 1 : 0); const n = session.n + 1;
    if (i + 1 >= session.ids.length) { update(m => ({ ...m, deckLog: [...m.deckLog, { ts: Date.now(), n, good: g }] })); done("deck"); setSession({ ...session, good: g, n }); setI(session.ids.length); } else { setSession({ ...session, good: g, n }); setI(i + 1); setShow(false); }
  };
  const addCards = () => { const parsed = parseCards(paste); const cards = [...parsed, ...(q1.trim() && a1.trim() ? [{ q: q1, a: a1 }] : [])].map(c => newCard(c.q, c.a)); if (!cards.length) return; update(m => ({ ...m, deck: [...m.deck, ...cards] })); setAdded(cards.length); setPaste(""); setQ1(""); setA1(""); };
  const finished = session && i >= session.ids.length;
  return (
    <Screen title="Recall deck" sub="Testing yourself beats rereading. Cards come back just before you would forget them." back={back} credit="Practice testing raised achievement by g = 0.50 across 222 classroom studies; spaced retrieval beat massed by g = 0.74 (2021 meta-analyses). Highlighting and rereading rate low (Dunlosky et al. 2013). Scheduler: SM-2 (public); expanding vs even spacing made no difference.">
      {mode === "study" && session && (finished ? <><Card className="text-center"><div className="text-3xl font-semibold">{session.good} of {session.n}</div><div className="text-sm text-muted-foreground">felt solid. Misses come back soon, solid ones later.</div></Card><Primary onClick={() => { setMode("home"); setSession(null); }}>Done</Primary></>
        : cur && <><Card><div className="text-xs text-muted-foreground">Card {i + 1} of {session.ids.length}</div><p className="mt-2 text-lg font-medium" translate="no">{cur.q}</p>
          {show ? <p className="mt-3 rounded-2xl bg-primary/10 p-3 text-base" translate="no">{cur.a}</p> : <button onClick={() => setShow(true)} className={cls + " mt-4"}>Show answer</button>}</Card>
          {show && <div className="grid grid-cols-4 gap-2">{([["again", "Again"], ["hard", "Hard"], ["good", "Good"], ["easy", "Easy"]] as const).map(([r, l]) => <button key={r} onClick={() => rate(r)} className="rounded-2xl border border-border bg-background/70 px-2 py-3 text-sm hover:bg-secondary/70">{l}</button>)}</div>}
          <Help>Try to answer in your head before you tap Show answer. That effort is what makes it work.</Help></>)}
      {mode === "home" && <>
        <Card><div className="text-sm text-muted-foreground">Today</div><div className="text-2xl font-semibold">{qs.today.length} card{qs.today.length === 1 ? "" : "s"} · about {Math.max(1, Math.round(qs.today.length * 0.3))} min</div>
          <div className="text-xs text-muted-foreground">{mind.deck.length} in your deck{qs.overdue > 0 ? ` · ${qs.overdue} more waiting` : ""}</div>
          <div className="mt-3 flex flex-wrap gap-2"><button disabled={!qs.today.length} onClick={start} className={cls + " disabled:opacity-40"}>Start 2 minutes</button><button onClick={() => setMode("add")} className={ghost}>Add cards</button>
            {qs.overdue > 5 && <button onClick={() => update(m => ({ ...m, deck: resetPile(m.deck) }))} className={ghost}>Reset the pile</button>}</div>
          {qs.overdue > 5 && <Help>A big pile is fine. "Reset the pile" spreads it over the next days. Nothing is lost.</Help>}</Card>
        {mind.deckLog.length > 0 && <Card><div className="text-sm font-semibold">Your sessions</div><Help>{mind.deckLog.length} sessions · {mind.deckLog.reduce((a, d) => a + d.n, 0)} cards reviewed · {Math.round((100 * mind.deckLog.reduce((a, d) => a + d.good, 0)) / Math.max(1, mind.deckLog.reduce((a, d) => a + d.n, 0)))}% felt solid</Help></Card>}</>}
      {mode === "add" && <Card className="space-y-3"><Field label="Paste notes, one card per line" hint='Format: question :: answer   (or question | answer)' value={paste} onChange={setPaste} rows={6} ph={"What does ATP stand for? :: Adenosine triphosphate\nCapital of Nepal :: Kathmandu"} />
        <div className="text-xs text-muted-foreground">Or one card:</div><Field label="Question" value={q1} onChange={setQ1} rows={1} /><Field label="Answer" value={a1} onChange={setA1} rows={1} />
        <div className="flex gap-2"><div className="flex-1"><Primary onClick={addCards} disabled={!paste.trim() && !(q1.trim() && a1.trim())}>Add</Primary></div><button onClick={() => setMode("home")} className={ghost}>Back</button></div>
        {added > 0 && <Saved text={`${added} card${added > 1 ? "s" : ""} added. Up to 5 new cards a day.`} />}<Help>Write cards as questions you must answer from memory, not as things to reread. Your cards stay on this device.</Help></Card>}
    </Screen>
  );
}

/** Guess the time: estimate, do it, compare. Your own history gives you a multiplier. */
export function GuessTime({ mind, update, done, back, onStart }: MindProps) {
  const open = mind.guesses.filter(g => !g.actual); const [task, setTask] = useState(""); const [type, setType] = useState<string | null>(null); const [g, setG] = useState(20); const [actual, setActual] = useState<Record<string, number>>({}); const [made, setMade] = useState<string | null>(null);
  const mult = multiplier(mind.guesses, type ?? undefined); const sug = suggest(g, mult);
  return (
    <Screen title="Guess the time" sub="Guess how long it will take, then see what really happens. Your own numbers beat a general rule." back={back} credit="Estimate-then-compare reduced underestimation in lab studies (feedback, unpacking tasks into steps). Evidence for field effects is thin and one feedback study found no benefit, so treat this as planning help, not training.">
      {open.map(o => <Card key={o.id} className="space-y-2"><div className="text-xs text-muted-foreground">Waiting for the result</div><div className="font-medium">{o.task}</div><div className="text-sm">You guessed {o.guess} min. How long did it take?</div>
        <div className="flex items-center gap-2"><input type="number" min={1} max={600} value={actual[o.id] ?? ""} onChange={e => setActual(a => ({ ...a, [o.id]: +e.target.value }))} className="w-24 rounded-2xl border border-input bg-background/70 px-3 py-2 text-sm" aria-label="Minutes it took" /><span className="text-sm">min</span>
          <button disabled={!actual[o.id]} onClick={() => { update(m => ({ ...m, guesses: m.guesses.map(x => (x.id === o.id ? { ...x, actual: actual[o.id] } : x)) })); done("guess"); }} className={cls + " disabled:opacity-40"}>Save</button></div></Card>)}
      <Card className="space-y-3"><Field label="What are you about to do?" value={task} onChange={t => { setMade(null); setTask(t); }} rows={1} ph="Write the methods section" /><Pills value={type} onChange={setType} label="Type" options={GUESS_TYPES.map(t => ({ v: t, label: t }))} />
        <Rate label="My guess (minutes)" value={g} onChange={setG} max={120} step={5} />
        {mult ? <Help>On {mult.scope} things usually take you about <b>{mult.x}x</b> your guess (from {mult.n} tasks). A safer plan: <b>{sug} min</b>.</Help> : <Help>After 3 finished guesses you will see your personal multiplier here.</Help>}</Card>
      {!made ? <Primary disabled={task.trim().length < 3 || !type} onClick={() => { const id = crypto.randomUUID(); update(m => ({ ...m, guesses: [...m.guesses, { id, ts: Date.now(), task: task.trim().slice(0, 60), type: type!, guess: g }] })); setMade(id); }}>Save my guess</Primary> : <><Saved text="Saved. Do it, then come back and enter how long it took." /><button onClick={() => onStart(task.trim().slice(0, 60), "Break it into 3 steps and do step one")} className={cls}>Start 2 minutes now</button></>}
    </Screen>
  );
}

/** Handle a feeling: name it precisely, rate it, then pick a strategy that fits how intense it is. */
export function Feel({ mind, update, done, back, go }: MindProps) {
  const [step, setStep] = useState(0); const [fam, setFam] = useState<string | null>(null); const [word, setWord] = useState<string | null>(null); const [body, setBody] = useState<string | null>(null); const [because, setBecause] = useState(""); const [inten, setInten] = useState(5); const [after, setAfter] = useState(4);
  const route = routeFeeling(inten); const hist = mind.feelings;
  return (
    <Screen title="Handle a feeling" sub="Name it exactly, then choose what to do based on how strong it is." back={back} credit="Strategy fit: reappraisal d = 0.36 and perspective-taking d = 0.45, distraction 0.27; suppressing the feeling itself about zero or worse (Webb et al. 2012). Choosing distraction when intense and reappraisal when mild is a heuristic (Sheppes), not a law. Naming feelings precisely: early evidence.">
      {step === 0 && <><Card className="space-y-3"><div className="text-sm font-medium">Which family is closest?</div><Pills value={fam} onChange={v => { setFam(v); setWord(null); }} label="Feeling family" options={Object.keys(FEELINGS).map(k => ({ v: k, label: k.replace(" family", "") }))} />
        {fam && <><div className="text-sm font-medium">Which word fits best?</div><Pills value={word} onChange={setWord} label="Feeling word" options={FEELINGS[fam].map(w => ({ v: w, label: w }))} /></>}
        <div className="text-sm font-medium">Where do you feel it in your body?</div><Pills value={body} onChange={setBody} label="Body" options={BODY.map(b => ({ v: b, label: b }))} /></Card><Primary disabled={!word || !body} onClick={() => setStep(1)}>Next</Primary></>}
      {step === 1 && <><Card className="space-y-3"><div className="font-medium">{word} · in your {body!.toLowerCase()}</div><Field label="What is it about?" hint='Finish the sentence: "I feel this because..."' value={because} onChange={setBecause} rows={2} /><Rate label="How strong is it right now?" value={inten} max={10} step={1} onChange={setInten} lo="Faint" hi="Overwhelming" /></Card><Primary disabled={because.trim().length < 3} onClick={() => setStep(2)}>What should I do?</Primary></>}
      {step === 2 && <><Card className={route.kind === "urgent" ? "border border-destructive/40" : ""}><div className="text-lg font-semibold">{route.title}</div><ul className="mt-2 space-y-2 text-sm">{route.steps.map(s => <li key={s}>• {s}</li>)}</ul>
        <div className="mt-3 flex flex-wrap gap-2">{route.kind !== "reappraise" && <button onClick={() => go("breathe")} className={cls}>Slow breathing</button>}{route.kind === "reappraise" && <button onClick={() => go("thoughts")} className={cls}>Look at the thought</button>}<button onClick={() => go("kind")} className={ghost}>Kind reset</button></div></Card>
        {(() => { const e = toolEfficacy(mind).find(x => x.n >= 3 && x.shrunk > 0.1 && ["breathe", "kind", "brk", "skills", "feel"].includes(x.view)); return e && route.kind !== "urgent" ? <Card className="bg-primary/5"><div className="text-xs font-semibold uppercase tracking-wide text-primary">What has worked best for you</div><div className="mt-1 text-sm">{e.name} (used {e.n} times, average relief {Math.round(e.mean * 100)}%)</div></Card> : null; })()}{route.kind === "urgent" && <SupportCard strong />}<Help>Never try to push the feeling away. Naming it and choosing what to do is the skill.</Help><Primary onClick={() => setStep(3)}>I tried something</Primary></>}
      {step === 3 && <><Card className="space-y-3"><Rate label="How strong is it now?" value={after} max={10} step={1} onChange={setAfter} /></Card><Primary onClick={() => { update(m => ({ ...m, feelings: [...m.feelings, { ts: Date.now(), word: word!, body: body!, because: because.trim(), before: inten, after, route: route.kind }] })); setStep(4); done("feel"); }}>Save</Primary></>}
      {step === 4 && <><Saved text={after < inten ? `Down from ${inten} to ${after}.` : "Saved. Some feelings take time. Naming it still counts."} /><button onClick={back} className={ghost}>Done</button></>}
      {hist.length >= 3 && step < 2 && <Help>You have named {hist.length} feelings. The one you name most: {(() => { const c = new Map<string, number>(); hist.forEach(h => c.set(h.word, (c.get(h.word) ?? 0) + 1)); return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0]; })()}.</Help>}
    </Screen>
  );
}

const SLOTS = ["After dinner (7pm)", "Early evening (6pm)", "Mid-afternoon (3pm)", "Before bed (9pm)"];
/** Worry parking: if you can act on a worry, take one tiny step; if not, park it for a short daily worry time. */
export function Worry({ mind, update, done, back, onStart }: MindProps) {
  const [w, setW] = useState(""); const [solS, setSolS] = useState<string | null>(null); const sol: boolean | null = solS === null ? null : solS === "yes"; const [step, setStep] = useState(""); const [slot, setSlot] = useState<string | null>("After dinner (7pm)"); const [saved, setSaved] = useState(false);
  const parked = mind.worries.filter(x => x.status === "parked"); const set = (id: string, status: "acted" | "released") => update(m => ({ ...m, worries: m.worries.map(x => (x.id === id ? { ...x, status } : x)) }));
  return (
    <Screen title="Worry parking" sub="Some worries need a step. Some only need a place to wait." back={back} credit="Worry postponement cut daily worry in 7 RCTs (n = 999); adding an if-then plan cut worry time by about 15 minutes in a 2025 trial; one large online trial found no effect for heavy worriers. If worry takes over your days for weeks, please talk to someone.">
      {parked.length > 0 && <Card className="space-y-2"><div className="text-sm font-semibold">Parked for worry time ({parked.length})</div>{parked.slice(-6).map(x => <div key={x.id} className="rounded-2xl bg-secondary/50 p-2 text-sm"><div>{x.w}</div><div className="mt-1 flex gap-2 text-xs"><button onClick={() => { set(x.id, "released"); done("worry"); }} className="underline">Let it go</button><button onClick={() => { saveTomorrow(x.w.slice(0, 60), "Take one tiny step on this"); set(x.id, "acted"); }} className="underline">It still matters: make a step</button></div></div>)}<Help>In your worry time, go through these. Many will have shrunk.</Help></Card>}
      <Card className="space-y-3"><Field label="What are you worried about?" value={w} onChange={t => { setSaved(false); setW(t); }} rows={2} />
        <div><div className="mb-1 text-sm font-medium">Is there something I can do about it in the next day or two?</div><Pills value={solS} onChange={setSolS} label="Solvable" options={[{ v: "yes", label: "Yes" }, { v: "no", label: "No, or not now" }]} /></div>
        {sol === true && <Field label="The smallest step" value={step} onChange={setStep} rows={1} ph="Email the registrar to ask about the deadline" />}
        {sol === false && <div><div className="mb-1 text-sm font-medium">Park it for a 15-minute worry time</div><Pills value={slot} onChange={setSlot} label="Slot" options={SLOTS.map(s => ({ v: s, label: s }))} /><Help>When the worry shows up before then, tell it: "Not now, I have a time for you."</Help></div>}</Card>
      {!saved ? <Primary disabled={w.trim().length < 3 || sol === null || (sol && step.trim().length < 3)} onClick={() => { update(m => ({ ...m, worries: [...m.worries, { id: crypto.randomUUID(), ts: Date.now(), w: w.trim().slice(0, 120), solvable: !!sol, step: step.trim(), slot: sol ? "" : slot ?? "", status: sol ? "acted" : "parked" }] })); setSaved(true); done("worry"); }}>Save</Primary>
        : <><Saved text={sol ? "Saved. Do the step when you can." : "Parked. It can wait."} />{sol && <button onClick={() => onStart(step.slice(0, 60), "Just the first two minutes")} className={cls}>Start 2 minutes now</button>}</>}
    </Screen>
  );
}

/** Loop breaker: move from abstract "why" and "what if" thinking to concrete "what" and "how". */
export function Loop({ update, done, back, onStart }: MindProps) {
  const [step, setStep] = useState(0); const [loop, setLoop] = useState(""); const [how, setHow] = useState(""); const [next, setNext] = useState(""); const [b, setB] = useState(7); const [a, setA] = useState(4);
  return (
    <Screen title="Break a thought loop" sub="Going over and over something? Move from 'why' and 'what if' to 'what exactly' and 'what next'." back={back} credit="Rumination-focused CBT (Watkins): concrete, how-focused thinking instead of abstract why-focused thinking. Web versions reduced rumination in students; later trials found it not clearly better than psychoeducation, so treat it as a tool to try.">
      {step === 0 && <><Card className="space-y-3"><Field label="What is the loop?" hint="The thought you keep replaying." value={loop} onChange={setLoop} rows={2} ph="Why did I say that in the meeting? What if they think I'm incompetent?" /><Rate label="How strong is the pull right now?" value={b} max={10} step={1} onChange={setB} /></Card><Primary disabled={loop.trim().length < 5} onClick={() => setStep(1)}>Next</Primary></>}
      {step === 1 && <><Card className="space-y-3"><p className="text-sm">"Why" and "what if" questions have no end. Switch to concrete ones.</p><Field label="What exactly happened? Only the facts a camera would record." value={how} onChange={setHow} rows={2} /><Field label="What is one thing within my control, and the smallest next step (5 minutes)?" value={next} onChange={setNext} rows={2} ph="Send a short clarifying message, or move on and prepare the next agenda item" /></Card><Primary disabled={how.trim().length < 3 || next.trim().length < 3} onClick={() => setStep(2)}>Next</Primary></>}
      {step === 2 && <><Card className="space-y-3"><div className="text-sm">Do the step for 5 minutes. Rumination loses its grip when your attention is busy with something concrete.</div><button onClick={() => onStart(next.slice(0, 60), "Five minutes, then stop")} className={cls}>Start 5 minutes</button><Rate label="How strong is the pull now?" value={a} max={10} step={1} onChange={setA} /></Card><Primary onClick={() => { update(m => ({ ...m, loops: [...m.loops, { ts: Date.now(), loop: loop.trim().slice(0, 150), how: how.trim(), next: next.trim(), before: b, after: a }] })); setStep(3); done("loop"); }}>Save</Primary></>}
      {step === 3 && <><Saved text={a < b ? `The pull went from ${b} to ${a}.` : "Saved. Loops can come back. Using the tool again is the practice."} /><button onClick={back} className={ghost}>Done</button></>}
    </Screen>
  );
}

const STMTS = ["My body is getting ready to help me. This feeling is energy.", "I have prepared more than I am giving myself credit for.", "Some nerves mean it matters. I can do it while nervous."];
/** Before the exam: reappraise the racing heart, start with what you know, check the nerves before and after. */
export function Exam({ update, done, back }: MindProps) {
  const [step, setStep] = useState(0); const [b, setB] = useState(7); const [blank, setBlank] = useState(5); const [ready, setReady] = useState(5); const [a, setA] = useState(5); const [st, setSt] = useState<string | null>(null);
  return (
    <Screen title="Before the exam" sub="Three minutes. Turn the nerves into fuel, and plan your first ten minutes." back={back} credit="Reappraising arousal as helpful improved exam scores in a randomised trial of 93 students (Jamieson 2016; small, early evidence). Expressive writing before exams is NOT included: a 2025 meta-analysis of 21 studies found negligible effects. This is not a treatment for test anxiety.">
      {step === 0 && <><Card className="space-y-3"><Rate label="How nervous are you?" value={b} max={10} step={1} onChange={setB} /><Rate label='"My mind might go blank"' value={blank} max={10} step={1} onChange={setBlank} lo="Not at all" hi="Very much" /><Rate label='"I feel ready"' value={ready} max={10} step={1} onChange={setReady} lo="Not at all" hi="Very much" /></Card><Primary onClick={() => setStep(1)}>Next</Primary></>}
      {step === 1 && <><Card><div className="text-lg font-semibold">A racing heart is your body helping you</div><p className="mt-2 text-sm">Your heart speeds up and you breathe faster because your body is sending more blood and oxygen to your brain and muscles. It is a resource, not a sign you will fail. Students told this did better than those told to calm down.</p></Card>
        <Card><div className="mb-1 text-sm font-medium">Pick the line you believe most</div><Pills value={st} onChange={setSt} label="Statement" options={STMTS.map(x => ({ v: x, label: x }))} /></Card><Primary disabled={!st} onClick={() => setStep(2)}>Next</Primary></>}
      {step === 2 && <><Card><div className="text-lg font-semibold">Your first ten minutes</div><ul className="mt-2 space-y-2 text-sm"><li>• Read all the questions once. Do the ones you know first. Early wins settle the mind.</li><li>• If you blank, write anything you do know about the topic, then return.</li><li>• Breathe out slowly before each section.</li></ul></Card><Card className="space-y-3"><Rate label="How nervous are you now?" value={a} max={10} step={1} onChange={setA} /></Card>
        <Primary onClick={() => { update(m => ({ ...m, exams: [...m.exams, { ts: Date.now(), before: b, after: a, blank, ready }] })); setStep(3); done("exam"); }}>Save and go</Primary></>}
      {step === 3 && <><Saved text={a < b ? `Nerves went from ${b} to ${a}. Good luck.` : "Saved. A little nervous is normal. You can do this nervous."} /><button onClick={back} className={ghost}>Done</button></>}
    </Screen>
  );
}

const BREAKS = ["Walk for 5 minutes", "Stretch and shoulders down", "Water and a snack", "Look away from screens", "Slow breathing", "Message a friend"];
/** Smart break: pick a break, rate your energy before and after, and learn which breaks actually help you. */
export function Break({ mind, update, done, back, go }: MindProps) {
  const [kind, setKind] = useState<string | null>(null); const [b, setB] = useState<number | null>(null); const [a, setA] = useState<number | null>(null); const [saved, setSaved] = useState(false);
  const by = new Map<string, number[]>(); mind.breaks.forEach(x => by.set(x.kind, [...(by.get(x.kind) ?? []), x.after - x.before])); const rank = [...by.entries()].filter(([, v]) => v.length >= 2).map(([k, v]) => ({ k, n: v.length, d: avg(v) })).sort((x, y) => y.d - x.d);
  const e5 = [1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Drained", "Low", "Okay", "Good", "Buzzing"][n - 1] }));
  return (
    <Screen title="Take a break" sub="Pick one, then see how it changes your energy. Over time it learns what works for you." back={back} credit="Short breaks raise vigour (d = 0.36) and cut fatigue (d = 0.35) but did not reliably improve performance (meta-analysis of 22 studies). Acute exercise bouts: g about 0.28 to 0.33 for executive function; no verified minimum dose.">
      {rank.length > 0 && <Card><div className="text-sm font-semibold">What lifts you most</div>{rank.slice(0, 3).map(r => <div key={r.k} className="flex justify-between text-sm"><span>{r.k}</span><span className="text-muted-foreground">{r.d >= 0 ? "+" : ""}{r.d} energy · {r.n}x</span></div>)}</Card>}
      <Card className="space-y-3"><Pills value={kind} onChange={v => { setSaved(false); setKind(v); }} label="Break" options={BREAKS.map(x => ({ v: x, label: x }))} />
        <div><div className="mb-1 text-sm font-medium">Energy before</div><Pills value={b} onChange={setB} label="Before" options={e5} /></div>
        {kind === "Slow breathing" && <button onClick={() => go("breathe")} className={ghost}>Open slow breathing</button>}
        <div><div className="mb-1 text-sm font-medium">Energy after (come back after your break)</div><Pills value={a} onChange={setA} label="After" options={e5} /></div></Card>
      {!saved ? <Primary disabled={!kind || b == null || a == null} onClick={() => { update(m => ({ ...m, breaks: [...m.breaks, { ts: Date.now(), kind: kind!, before: b!, after: a! }] })); setSaved(true); done("brk"); }}>Save</Primary> : <Saved text="Saved. Rest is part of working." />}
    </Screen>
  );
}

/** Park my place: leave a one-line note so coming back to an interrupted task is easy. */
export function Park({ mind, update, done, back, onStart }: MindProps) {
  const [task, setTask] = useState(""); const [line, setLine] = useState(""); const [saved, setSaved] = useState(false); const open = mind.park.filter(p => !p.resumed);
  return (
    <Screen title="Park my place" sub="About to stop or switch? Leave yourself one line so it is easy to come back." back={back} credit="Briefly planning how you will return to an interrupted task reduced attention residue in four studies (Organization Science, 2018). Keep it to one line so it never becomes another to-do pile.">
      {open.map(p => <Card key={p.id} className="space-y-1"><div className="text-xs text-muted-foreground">Waiting for you</div><div className="font-medium">{p.task}</div><div className="text-sm">{p.line}</div><div className="flex gap-2 pt-1"><button onClick={() => { update(m => ({ ...m, park: m.park.map(x => (x.id === p.id ? { ...x, resumed: Date.now() } : x)) })); onStart(p.task.slice(0, 60), p.line.slice(0, 100)); }} className={cls}>Pick up (2 min)</button><button onClick={() => update(m => ({ ...m, park: m.park.map(x => (x.id === p.id ? { ...x, resumed: Date.now() } : x)) }))} className={ghost}>Clear</button></div></Card>)}
      <Card className="space-y-3"><Field label="What are you working on?" value={task} onChange={t => { setSaved(false); setTask(t); }} rows={1} ph="Lab report" /><Field label="Where will you pick up?" hint="One line. The very next thing." value={line} onChange={t => { setSaved(false); setLine(t); }} rows={1} ph="Rewrite the second paragraph of the results" /></Card>
      {!saved ? <Primary disabled={task.trim().length < 2 || line.trim().length < 3} onClick={() => { update(m => ({ ...m, park: [...m.park, { id: crypto.randomUUID(), ts: Date.now(), task: task.trim().slice(0, 60), line: line.trim().slice(0, 140) }] })); setSaved(true); done("park"); }}>Park it</Primary> : <Saved text="Parked. It will be waiting on Today." />}
    </Screen>
  );
}

const QS = [{ q: "Does starting with a 2-minute timer help me begin?", a: "Start with a 2-minute timer", b: "Start without a timer", kind: "yesno" as const, out: "Did I start within 10 minutes?" },
  { q: "Does a short walk before work help my focus?", a: "5-minute walk first", b: "Straight to work", kind: "rating" as const, out: "How focused did I feel (1-5)?" },
  { q: "Does my phone in another room help?", a: "Phone in another room", b: "Phone nearby", kind: "yesno" as const, out: "Did I finish my planned block?" }];
/** Personal experiment: random days, two conditions, a daily one-tap result, and an honest answer with uncertainty. */
export function TrialTool({ mind, update, done, back }: MindProps) {
  const [sel, setSel] = useState<string | null>(mind.trials.find(t => !t.closed)?.id ?? null); const t = mind.trials.find(x => x.id === sel);
  const [pre, setPre] = useState<number | null>(null); const [q, setQ] = useState(""); const [a, setA] = useState(""); const [b, setB] = useState(""); const [kind, setKind] = useState<"yesno" | "rating">("yesno"); const [len, setLen] = useState(14); const [val, setVal] = useState<number | null>(null);
  useEffect(() => { if (pre != null) { setQ(QS[pre].q); setA(QS[pre].a); setB(QS[pre].b); setKind(QS[pre].kind); } }, [pre]);
  const create = () => { const tr: Trial = { id: crypto.randomUUID(), ts: Date.now(), question: q.trim(), a: a.trim(), b: b.trim(), kind, length: len, days: planDays(Date.now(), len) }; update(m => ({ ...m, trials: [...m.trials, tr] })); setSel(tr.id); };
  if (!t) return (
    <Screen title="Test what works for me" sub="Instead of trusting general advice, run a small experiment on yourself." back={back} credit="Personal (n-of-1) experiments with random day order and Bayesian analysis; with few days the result is uncertain, so the app shows how sure it is and starts from a neutral prior. Not a treatment, and not proof.">
      <Card className="space-y-3"><div className="text-sm font-medium">Start from an idea</div><Pills value={pre} onChange={setPre} label="Ideas" options={QS.map((x, i) => ({ v: i, label: x.q }))} />
        <Field label="Your question" value={q} onChange={setQ} rows={1} /><Field label="Condition A" value={a} onChange={setA} rows={1} /><Field label="Condition B" value={b} onChange={setB} rows={1} />
        <div><div className="mb-1 text-sm font-medium">Each day you will log</div><Pills value={kind} onChange={setKind} label="Outcome" options={[{ v: "yesno" as const, label: "Yes or no" }, { v: "rating" as const, label: "A 1 to 5 rating" }]} /></div>
        <div><div className="mb-1 text-sm font-medium">How long</div><Pills value={len} onChange={setLen} label="Days" options={[{ v: 10, label: "10 days" }, { v: 14, label: "14 days" }]} /></div></Card>
      <Primary disabled={q.trim().length < 5 || a.trim().length < 3 || b.trim().length < 3} onClick={create}>Start the experiment</Primary>
      {mind.trials.length > 0 && <Help>Past experiments: {mind.trials.length}.</Help>}
    </Screen>
  );
  const arm = todayArm(t); const res = analyseTrial(t); const logged = t.days.filter(d => d.val != null).length; const outcomeLabel = QS.find(x => x.a === t.a)?.out ?? (t.kind === "yesno" ? "Did it go well? (yes/no)" : "How did it go (1-5)?");
  const log = (v: number) => { update(m => ({ ...m, trials: m.trials.map(x => (x.id === t.id ? { ...x, days: x.days.map(d => (d.day === dayOf(Date.now()) ? { ...d, val: v } : d)) } : x)) })); setVal(null); done("trial"); };
  return (
    <Screen title="My experiment" sub={t.question} back={back} credit="Random day order in pairs, so both conditions get equal use. Analysis: Beta-Bernoulli (yes/no) or normal approximation (ratings) with a neutral prior.">
      <Card>{arm ? <><div className="text-xs uppercase tracking-wide text-muted-foreground">Today you do</div><div className="text-xl font-semibold">{arm.arm === "A" ? t.a : t.b}</div>
        {arm.val == null ? <div className="mt-3"><div className="mb-1 text-sm font-medium">{outcomeLabel}</div>{t.kind === "yesno" ? <Pills value={val} onChange={v => log(v)} label="Result" options={[{ v: 1, label: "Yes" }, { v: 0, label: "No" }]} /> : <Pills value={val} onChange={v => log(v)} label="Result" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: String(n) }))} />}</div> : <Saved text="Logged for today." />}</> : <p className="text-sm">No scheduled day today. Come back tomorrow, or check the answer below.</p>}</Card>
      <Card><div className="text-sm">{logged} of {t.days.length} days logged ({res.nA} for A, {res.nB} for B)</div>
        {res.ready ? <><div className="mt-2 font-medium">{trialVerdict(res.pAbetter, t.a, t.b)}</div><Help>{t.a}: {t.kind === "yesno" ? Math.round(res.meanA * 100) + "% yes" : res.meanA.toFixed(1)} · {t.b}: {t.kind === "yesno" ? Math.round(res.meanB * 100) + "% yes" : res.meanB.toFixed(1)}. A real result needs more days than most people log, so hold it loosely.</Help></> : <Help>After 3 logged days for each condition you will see a first answer.</Help>}</Card>
      <div className="flex gap-2"><button onClick={() => { update(m => ({ ...m, trials: m.trials.map(x => (x.id === t.id ? { ...x, closed: true } : x)) })); setSel(null); }} className={ghost}>Finish this experiment</button><button onClick={() => setSel(null)} className="text-sm text-muted-foreground underline">Start a new one</button></div>
      <span className="hidden">{DAY_MS}</span>
    </Screen>
  );
}
