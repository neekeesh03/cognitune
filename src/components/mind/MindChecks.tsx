import { useState } from "react";
import { INSTRUMENTS, WHEEL, fmtScore, lowerIsBetter, scoreOf, trendValue, type InstId, type Instrument } from "@/engine/mind";
import { daysAgo } from "@/store/useMind";
import { Card, Help, Pills, Primary, Radar, Rate, Saved, Screen, Spark, SupportCard, type MindProps } from "@/components/mind/MindParts";

const ORDER: InstId[] = ["who5", "ipipc", "lone3", "rses", "k6", "cbi", "phq9", "gad7", "asrs6"];
const SOON: Partial<Record<InstId, number>> = { phq9: 14, gad7: 14, k6: 14, cbi: 14, who5: 14 };
const when = (ts: number) => (daysAgo(ts) === 0 ? "today" : daysAgo(ts) === 1 ? "yesterday" : `${daysAgo(ts)} days ago`);

/** Four validated questionnaires. Each is run one question at a time, scored on this device, and kept as a trend. */
export function Checks({ mind, update, done, back, go }: MindProps) {
  const [open, setOpen] = useState<InstId | null>(null);
  const [adult, setAdult] = useState(false);
  if (open) return <Run id={open} update={update} done={done} back={() => setOpen(null)} go={go} adult={adult} setAdult={setAdult} />;
  return (
    <Screen title="Check-ins" sub="Short questionnaires that doctors and researchers use. They show how you are doing and how it changes. They do not diagnose." back={back}>
      {ORDER.map(id => {
        const ins = INSTRUMENTS[id]; const h = mind.checks.filter(c => c.id === id); const last = h[h.length - 1]; const r = last ? scoreOf(id, last.a) : null;
        return (
          <Card key={id}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="font-semibold">{ins.title}</div><div className="text-xs text-muted-foreground">{ins.blurb}</div>
                {last && r && <div className="mt-2 text-sm"><b>{fmtScore(id, r)}</b> · {r.band} <span className="text-muted-foreground">· {when(last.ts)}</span></div>}{last && SOON[id] && daysAgo(last.ts) < SOON[id]! && <div className="mt-1 text-[11px] text-muted-foreground">Repeating this too often can make you watch the score instead of your life. About every {SOON[id]} days is typical.</div>}</div>
              <button onClick={() => setOpen(id)} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{last ? "Again" : "Start"}</button>
            </div>
            {h.length > 1 && <div className="mt-2"><Spark values={h.slice(-8).map(c => trendValue(id, c.score))} min={0} max={id === "who5" ? 100 : ins.max} good={lowerIsBetter(id) ? "low" : "high"} /></div>}
          </Card>
        );
      })}
      <Help>Repeat WHO-5 about every two weeks, and the others when something has changed. A single score matters less than the direction over time.</Help>
    </Screen>
  );
}

