import { useEffect, useRef, useState } from "react";
import { Card, Field, Help, Pills, Primary, Rate, Saved, Screen, SupportCard, type MindProps } from "@/components/mind/MindParts";
import { avg } from "@/engine/mind";

const cls = "rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"; const ghost = "rounded-full border border-border px-4 py-2 text-sm";
const day = (ts = Date.now()) => new Date(ts).toISOString().slice(0, 10);

// ---- Skill chooser. Original wording, inspired by distress-tolerance and emotion-regulation skills from DBT-style programmes. ----
const URGES: Record<string, string> = { act: "Do something right now (snap, send a message, quit)", hide: "Avoid it or hide", numb: "Shut down or go numb", spin: "Keep going over it in my head", body: "My body will not settle", hurt: "I want to hurt myself" };
interface Skill { id: string; name: string; steps: string[]; caution?: string }
const SKILLS: Record<string, Skill[]> = {
  act: [{ id: "stop", name: "STOP", steps: ["Stop. Freeze for a moment. Do not act yet.", "Take one slow breath, longer out than in.", "Observe: what am I feeling, what do I want to do, what are the facts?", "Proceed on purpose with one small, wise next move."] }, { id: "delay", name: "Delay 20 minutes", steps: ["Write what you want to say or do, but do not send or do it.", "Set a 20-minute timer. Do something else.", "Read it again. Keep it, soften it, or delete it."] }],
  hide: [{ id: "opp", name: "Tiny opposite action", steps: ["Ask: does this feeling fit the facts, or is it bigger than the situation?", "If it does not fit, or acting on it will hurt you, do the opposite in the smallest possible way.", "Examples: avoiding an email, so open it and read only the first line. Wanting to hide, so send one short message."], caution: "Do not use this for real danger, abuse or trauma. Those feelings are telling you something true." }],
  numb: [{ id: "soothe", name: "Soothe with the senses", steps: ["Sight: look at something you like.", "Sound: put on a calm song.", "Touch: a warm drink, a blanket, warm water on your hands.", "Smell and taste: something gentle, like tea or a fruit."] }, { id: "move", name: "Gentle movement", steps: ["Stand up and roll your shoulders.", "Walk to a window or around the room for two minutes.", "Notice your feet on the floor."] }],
  spin: [{ id: "accept", name: "Radical acceptance", steps: ["Say it: \"This is what is happening right now. I do not have to like it.\"", "Fighting the facts adds suffering on top of the pain.", "Now ask: what is one thing I can still choose today?"] }, { id: "loop", name: "Break the loop", steps: ["Use the Break a thought loop tool: from 'why' to 'what next'."] }],
  body: [{ id: "breath", name: "Paced breathing", steps: ["Breathe in for 4, out for 6, for two minutes.", "Make the out-breath slow and soft."] }, { id: "pmr", name: "Tense and release", steps: ["Tense your fists for 5 seconds, then let go completely.", "Do the same for your shoulders, then your face.", "Notice the difference between tight and loose."], caution: "Skip any muscle that is sore or injured." }],
};
/** Pick the urge, get a short skill, rate whether it helped. Never offers cold-water or intense exercise tricks. */
export function Skills({ mind, update, done, back, go }: MindProps) {
  const [urge, setUrge] = useState<string | null>(null); const [skill, setSkill] = useState<Skill | null>(null); const [h, setH] = useState<number | null>(null); const [saved, setSaved] = useState(false);
  const rank = new Map<string, number[]>(); mind.skills.forEach(s => rank.set(s.skill, [...(rank.get(s.skill) ?? []), s.helped])); const best = [...rank.entries()].filter(([, v]) => v.length >= 2).map(([k, v]) => ({ k, a: avg(v) })).sort((a, b) => b.a - a.a)[0];
  return (
    <Screen title="Skills for hard moments" sub="Pick what you feel like doing. You get a skill that fits, in plain words." back={back} credit="Wording is original, inspired by distress-tolerance and emotion-regulation skills from DBT-style programmes. In an app trial, regulation skills helped more than distress-management skills, and dropout was high, so keep it short and see what works for you.">
      {!skill && <><Card className="space-y-3"><div className="text-sm font-medium">Right now I feel like...</div><div className="grid gap-2">{Object.entries(URGES).map(([k, v]) => <button key={k} onClick={() => setUrge(k)} className={`rounded-2xl border px-3 py-3 text-start text-sm ${urge === k ? "border-primary bg-primary/10" : "border-border bg-background/60"}`}>{v}</button>)}</div></Card>
        {urge === "hurt" && <SupportCard strong />}
        {urge && urge !== "hurt" && <Card className="space-y-2"><div className="text-sm font-medium">Try one</div>{SKILLS[urge].map(s => <button key={s.id} onClick={() => setSkill(s)} className={ghost + " w-full text-start"}>{s.name}</button>)}</Card>}
        {best && <Help>What has helped you most so far: {best.k} ({best.a}/5).</Help>}</>}
      {skill && <><Card><div className="text-lg font-semibold">{skill.name}</div><ol className="mt-2 list-decimal space-y-2 ps-5 text-sm">{skill.steps.map(s => <li key={s}>{s}</li>)}</ol>{skill.caution && <p className="mt-2 text-xs text-muted-foreground">{skill.caution}</p>}
        <div className="mt-3 flex flex-wrap gap-2">{skill.id === "breath" && <button onClick={() => go("breathe")} className={cls}>Open the breathing guide</button>}{skill.id === "loop" && <button onClick={() => go("loop")} className={cls}>Open Break a thought loop</button>}</div></Card>
        <Card className="space-y-2"><div className="text-sm font-medium">Did it help?</div><Pills value={h} onChange={setH} label="Helped" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Not at all", "A little", "Some", "Quite", "A lot"][n - 1] }))} /></Card>
        {!saved ? <Primary disabled={h == null} onClick={() => { update(m => ({ ...m, skills: [...m.skills, { ts: Date.now(), urge: urge!, skill: skill.name, helped: h! }] })); setSaved(true); done("skills"); }}>Save</Primary> : <><Saved text="Saved." /><button onClick={() => { setSkill(null); setUrge(null); setH(null); setSaved(false); }} className={ghost}>Try another</button></>}</>}
    </Screen>
  );
}

