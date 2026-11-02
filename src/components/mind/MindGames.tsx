import { useEffect, useRef, useState } from "react";
import { Card, Help, Screen, type MindProps } from "@/components/mind/MindParts";
import { loadLog } from "@/lib/startlog";
import { dayTable } from "@/engine/insights";
import { gameStore, saveGame, type Game } from "@/engine/games";

const ghost = "rounded-full border border-border px-4 py-2 text-sm";
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// ---- Hold back: a go / no-go game for impulse control ----
const N = 24;
export function HoldBack({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "run" | "end">("idle"); const [stim, setStim] = useState<"go" | "stop" | null>(null); const [n, setN] = useState(0);
  const [res, setRes] = useState<{ com: number; om: number; rt: number; nogo: number } | null>(null);
  const R = useRef({ i: 0, t0: 0, answered: false, kind: "go" as "go" | "stop", rts: [] as number[], com: 0, om: 0, nogo: 0, timers: [] as number[] }); const prior = useRef(gameStore("hold"));
  useEffect(() => () => R.current.timers.forEach(t => window.clearTimeout(t)), []);
  const later = (f: () => void, ms: number) => { R.current.timers.push(window.setTimeout(f, ms)); };
  const finish = () => {
    const r = R.current; const out = { com: r.nogo ? r.com / r.nogo : 0, om: r.om, rt: Math.round(median(r.rts)), nogo: r.nogo };
    saveGame("hold", { ts: Date.now(), a: Math.round(out.com * 100), b: out.rt, c: out.om }); setRes(out); setPhase("end"); setStim(null); done("hold");
  };
  const trial = () => {
    const r = R.current; if (r.i >= N) return finish();
    r.i++; setN(r.i); r.answered = false; r.kind = Math.random() < 0.25 && r.i > 2 ? "stop" : "go"; if (r.kind === "stop") r.nogo++;
    setStim(r.kind); r.t0 = performance.now();
    later(() => { if (!r.answered) { r.answered = true; if (r.kind === "go") r.om++; setStim(null); later(trial, 450); } }, 800);
  };
  const tap = () => {
    const r = R.current;
    if (phase === "idle") { R.current = { i: 0, t0: 0, answered: false, kind: "go", rts: [], com: 0, om: 0, nogo: 0, timers: [] }; setRes(null); setPhase("run"); later(trial, 600); return; }
    if (phase !== "run" || !stim || r.answered) return;
    r.answered = true; if (r.kind === "go") r.rts.push(performance.now() - r.t0); else r.com++; setStim(null); later(trial, 450);
  };
  const base = prior.current.length >= 3 ? mean(prior.current.slice(-15).map(g => g.a)) : null; const verdict = res && base != null ? (res.com * 100 > base + 15 ? "fast" : res.com * 100 < base - 15 ? "steady" : "usual") : null;
  return (
    <Screen title="Hold back" sub="A 40-second game. Tap on green circles. Do not tap on red squares." back={back} credit="Based on the go/no-go task used in research on impulse control: how often you tap when you should not is a standard measure of response inhibition. This short version is not clinically validated, so it only compares you with your own usual. Speed and accuracy trade off, so a few mistakes are normal.">
      <Card className="flex flex-col items-center gap-3">
        <button onPointerDown={e => { e.preventDefault(); tap(); }} aria-label={phase === "idle" ? "Start" : "Tap area"} className="flex h-48 w-48 touch-none select-none items-center justify-center rounded-3xl border border-border bg-secondary/40">
          {phase === "idle" && <span className="text-lg font-semibold">Tap to begin</span>}{phase === "end" && <span className="text-lg font-semibold">Done</span>}
          {phase === "run" && stim === "go" && <span className="h-24 w-24 rounded-full bg-[hsl(var(--v-ready))]" />}{phase === "run" && stim === "stop" && <span className="h-20 w-20 rounded-md bg-[hsl(var(--v-notready))]" />}
        </button>
        {phase === "run" && <div className="text-sm text-muted-foreground">{n} of {N}</div>}
      </Card>
      {res && <Card className="space-y-2"><div className="text-lg font-semibold">{Math.round(res.com * 100)}% tapped when they should not</div>
        <p className="text-sm">Typical speed {res.rt} ms · {res.om} missed greens.</p>
        {verdict === "fast" && <p className="text-sm">More quick taps than your usual ({Math.round(base!)}%). That often shows up when you are rushed or tired. It is information, not a verdict. Try three slow breaths before a hard task.</p>}
        {verdict === "steady" && <p className="text-sm">Calmer than your usual ({Math.round(base!)}%). A good state for work that needs care.</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({Math.round(base!)}%).</p>}
        {base == null && <Help>After 3 runs on different days it compares you with your own usual.</Help>}
        <div className="flex flex-wrap gap-2"><button onClick={() => { setPhase("idle"); setRes(null); }} className={ghost}>Again</button>{verdict === "fast" && <button onClick={() => go("breathe")} className={ghost}>Slow breathing</button>}</div></Card>}
    </Screen>
  );
}

// ---- Pattern recall: a spatial memory game ----
export function PatternRecall({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "show" | "input" | "end">("idle"); const [lit, setLit] = useState<number | null>(null); const [len, setLen] = useState(3); const [msg, setMsg] = useState("");
  const R = useRef({ seq: [] as number[], pos: 0, strikes: 0, best: 0, timers: [] as number[] }); const [best, setBest] = useState<number | null>(null); const prior = useRef(gameStore("recall"));
  useEffect(() => () => R.current.timers.forEach(t => window.clearTimeout(t)), []);
  const later = (f: () => void, ms: number) => { R.current.timers.push(window.setTimeout(f, ms)); };
  const round = (L: number) => {
    const r = R.current; r.seq = Array.from({ length: L }, () => Math.floor(Math.random() * 9)); r.pos = 0; setLen(L); setPhase("show"); setMsg("Watch...");
    r.seq.forEach((c, i) => { later(() => setLit(c), 700 + i * 800); later(() => setLit(null), 700 + i * 800 + 500); }); later(() => { setPhase("input"); setMsg("Your turn: tap them in order"); }, 700 + L * 800);
  };
  const end = () => { const b = R.current.best; saveGame("recall", { ts: Date.now(), a: b, b: 0, c: 0 }); setBest(b); setPhase("end"); done("recall"); };
  const start = () => { R.current = { seq: [], pos: 0, strikes: 0, best: 0, timers: [] }; setBest(null); round(3); };
  const tapCell = (c: number) => {
    const r = R.current; if (phase !== "input") return;
    if (c === r.seq[r.pos]) { r.pos++; setLit(c); later(() => setLit(null), 150); if (r.pos >= r.seq.length) { r.best = Math.max(r.best, r.seq.length); setPhase("show"); setMsg("Nice."); later(() => round(r.seq.length + 1), 700); } }
    else { r.strikes++; if (r.strikes >= 2) { end(); } else { setMsg("Not quite. One more try at this length."); setPhase("show"); later(() => round(r.seq.length), 900); } }
  };
  const base = prior.current.length >= 3 ? mean(prior.current.slice(-15).map(g => g.a)) : null; const verdict = best != null && base != null ? (best <= base - 1 ? "low" : best >= base + 1 ? "high" : "usual") : null;
  return (
    <Screen title="Pattern recall" sub="Watch the squares light up, then tap them in the same order. It gets longer each round." back={back} credit="Based on the Corsi block-tapping task, a classic measure of spatial working memory (how much you can hold in mind at once). This version is a short check, not a test of ability. It only compares you with your own usual.">
      <Card className="flex flex-col items-center gap-3">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Pattern grid">{Array.from({ length: 9 }, (_, c) => <button key={c} onPointerDown={e => { e.preventDefault(); tapCell(c); }} aria-label={`Square ${c + 1}`} className={`h-20 w-20 touch-none select-none rounded-2xl border border-border transition-colors ${lit === c ? "bg-primary" : "bg-secondary/50"}`} />)}</div>
        <div className="min-h-5 text-sm text-muted-foreground">{phase === "idle" ? "" : phase === "end" ? "" : `${msg} (length ${len})`}</div>
        {phase === "idle" && <button onClick={start} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Begin</button>}
      </Card>
      {phase === "end" && best != null && <Card className="space-y-2"><div className="text-lg font-semibold">You held {best} in mind</div>
        {verdict === "low" && <p className="text-sm">A bit below your usual ({base!.toFixed(1)}). Minds get crowded when busy or tired. It is information, not a verdict. Emptying your head onto paper can help.</p>}
        {verdict === "high" && <p className="text-sm">Above your usual ({base!.toFixed(1)}). Your head feels roomy right now.</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({base!.toFixed(1)}).</p>}
        {base == null && <Help>After 3 runs it compares you with your own usual.</Help>}
        <div className="flex flex-wrap gap-2"><button onClick={() => setPhase("idle")} className={ghost}>Again</button>{verdict === "low" && <button onClick={() => go("wind")} className={ghost}>Empty my head</button>}</div></Card>}
    </Screen>
  );
}

// ---- Quiet read: how you seem to be, from what the app already sees. No questions. ----
export function QuietRead({ mind, back, go }: MindProps) {
  try { localStorage.setItem("lagomo.quiet.ts", String(Date.now())); } catch { /* ignore */ }
  const starts = loadLog().starts; const now = Date.now(); const D = 864e5;
  const hr = (ts: number) => { const d = new Date(ts); return d.getHours() + d.getMinutes() / 60; };
  const rec = starts.filter(s => now - s.ts < 7 * D), old = starts.filter(s => now - s.ts >= 7 * D && now - s.ts < 35 * D);
  const sig: { ok: boolean; text: string; view?: "breathe" | "sleep" | "wind" | "brk" }[] = []; let seen = 0;
  if (rec.length >= 3 && old.length >= 4) { seen++; const d = median(rec.map(s => hr(s.ts))) - median(old.map(s => hr(s.ts))); sig.push(Math.abs(d) >= 2 ? { ok: false, text: `You have been starting about ${Math.round(Math.abs(d))} hours ${d > 0 ? "later" : "earlier"} than usual.` } : { ok: true, text: "Your usual start time has held steady." }); }
  const wait = (a: typeof starts) => a.filter(s => s.created && s.ts > s.created && s.ts - s.created < 3 * D).map(s => (s.ts - s.created!) / 6e4);
  const wr = wait(rec), wo = wait(old); if (wr.length >= 3 && wo.length >= 4) { seen++; const a = median(wr), b = median(wo); sig.push(a > b * 1.5 && a - b > 10 ? { ok: false, text: `Tasks are waiting longer before you begin (about ${Math.round(a)} min, usually ${Math.round(b)}).`, view: "brk" } : { ok: true, text: "The wait before you begin looks normal." }); }
  if (old.length >= 3 || rec.length >= 3) { seen++; const prevWeek = starts.filter(s => now - s.ts >= 7 * D && now - s.ts < 14 * D).length; if (prevWeek >= 3) sig.push(rec.length <= prevWeek * 0.5 ? { ok: false, text: `Fewer starts this week (${rec.length}) than last (${prevWeek}).` } : { ok: true, text: `Starts this week: ${rec.length}, last week: ${prevWeek}.` }); }
  const rows = dayTable(mind, starts.map(s => s.ts), now); const sl = rows.slice(-3).map(r => r.sleepH).filter((x): x is number => x != null), slo = rows.slice(-30, -3).map(r => r.sleepH).filter((x): x is number => x != null);
  if (sl.length >= 2 && slo.length >= 5) { seen++; const d = mean(sl) - mean(slo); sig.push(d <= -1 ? { ok: false, text: `You have slept about ${Math.abs(d).toFixed(1)} hours less than usual lately.`, view: "sleep" } : { ok: true, text: "Your recent sleep is close to your usual." }); }
  const gm = (g: Game, fn: (x: { a: number; b: number }) => number, worse: (r: number, b: number) => boolean, lbl: string, view?: "breathe" | "wind") => { const s = gameStore(g); if (s.length >= 4) { seen++; const r = fn(s[s.length - 1]), b = median(s.slice(0, -1).slice(-15).map(fn)); sig.push(worse(r, b) ? { ok: false, text: `${lbl} was off your usual on your last try.`, view } : { ok: true, text: `${lbl} is in your usual range.` }); } };
  gm("focus", x => x.a, (r, b) => r > b * 1.15, "Reaction speed"); gm("hold", x => x.a, (r, b) => r > b + 15, "Holding back", "breathe"); gm("heart", x => x.b, (r, b) => r < b * 0.75, "Heart rate variability", "breathe"); gm("eyes", x => x.b, (r, b) => r > b * 1.5 && r - b > 1.5, "Eye closure", "wind"); gm("hand", x => x.a, (r, b) => r > b * 1.3, "Hand steadiness", "breathe"); gm("recall", x => x.a, (r, b) => r <= b - 1, "Working memory", "wind");
  const flags = sig.filter(s => !s.ok); const need = Math.max(0, 3 - seen);
  const head = seen < 2 ? "Still learning you" : flags.length >= 3 ? "A few signs you may be stretched" : flags.length >= 1 ? "Mostly steady, one thing to watch" : "You look steady";
  return (
    <Screen title="Quiet read" sub="How you seem to be, from what the app already sees. You answer nothing." back={back} credit="Built only from your own timing (when and how fast you begin), your sleep diary and your game results, compared with your own earlier weeks. Patterns like these are hints, not diagnoses. Everything stays on this device.">
      <Card className="space-y-2"><div className="text-xl font-semibold">{head}</div>
        {seen < 2 ? <p className="text-sm">I need a couple of weeks of starts, and a few game runs on different days, before I can compare you with yourself. Nothing to do but carry on.</p> : <ul className="space-y-1 text-sm">{sig.map((s, i) => <li key={i} className="flex gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.ok ? "bg-[hsl(var(--v-ready))]" : "bg-[hsl(var(--v-borderline))]"}`} /><span>{s.text}</span></li>)}</ul>}
        {flags.length >= 2 && <p className="text-sm">When several signs line up, a lighter day can help: only two-minute starts, one task, one kind thing. That is information, not a verdict.</p>}
        {flags.length >= 2 && <div className="flex flex-wrap gap-2">{flags.filter(f => f.view).slice(0, 2).map((f, i) => <button key={i} onClick={() => go(f.view!)} className={ghost}>{f.view === "sleep" ? "Look at my sleep" : f.view === "breathe" ? "Slow breathing" : f.view === "wind" ? "Empty my head" : "Take a short break"}</button>)}<button onClick={() => go("insights")} className={ghost}>Make today a light day</button></div>}
        {need > 0 && seen >= 2 && <Help>{need} more kind of signal would make this sharper: play the games on different days and keep the sleep diary.</Help>}</Card>
    </Screen>
  );
}