function Run({ id, update, done, back, go, adult, setAdult }: { id: InstId; update: MindProps["update"]; done: MindProps["done"]; back: () => void; go: MindProps["go"]; adult: boolean; setAdult: (b: boolean) => void }) {
  const ins = INSTRUMENTS[id]; const [i, setI] = useState(0); const [a, setA] = useState<number[]>([]); const [fin, setFin] = useState(false);
  if (ins.adult && !adult) return (
    <Screen title={ins.title} back={back} credit={ins.credit}>
      <Card><p className="text-sm">This questionnaire is written for adults. Lagomo is for ages 16 and up, so please confirm.</p>
        <div className="mt-3 flex gap-2"><button onClick={() => setAdult(true)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">I am 18 or older</button><button onClick={back} className="rounded-full border border-border px-4 py-2 text-sm">Not now</button></div></Card>
      <Help>The wellbeing check (WHO-5) and the other tools in Mind are fine for everyone 16 and over.</Help>
    </Screen>
  );
  const pick = (v: number) => {
    const next = [...a.slice(0, i), v]; setA(next);
    if (i + 1 < ins.items.length) { setI(i + 1); return; }
    const r = scoreOf(id, next); update(m => ({ ...m, checks: [...m.checks, { id, ts: Date.now(), score: r.score / (id === "who5" ? 4 : 1), a: next }] })); setFin(true); done(ins.title);
  };
  if (fin) {
    const r = scoreOf(id, a); const hurt = id === "phq9" && a[8] > 0; const tone = r.tone === "good" ? "text-[hsl(var(--v-ready))]" : r.tone === "ok" ? "text-foreground" : "text-[hsl(var(--v-notready))]";
    return (
      <Screen title={ins.title} back={back} credit={ins.credit}>
        {(hurt || r.urgent) && <SupportCard strong={hurt} />}
        <Card><div className="text-sm text-muted-foreground">Your result</div>
          <div className={`text-3xl font-semibold ${tone}`}>{fmtScore(id, r)}</div><div className="font-medium">{r.band}</div>
          <p className="mt-2 text-sm">{r.line}</p></Card>
        <Saved text="Saved on this device. It will show in your trend." />
        <div className="flex flex-wrap gap-2">
          {(id === "phq9" || id === "who5") && <button onClick={() => go("pm")} className="rounded-full border border-border px-4 py-2 text-sm">Try Pleasure and mastery</button>}
          {(id === "k6" || id === "cbi") && <button onClick={() => go(id === "cbi" ? "sleep" : "wind")} className="rounded-full border border-border px-4 py-2 text-sm">{id === "cbi" ? "Look at your sleep" : "Try Wind-down"}</button>}
          {id === "lone3" && <button onClick={() => go("kind")} className="rounded-full border border-border px-4 py-2 text-sm">Kind reset</button>}
          {(id === "rses") && <button onClick={() => go("thoughts")} className="rounded-full border border-border px-4 py-2 text-sm">Unhook from a thought</button>}
          {id === "ipipc" && <button onClick={() => go("park")} className="rounded-full border border-border px-4 py-2 text-sm">Park my place</button>}
          {id === "gad7" && <button onClick={() => go("breathe")} className="rounded-full border border-border px-4 py-2 text-sm">Try slow breathing</button>}
          {id === "asrs6" && <button onClick={() => go("woop")} className="rounded-full border border-border px-4 py-2 text-sm">Try a WOOP plan</button>}
          <button onClick={back} className="rounded-full border border-border px-4 py-2 text-sm">Done</button>
        </div>
        <Help>{id === "ipipc" || id === "rses" || id === "lone3" ? "This describes a moment and a style, not who you are. It can change." : "This is a screening check, not a diagnosis. It cannot tell you what is going on, and a high or low score does not decide anything about you."}</Help>
      </Screen>
    );
  }
  return (
    <Screen title={ins.title} sub={`${i + 1} of ${ins.items.length}`} back={back} credit={ins.credit}>
      <Card><div className="text-xs uppercase tracking-wide text-muted-foreground">{ins.window}</div><p className="mt-2 text-lg font-medium leading-snug">{ins.items[i]}</p>
        <div className="mt-4 grid gap-2">{ins.options.map(o => <button key={o.v} onClick={() => pick(o.v)} className="rounded-2xl border border-border bg-background/60 px-4 py-3 text-start text-sm transition hover:bg-secondary/70">{o.label}</button>)}</div></Card>
      {i > 0 && <button onClick={() => setI(i - 1)} className="text-sm text-muted-foreground underline">Back one question</button>}
    </Screen>
  );
}

/** Eight life areas in our own words. Inspired by the idea of looking at many areas at once; not a clinical measure. */
export function Wheel({ mind, update, done, back, go }: MindProps) {
  const last = mind.wheel[mind.wheel.length - 1]; const [v, setV] = useState<number[]>(last?.v ?? WHEEL.map(() => 5)); const [saved, setSaved] = useState(false);
  const prev = mind.wheel.length > (saved ? 1 : 0) ? mind.wheel[mind.wheel.length - (saved ? 2 : 1)]?.v : undefined;
  const low = WHEEL.map((w, i) => ({ w, x: v[i] })).sort((a, b) => a.x - b.x)[0];
  return (
    <Screen title="Wellbeing wheel" sub="Rate each area from 0 to 10 for this past week. Go with your first feeling." back={back} credit="Our own wording, not a clinical measure. It borrows the idea behind broad symptom screens: look at many areas at once, so the weak spot is easy to see.">
      <Card><Radar labels={WHEEL.map(w => w.label)} now={v} before={prev} /><Help>{prev ? "Dashed line is your previous wheel." : "Your first wheel. Next week you will see the change."}</Help></Card>
      <Card className="space-y-4">{WHEEL.map((w, i) => <Rate key={w.id} label={w.label} ask={w.ask} value={v[i]} max={10} step={1} onChange={n => { setSaved(false); setV(x => x.map((y, j) => (j === i ? n : y))); }} />)}</Card>
      {!saved ? <Primary onClick={() => { update(m => ({ ...m, wheel: [...m.wheel, { ts: Date.now(), v }] })); setSaved(true); done("wheel"); }}>Save this week</Primary> : (
        <><Saved text="Saved." /><Card><div className="text-sm">Lowest area: <b>{low.w.label}</b> ({low.x}/10).</div>
          <button onClick={() => go(low.w.tool)} className="mt-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">A tool that helps with {low.w.label.toLowerCase()}</button></Card></>
      )}
    </Screen>
  );
}