const NEEDS = ["To be heard", "Respect", "Fairness", "Space", "Help", "An apology", "Safety", "Something else"];
/** Anger pause: slow the body, name the need underneath, and delay sending. No venting advice. */
export function Anger({ update, done, back }: MindProps) {
  const [step, setStep] = useState(0); const [trigger, setTrigger] = useState(""); const [b, setB] = useState(7); const [a, setA] = useState(4); const [need, setNeed] = useState<string | null>(null); const [draft, setDraft] = useState(""); const [left, setLeft] = useState(0); const [run, setRun] = useState(false); const [delayed, setDelayed] = useState(false); const t0 = useRef(0);
  useEffect(() => { if (!run) return; t0.current = Date.now(); const id = window.setInterval(() => { const l = 20 * 60 - Math.floor((Date.now() - t0.current) / 1000); setLeft(Math.max(0, l)); if (l <= 0) { window.clearInterval(id); setRun(false); setDelayed(true); } }, 1000); return () => window.clearInterval(id); }, [run]);
  return (
    <Screen title="Anger pause" sub="Anger is information. Cool the body first, then decide what to do with it." back={back} credit="Therapist-supported internet programmes for anger gave modest gains (d about 0.27 for expression, 0.41 for rumination); self-guided evidence in students is not established. Venting, punching or 'getting it out' is deliberately not suggested. If anyone could get hurt, step away and contact someone you trust or local services.">
      {step === 0 && <><Card className="space-y-3"><Field label="What set it off?" value={trigger} onChange={setTrigger} rows={2} /><Rate label="How strong is it?" value={b} max={10} step={1} onChange={setB} /></Card><Primary disabled={trigger.trim().length < 3} onClick={() => setStep(1)}>Next</Primary></>}
      {step === 1 && <><Card><div className="text-lg font-semibold">Cool the body first</div><ul className="mt-2 space-y-2 text-sm"><li>• Unclench your jaw and drop your shoulders.</li><li>• Breathe in for 4, out for 6, five times.</li><li>• Walk away from the screen or the person for a few minutes.</li></ul></Card><Card><div className="mb-1 text-sm font-medium">Underneath it, I need...</div><Pills value={need} onChange={setNeed} label="Need" options={NEEDS.map(n => ({ v: n, label: n }))} /></Card><Primary disabled={!need} onClick={() => setStep(2)}>Next</Primary></>}
      {step === 2 && <><Card className="space-y-3"><div className="text-sm font-medium">If you want to send something, write it here and do not send it yet.</div><Field label="Draft" value={draft} onChange={setDraft} rows={3} />
        {!run && !delayed && <button onClick={() => setRun(true)} className={cls}>Wait 20 minutes</button>}{run && <div className="text-center text-3xl font-semibold tabular-nums" aria-live="polite">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>}{delayed && <Saved text="20 minutes passed. Read it again. Keep it, soften it, or delete it." />}
        <button onClick={() => { setRun(false); setStep(3); }} className="text-sm text-muted-foreground underline">Skip the wait</button></Card></>}
      {step === 3 && <><Card><Rate label="How strong is it now?" value={a} max={10} step={1} onChange={setA} /></Card><Primary onClick={() => { update(m => ({ ...m, anger: [...m.anger, { ts: Date.now(), trigger: trigger.trim().slice(0, 120), need: need!, before: b, after: a, delayed }] })); setStep(4); done("anger"); }}>Save</Primary></>}
      {step === 4 && <><Saved text={a < b ? `Down from ${b} to ${a}.` : "Saved. Stepping back counts even when it does not drop yet."} /><button onClick={back} className={ghost}>Done</button></>}
    </Screen>
  );
}

const PHONE = [{ id: "batch", t: "Check notifications at set times, about 3 times a day", w: "Batching 3 times a day improved wellbeing in a trial of 237 people; hourly batching changed little." }, { id: "grey", t: "Turn the screen to grayscale during work", w: "Cut screen time right away in a field trial (N = 112), with no effect on wellbeing or grades." }, { id: "away", t: "Put the phone out of reach while you work", w: "Makes the urge cost effort. The claim that a nearby phone drains your thinking did not replicate, so this is about temptation, not brain drain." }, { id: "close", t: "Close apps you do not need, one tab only", w: "Fewer cues, fewer switches." }, { id: "wind", t: "Phone charges outside the bedroom", w: "Protects sleep onset." }];
/** Phone friction: a short checklist and a weekly "did it help" rating. Does not tell you to turn all notifications off (that increased anxiety in a trial). */
export function Phone({ mind, update, done, back }: MindProps) {
  const cur = mind.phone[mind.phone.length - 1]; const [on, setOn] = useState<string[]>(cur?.done ?? []); const [h, setH] = useState<number | null>(cur?.helped ?? null); const [saved, setSaved] = useState(false);
  return (
    <Screen title="Phone friction" sub="Make distraction a little harder and starting a little easier. Pick what suits you." back={back} credit="Notification batching (RCT n = 237), grayscale (field experiment N = 112) and blocking mobile internet for a month (2025) each helped something. Turning notifications off entirely increased anxiety and fear of missing out. Lagomo can only guide this, not change your phone.">
      <Card className="space-y-2">{PHONE.map(p => <label key={p.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={on.includes(p.id)} onChange={() => { setSaved(false); setOn(x => (x.includes(p.id) ? x.filter(y => y !== p.id) : [...x, p.id])); }} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" /><span><b>{p.t}</b><span className="block text-xs text-muted-foreground">{p.w}</span></span></label>)}</Card>
      <Card><div className="mb-1 text-sm font-medium">After a week: did it help you focus?</div><Pills value={h} onChange={setH} label="Helped" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["No", "A little", "Some", "Quite", "A lot"][n - 1] }))} /></Card>
      {!saved ? <Primary disabled={on.length === 0} onClick={() => { update(m => ({ ...m, phone: [...m.phone, { ts: Date.now(), done: on, helped: h ?? undefined }] })); setSaved(true); done("phone"); }}>Save</Primary> : <Saved text="Saved." />}
      <Help>Do not turn every notification off. Keep the ones from people you care about.</Help>
    </Screen>
  );
}

const ANCHORS = ["I pour my coffee or tea", "I sit down at my desk", "I get on the bus", "I finish dinner", "I brush my teeth", "I close my laptop", "I get home"];
/** Tiny anchor: attach a 30-second action to something you already do, then check how automatic it feels after two weeks. */
export function Anchor({ mind, update, done, back }: MindProps) {
  const open = mind.anchors[mind.anchors.length - 1]; const [anchor, setAnchor] = useState<string | null>(null); const [act, setAct] = useState(""); const [saved, setSaved] = useState(false);
  const logToday = (yes: boolean) => { if (!open) return; update(m => ({ ...m, anchors: m.anchors.map(a => (a.id === open.id ? { ...a, days: yes ? [...new Set([...a.days, day()])] : a.days } : a)) })); done("anchor"); };
  const dayN = open ? Math.floor((Date.now() - open.ts) / 864e5) + 1 : 0;
  return (
    <Screen title="Tiny anchor" sub="Pick something you already do every day. Tie one 30-second action to it." back={back} credit="'After [routine], I will [tiny action]' is an if-then plan (implementation intention). Habits form on their own timeline: 18 to 254 days in one study (median 66), so do not expect a fixed number. Evidence that this works for study or work tasks is thin; track whether it does for you.">
      {open && <Card className="space-y-2"><div className="text-xs text-muted-foreground">Your anchor · day {dayN}</div><div className="font-medium">After {open.anchor.toLowerCase()}, I will {open.act}.</div><div className="text-sm">{open.days.length} day{open.days.length === 1 ? "" : "s"} done</div>
        {!open.days.includes(day()) ? <div className="flex gap-2"><button onClick={() => logToday(true)} className={cls}>I did it today</button><button onClick={() => logToday(false)} className={ghost}>Not today</button></div> : <Saved text="Done for today." />}
        {dayN >= 14 && open.auto == null && <div><div className="mb-1 text-sm font-medium">After two weeks: I do this without thinking</div><Pills value={open.auto ?? null} onChange={v => update(m => ({ ...m, anchors: m.anchors.map(a => (a.id === open.id ? { ...a, auto: v } : a)) }))} label="Automatic" options={[1, 2, 3, 4, 5].map(n => ({ v: n, label: ["Never", "Rarely", "Sometimes", "Often", "Always"][n - 1] }))} /></div>}
        {open.auto != null && <Help>Automatic: {open.auto}/5 after {dayN} days. Keep going, or change the anchor.</Help>}</Card>}
      <Card className="space-y-3"><div className="text-sm font-medium">{open ? "Start a new anchor" : "After I..."}</div><Pills value={anchor} onChange={setAnchor} label="Anchor" options={ANCHORS.map(a => ({ v: a, label: a }))} /><Field label="...I will (30 seconds or less)" value={act} onChange={setAct} rows={1} ph="open my notes and read one line" /></Card>
      {!saved ? <Primary disabled={!anchor || act.trim().length < 3} onClick={() => { update(m => ({ ...m, anchors: [...m.anchors, { id: crypto.randomUUID(), ts: Date.now(), anchor: anchor!, act: act.trim().slice(0, 80), days: [] }] })); setSaved(true); }}>Save my anchor</Primary> : <Saved text="Saved. Tomorrow, watch for the anchor." />}
    </Screen>
  );
}

const PROOFS = ["I can begin when I do not feel like it", "I can do hard things in small pieces", "I came back after a break", "I asked for help", "I finished something imperfect"];
const SIZES = [{ v: 2, label: "2-minute start" }, { v: 10, label: "10-minute chunk" }, { v: 30, label: "30 minutes or a finish" }];
/** Proof ledger: after a start, note what it proved. It also suggests the next size to try once a size has gone well three times. */
export function Ledger({ mind, update, done, back, onStart }: MindProps) {
  const [text, setText] = useState(""); const [size, setSize] = useState<number | null>(2); const [saved, setSaved] = useState(false);
  const recent = mind.ledger.slice(-3); const next = recent.length === 3 && recent.every(r => r.size === recent[0].size) ? SIZES.find(s => s.v > recent[0].size) : null;
  return (
    <Screen title="Proof ledger" sub="After you start, write what you just proved. Wins never reset to zero." back={back} credit="Mastery experiences are the strongest source of self-efficacy, and perceived competence mediated effects in self-determination meta-analyses (indirect evidence; no direct trial of a wins ledger). Graded tasks were among the strongest techniques in a digital behaviour-change meta-regression.">
      {next && <Card className="bg-primary/5"><div className="text-sm">Three {SIZES.find(s => s.v === recent[0].size)!.label.toLowerCase()}s in a row. Ready to try a <b>{next.label.toLowerCase()}</b>? Keep the small one if you prefer.</div><button onClick={() => onStart("A slightly bigger start", `${next.v} minutes, then stop`)} className={cls + " mt-2"}>Try it</button></Card>}
      <Card className="space-y-3"><div className="text-sm font-medium">What did you just prove?</div><Pills value={text} onChange={t => { setSaved(false); setText(t); }} label="Proof" options={PROOFS.map(p => ({ v: p, label: p }))} /><Field label="Or in your own words" value={text} onChange={t => { setSaved(false); setText(t); }} rows={1} />
        <div className="text-sm font-medium">How big was the start?</div><Pills value={size} onChange={setSize} label="Size" options={SIZES} /></Card>
      {!saved ? <Primary disabled={text.trim().length < 3 || size == null} onClick={() => { update(m => ({ ...m, ledger: [...m.ledger, { ts: Date.now(), text: text.trim().slice(0, 100), size: size! }] })); setSaved(true); done("ledger"); }}>Add to my ledger</Primary> : <Saved text="Added." />}
      {mind.ledger.length > 0 && <Card><div className="mb-1 text-sm font-semibold">{mind.ledger.length} proof{mind.ledger.length > 1 ? "s" : ""}</div>{mind.ledger.slice(-5).reverse().map(l => <div key={l.ts} className="text-sm">• {l.text}</div>)}</Card>}
    </Screen>
  );
}

const STARTERS = ["Hey, you came to mind. How are you doing?", "Thinking of you today. No need to reply.", "I just wanted to say I'm glad you're in my life.", "Want to do a quiet 25 minutes together later?", "Saw something that made me think of you."];
const daysSince = (ts: number | null) => (ts ? Math.floor((Date.now() - ts) / 864e5) : 999);
/** Weekly reach-out: suggests the friend you have talked to least recently, and a warm opener. People underestimate how much others appreciate hearing from them. */
export function Reach({ mind, update, done, back, friends, openChat }: MindProps) {
  const list = (friends ?? []).slice().sort((a, b) => (a.last ?? 0) - (b.last ?? 0)); const [pick, setPick] = useState<string | null>(list[0]?.id ?? null); const [msg, setMsg] = useState(STARTERS[0]);
  const f = list.find(x => x.id === pick);
  return (
    <Screen title="Reach out" sub="One small message to someone you care about." back={back} credit="People consistently underestimate how much others appreciate being contacted, and overestimate how awkward it will feel (preregistered experiments, Liu et al. 2022). Evidence is from adults and lab or survey designs. Suggestions only come from your existing friends.">
      {list.length === 0 ? <Card><p className="text-sm">Add a friend first, then this suggests who to message.</p></Card> : <>
        <Card className="space-y-3"><div className="text-sm font-medium">Who?</div><Pills value={pick} onChange={setPick} label="Friend" options={list.map(x => ({ v: x.id, label: `${x.name}${daysSince(x.last) < 999 ? ` · ${daysSince(x.last)}d` : ""}` }))} /><Help>Sorted by who you have talked to least recently.</Help>
          <div className="text-sm font-medium">Say</div><div className="flex flex-wrap gap-2">{STARTERS.map(s => <button key={s} onClick={() => setMsg(s)} className={`rounded-full border px-3 py-1.5 text-xs ${msg === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{s.slice(0, 28)}...</button>)}</div><Field label="Your message" value={msg} onChange={setMsg} rows={2} /></Card>
        <Primary disabled={!f || msg.trim().length < 2} onClick={() => { update(m => ({ ...m, kind: [...m.kind, { ts: Date.now(), type: "reach" }] })); done("reach"); openChat?.(f!.id, msg.trim()); }}>Open the chat with this message</Primary>
        <Help>It opens the chat with your message ready. You choose whether to send it. Nothing is sent from here.</Help></>}
    </Screen>
  );
}

const KINDS = [{ id: "thanks", t: "Say thank you", s: "Thank you for ... It meant a lot." }, { id: "cheer", t: "Cheer someone on", s: "Rooting for you today. You've got this." }, { id: "compliment", t: "Share a compliment", s: "I noticed how you ... and I really admire that." }, { id: "win", t: "Celebrate their win", s: "I heard about ... That's great. Proud of you." }, { id: "self", t: "Be kind to yourself", s: "" }];
/** One kind thing: a small act of kindness, to a friend or to yourself. No streak, no pressure to reply. */
export function KindThing({ mind, update, done, back, friends, openChat }: MindProps) {
  const [k, setK] = useState<string | null>(null); const kd = KINDS.find(x => x.id === k); const [to, setTo] = useState<string | null>(friends?.[0]?.id ?? null); const [msg, setMsg] = useState("");
  useEffect(() => { if (kd) setMsg(kd.s); }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const wk = mind.kind.filter(x => Date.now() - x.ts < 7 * 864e5).length;
  return (
    <Screen title="One kind thing" sub="A small act of kindness lifts the giver too." back={back} credit="Kind acts raise wellbeing a little (Curry et al. 2018: 27 studies, delta = 0.28), and a 7-day trial found kindness to friends, acquaintances, strangers or yourself helped about equally. Givers also underestimate how much recipients value it.">
      <Card className="space-y-3"><Pills value={k} onChange={setK} label="Kindness" options={KINDS.map(x => ({ v: x.id, label: x.t }))} />
        {kd && kd.id !== "self" && ((friends ?? []).length ? <><div className="text-sm font-medium">To</div><Pills value={to} onChange={setTo} label="To" options={(friends ?? []).map(x => ({ v: x.id, label: x.name }))} /><Field label="Message" value={msg} onChange={setMsg} rows={2} /></> : <Help>Add a friend to send one. Meanwhile, be kind to yourself.</Help>)}
        {kd?.id === "self" && <Help>Do one kind thing for yourself in the next hour: a glass of water, a short walk, or saying "good enough" about something. Then tap the button.</Help>}</Card>
      {kd && (kd.id === "self" ? <Primary onClick={() => { update(m => ({ ...m, kind: [...m.kind, { ts: Date.now(), type: "self" }] })); done("kind1"); back(); }}>I did it</Primary> : <Primary disabled={!to || msg.trim().length < 3} onClick={() => { update(m => ({ ...m, kind: [...m.kind, { ts: Date.now(), type: kd.id }] })); done("kind1"); openChat?.(to!, msg.trim()); }}>Open the chat with this message</Primary>)}
      <Help>{wk} kind thing{wk === 1 ? "" : "s"} this week. No streak; some weeks are quiet.</Help>
    </Screen>
  );
}
