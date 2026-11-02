import { useEffect, useRef, useState } from "react";
import { Card, Help, Screen, type MindProps } from "@/components/mind/MindParts";
import { gameStore, saveGame, type GameRun } from "@/engine/games";
import { switchMetrics, stroopMetrics, traceMetrics, typingMetrics, med, type Key, type Pt, type Trial, type TypingResult } from "@/engine/signals";

const ghost = "rounded-full border border-border px-4 py-2 text-sm"; const prim = "rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground";
/** One line comparing today with your own usual (median of earlier runs). Needs 3 earlier runs. */
function usual(prior: GameRun[], pick: (r: GameRun) => number | null | undefined) { const v = prior.slice(-15).map(pick).filter((x): x is number => x != null && isFinite(x)); return v.length >= 3 ? med(v) : null; }
function Cmp({ label, cur, base, unit = "", lowerBetter = false, digits = 0, why }: { label: string; cur: number | null; base: number | null; unit?: string; lowerBetter?: boolean; digits?: number; why: string }) {
  const f = (x: number) => x.toFixed(digits) + unit; let note = ""; if (cur != null && base != null && base !== 0) { const d = (cur - base) / Math.abs(base); note = Math.abs(d) < 0.1 ? "about your usual" : (d > 0) !== lowerBetter ? "better than your usual" : "worse than your usual"; }
  return <div className="rounded-2xl bg-secondary/40 p-3 text-sm"><div className="flex items-baseline justify-between gap-2"><b>{label}</b><span className="text-lg font-semibold tabular-nums">{cur == null ? "-" : f(cur)}</span></div><div className="text-xs text-muted-foreground">{why}{note ? " · " + note + (base != null ? " (" + f(base) + ")" : "") : ""}</div></div>;
}
const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// ---------- Type flow: a 30-second typing test read for ignition, rhythm, pauses, friction and re-entry ----------
const WORDS = "the of and to in is you that it he was for on are as with his they at be this from have or by one had not but what all were when we there can an your which their said if do will each about how up out them then she many some so these would other into has more her two like him see time could no make than first been its who now people my made over did down only way find use may water long little very after words called just where most know get through back much before go good new write our used me man too any day same right look think also around another came come work three word must because does part even place well such here take why things help put years different away again off went old number great tell men say small every found still between name should home big give air line set own under read last never us left end along while might next sound below saw something thought both few those always looked show large often together asked house don't world going want school important until form food keep children feet land side without boy once animals life enough took sometimes four head above kind began almost live page got earth need far hand high year mother light country father let night picture being study second soon story since white ever paper hard near sentence better best across during today however sure knew try told young sun thing whole hear example heard several change answer room sea against top turned learn point city play toward five using himself usually".split(" ");
const PASSAGE = WORDS.slice(0, 60).join(" "); const TDUR = 30000, PAUSE_AT = 10000, PAUSE_MS = 3000;
export function TypeFlow({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "ready" | "run" | "pause" | "end">("idle"); const [typed, setTyped] = useState(""); const [res, setRes] = useState<TypingResult | null>(null); const [secs, setSecs] = useState(0);
  const prior = useRef(gameStore("type")); const ta = useRef<HTMLTextAreaElement>(null);
  const R = useRef({ keys: [] as Key[], t0: 0, tStart: 0, pauseTotal: 0, pauseStart: 0, interrupted: false, resumeShown: 0, resume: null as number | null, first: 0, phase: "idle" as string, typed: "" });
  const timers = useRef<number[]>([]); const setPh = (p: typeof phase) => { R.current.phase = p; setPhase(p); };
  useEffect(() => () => { timers.current.forEach(t => window.clearInterval(t)); }, []);
  const active = () => performance.now() - R.current.tStart - R.current.pauseTotal;
  const finish = () => {
    const r = R.current; timers.current.forEach(t => window.clearInterval(t)); timers.current = []; const out = typingMetrics(r.keys, Math.min(TDUR, active()), r.first, r.resume);
    if (out.n >= 30) { saveGame("type", { ts: Date.now(), a: Math.round(out.wpm), b: Math.round(out.firstKeyMs), c: Math.round(out.accuracy * 100), x: { burst: Math.round(out.burstWpm), cv: +out.ikiCv.toFixed(3), tau: Math.round(out.tau), ent: +out.entropy.toFixed(3), pauses: out.longPauses, hes: +out.hesitation.toFixed(3), back: out.backspaces, resume: out.resumeMs == null ? null : Math.round(out.resumeMs), iki: Math.round(out.ikiMed) } }); done("type"); }
    setRes(out); setPh("end");
  };
  const begin = () => { R.current = { keys: [], t0: performance.now(), tStart: 0, pauseTotal: 0, pauseStart: 0, interrupted: false, resumeShown: 0, resume: null, first: 0, phase: "ready", typed: "" }; setTyped(""); setRes(null); setSecs(0); setPh("ready"); setTimeout(() => ta.current?.focus(), 50); };
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const r = R.current; if (r.phase !== "ready" && r.phase !== "run") { e.preventDefault(); return; }
    const isChar = e.key.length === 1 && !e.ctrlKey && !e.metaKey, isBack = e.key === "Backspace"; if (!isChar && !isBack) return; e.preventDefault();
    const now = performance.now();
    if (r.phase === "ready") { r.first = now - r.t0; r.tStart = now; setPh("run"); const iv = window.setInterval(() => { const a = active(); setSecs(Math.floor(a / 1000)); if (r.phase === "run" && !r.interrupted && a >= PAUSE_AT) { r.interrupted = true; r.pauseStart = performance.now(); setPh("pause"); window.setTimeout(() => { r.pauseTotal += performance.now() - r.pauseStart; r.resumeShown = performance.now(); setPh("run"); setTimeout(() => ta.current?.focus(), 0); }, PAUSE_MS); } if (a >= TDUR && r.phase === "run") finish(); }, 100); timers.current.push(iv); }
    if (r.resumeShown && r.resume == null) r.resume = now - r.resumeShown;
    const t = now - r.tStart - r.pauseTotal;
    if (isBack) { r.keys.push({ t, ok: true, back: true }); r.typed = r.typed.slice(0, -1); } else { const ok = e.key === PASSAGE[r.typed.length]; r.keys.push({ t, ok }); r.typed += e.key; if (r.typed.length >= PASSAGE.length) { setTyped(r.typed); finish(); return; } }
    setTyped(r.typed);
  };
  const P = (k: (x: GameRun) => number | null | undefined) => usual(prior.current, k);
  return (
    <Screen title="Type flow" sub="Type the words for 30 seconds, Monkeytype style. Your keystroke timing shows how your start, rhythm and focus are doing." back={back} credit="Methods: the first-key delay is an initiation latency (Primode, Lagun 2025 Table 7). Keystroke timing variability and its slow tail (ex-Gaussian tau) read performance drift (Slip). Long pauses read focus loss (Anchory). Hesitations, corrections and the delay to resume after a forced pause read resistance (Grain; interrupt-resumption protocol, LTA Table 14). Typing dynamics are used in research on attention and motor control (Giancardo et al., 2016). This is a research measure, not a diagnosis. Only timings are saved, never the keys you press.">
      <Card className="space-y-3">
        {(phase === "ready" || phase === "run" || phase === "pause") && <><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{phase === "ready" ? "Start typing whenever you are ready" : phase === "pause" ? "Hold on..." : "Keep going"}</span><span className="tabular-nums">{Math.max(0, TDUR / 1000 - secs)}s</span></div>
          <div className="relative rounded-2xl bg-secondary/40 p-4 font-mono text-lg leading-relaxed" onClick={() => ta.current?.focus()}>
            {phase === "pause" && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/90 text-center text-sm" role="status">Quick pause. Take a breath, then carry on where you left off.</div>}
            {PASSAGE.split("").map((c, i) => <span key={i} className={i < typed.length ? (typed[i] === c ? "text-foreground" : "bg-destructive/30 text-destructive") : i === typed.length ? "border-b-2 border-primary text-muted-foreground" : "text-muted-foreground/60"}>{c}</span>)}
          </div>
          <textarea ref={ta} onKeyDown={onKey} value="" onChange={() => { /* keys are read in onKeyDown */ }} className="sr-only" aria-label="Type the words shown" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        </>}
        {phase === "idle" && <><p className="text-sm">Use a keyboard. Type the words exactly. Mistakes show in red and you can fix them with backspace. Halfway through there is a short pause screen, on purpose.</p><button onClick={begin} className={prim}>Start</button></>}
        {phase === "end" && !res && null}
      </Card>
      {phase === "end" && res && (res.n < 30 ? <Card className="space-y-2"><p className="text-sm">That was too short to measure (under 30 keystrokes). Not saved. Try again.</p><button onClick={() => setPh("idle")} className={ghost}>Again</button></Card> :
        <Card className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Cmp label="First key" cur={res.firstKeyMs} base={P(r => r.b)} unit=" ms" lowerBetter why="How fast you got going (getting started)" />
            <Cmp label="Speed" cur={res.wpm} base={P(r => r.a)} unit=" wpm" why={"Burst " + Math.round(res.burstWpm) + " wpm, accuracy " + Math.round(res.accuracy * 100) + "%"} />
            <Cmp label="Rhythm wobble" cur={res.ikiCv} base={P(r => r.x?.cv)} digits={2} lowerBetter why="Spread of your key gaps (mind wandering)" />
            <Cmp label="Slow tail" cur={res.tau} base={P(r => r.x?.tau)} unit=" ms" lowerBetter why="Size of your occasional long gaps (drift)" />
            <Cmp label="Long pauses" cur={res.longPauses} base={P(r => r.x?.pauses)} lowerBetter why="Gaps over a second (focus)" />
            <Cmp label="Hesitation" cur={Math.round(res.hesitation * 100)} base={P(r => (r.x?.hes != null ? Math.round(r.x.hes * 100) : null))} unit="%" lowerBetter why="Keys that came after a long wait (heaviness)" />
            <Cmp label="Time to resume" cur={res.resumeMs} base={P(r => r.x?.resume)} unit=" ms" lowerBetter why="Delay to restart after the pause (re-entry)" />
            <Cmp label="Corrections" cur={res.backspaces} base={P(r => r.x?.back)} lowerBetter why="Backspaces used (friction)" />
          </div>
          <Help>After 3 runs each line compares you with your own usual. Same keyboard and similar time of day make the comparison fairer.</Help>
          <div className="flex gap-2"><button onClick={() => setPh("idle")} className={ghost}>Again</button><button onClick={() => go("lagun")} className={ghost}>See my six forces</button></div></Card>)}
    </Screen>
  );
}

// ---------- Stroop with the words you are avoiding (Anchory interference, CAP spill) ----------
const INK = [{ n: "RED", c: "hsl(0 72% 50%)" }, { n: "GREEN", c: "hsl(135 55% 36%)" }, { n: "BLUE", c: "hsl(215 80% 50%)" }, { n: "YELLOW", c: "hsl(42 92% 44%)" }];
const NEUTRAL = ["TABLE", "CLOUD", "RIVER", "PAPER", "GLASS", "STONE", "GRASS", "SHELF", "BRICK", "SPOON"];
function taskWords(): string[] { try { const t = JSON.parse(localStorage.getItem("lagomo.tasks.v1") || "[]") as { title: string; doneAt?: number }[]; const w = t.filter(x => !x.doneAt).map(x => (x.title.split(/\s+/).find(s => s.replace(/[^a-z]/gi, "").length >= 4) || "").replace(/[^a-z]/gi, "").toUpperCase().slice(0, 10)).filter(Boolean); return Array.from(new Set(w)); } catch { return []; } }
interface Stim { word: string; ink: number; kind: string }
export function StroopTask({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "run" | "end">("idle"); const [cur, setCur] = useState<Stim | null>(null); const [n, setN] = useState(0); const [total, setTotal] = useState(0); const [res, setRes] = useState<ReturnType<typeof stroopMetrics> | null>(null);
  const prior = useRef(gameStore("stroop")); const S = useRef({ list: [] as Stim[], i: 0, t0: 0, trials: [] as Trial[], open: false, timers: [] as number[] });
  useEffect(() => () => S.current.timers.forEach(t => window.clearTimeout(t)), []);
  const next = () => { const s = S.current; if (s.i >= s.list.length) return end(); const st = s.list[s.i]; setCur(null); s.open = false; s.timers.push(window.setTimeout(() => { setCur(st); s.t0 = performance.now(); s.open = true; setN(s.i + 1); }, 450)); };
  const end = () => { const s = S.current; const m = stroopMetrics(s.trials); setRes(m); setPhase("end"); setCur(null); if (m.interference != null) { saveGame("stroop", { ts: Date.now(), a: Math.round(m.interference), b: Math.round(m.rt), c: Math.round(m.errors * 100), x: { emo: m.emotional == null ? null : Math.round(m.emotional), cv: +m.cv.toFixed(3) } }); done("stroop"); } };
  const begin = () => {
    const mk = (kind: string, words: string[], k: number) => Array.from({ length: k }, (_, i) => { const ink = Math.floor(Math.random() * 4); if (kind === "con") return { word: INK[ink].n, ink, kind }; if (kind === "inc") { let w = Math.floor(Math.random() * 4); if (w === ink) w = (w + 1) % 4; return { word: INK[w].n, ink, kind }; } return { word: words[i % words.length], ink, kind }; });
    const tw = taskWords(); const base = shuffle([...mk("con", [], 12), ...mk("inc", [], 12)]); const emo = tw.length >= 2 ? shuffle([...mk("emo", tw, 10), ...mk("neu", NEUTRAL, 10)]) : [];
    S.current = { list: [...base, ...emo], i: 0, t0: 0, trials: [], open: false, timers: [] }; setTotal(S.current.list.length); setRes(null); setPhase("run"); next();
  };
  const answer = (k: number) => { const s = S.current; if (!s.open || !cur) return; s.open = false; s.trials.push({ rt: performance.now() - s.t0, ok: k === cur.ink, kind: cur.kind }); s.i++; next(); };
  useEffect(() => { if (phase !== "run") return; const f = (e: KeyboardEvent) => { const m: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3, r: 0, g: 1, b: 2, y: 3 }; const k = m[e.key.toLowerCase()]; if (k != null) answer(k); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }); // eslint-disable-line react-hooks/exhaustive-deps
  const P = (k: (x: GameRun) => number | null | undefined) => usual(prior.current, k);
  return (
    <Screen title="Colour clash" sub="Tap the colour the word is printed in, not what it says. Quick and accurate." back={back} credit="Method: Stroop interference (slower answers when word and colour clash) reads how well attention stays tethered (Anchory; Lagun LTA Table 14). If you have open tasks, a second block mixes in words from them against neutral words: a slower answer on your own task words reads emotional spill (CAP spill; emotional Stroop paradigm). The words stay on this device and are never saved or sent, only the timing differences.">
      <Card className="flex flex-col items-center gap-4">
        {phase === "idle" && <><p className="text-sm">About a minute. Use the buttons or keys 1 to 4 (R, G, B, Y).</p><button onClick={begin} className={prim}>Start</button></>}
        {phase === "run" && <><div className="text-xs text-muted-foreground">{n} of {total}</div><div className="flex h-24 items-center justify-center text-5xl font-bold tracking-wide" aria-live="off" style={{ color: cur ? INK[cur.ink].c : "transparent" }}>{cur ? cur.word : "+"}</div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2">{INK.map((c, i) => <button key={c.n} onPointerDown={e => { e.preventDefault(); answer(i); }} className="rounded-2xl border border-border bg-secondary/40 py-3 text-sm font-medium">{i + 1} · {c.n}</button>)}</div></>}
      </Card>
      {phase === "end" && res && (res.interference == null ? <Card><p className="text-sm">Too few correct answers to measure. Try again.</p><button onClick={() => setPhase("idle")} className={ghost}>Again</button></Card> :
        <Card className="space-y-2"><div className="grid gap-2 sm:grid-cols-2">
          <Cmp label="Clash cost" cur={res.interference} base={P(r => r.a)} unit=" ms" lowerBetter why="Extra time when word and colour disagree (focus)" />
          <Cmp label="Typical answer" cur={res.rt} base={P(r => r.b)} unit=" ms" lowerBetter why={Math.round(res.errors * 100) + "% errors"} />
          {res.emotional != null && <Cmp label="Your task words" cur={res.emotional} base={P(r => r.x?.emo)} unit=" ms" lowerBetter why="Extra time on words from things you are putting off" />}
        </div><Help>{res.emotional == null ? "Add a task in Plan and a second block will compare your own task words with neutral words. " : "A slower answer on your task words means they are pulling at your attention. "}Comparison with your usual appears after 3 runs.</Help>
        <div className="flex gap-2"><button onClick={() => setPhase("idle")} className={ghost}>Again</button><button onClick={() => go("lagun")} className={ghost}>See my six forces</button></div></Card>)}
    </Screen>
  );
}

// ---------- Rule switch (Flexion: switch cost) ----------
export function SwitchTask({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "run" | "end">("idle"); const [cur, setCur] = useState<{ d: number; rule: "par" | "mag" } | null>(null); const [n, setN] = useState(0); const [res, setRes] = useState<ReturnType<typeof switchMetrics> | null>(null);
  const prior = useRef(gameStore("switch")); const S = useRef({ i: 0, prev: "" as string, t0: 0, trials: [] as Trial[], open: false, kind: "", timers: [] as number[] }); const TOT = 44;
  useEffect(() => () => S.current.timers.forEach(t => window.clearTimeout(t)), []);
  const next = () => { const s = S.current; if (s.i >= TOT) return end(); setCur(null); s.open = false; s.timers.push(window.setTimeout(() => { const rule: "par" | "mag" = Math.random() < 0.5 ? "par" : "mag"; const ds = [1, 2, 3, 4, 6, 7, 8, 9]; const d = ds[Math.floor(Math.random() * ds.length)]; s.kind = s.i < 2 ? "skip" : rule === s.prev ? "repeat" : "switch"; s.prev = rule; setCur({ d, rule }); s.t0 = performance.now(); s.open = true; setN(s.i + 1); }, 400)); };
  const end = () => { const m = switchMetrics(S.current.trials); setRes(m); setPhase("end"); setCur(null); if (m.cost != null) { saveGame("switch", { ts: Date.now(), a: Math.round(m.cost), b: Math.round(m.rt), c: Math.round(m.errors * 100), x: { cv: +m.cv.toFixed(3) } }); done("switch"); } };
  const begin = () => { S.current = { i: 0, prev: "", t0: 0, trials: [], open: false, kind: "", timers: [] }; setRes(null); setPhase("run"); next(); };
  const answer = (right: boolean) => { const s = S.current; if (!s.open || !cur) return; s.open = false; const odd = cur.d % 2 === 1, high = cur.d > 5; const truth = cur.rule === "par" ? !odd : high; /* right = Even or High */ if (s.kind !== "skip") s.trials.push({ rt: performance.now() - s.t0, ok: right === truth, kind: s.kind }); s.i++; next(); };
  useEffect(() => { if (phase !== "run") return; const f = (e: KeyboardEvent) => { if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") answer(false); if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") answer(true); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }); // eslint-disable-line react-hooks/exhaustive-deps
  const P = (k: (x: GameRun) => number | null | undefined) => usual(prior.current, k);
  return (
    <Screen title="Rule switch" sub="A number appears with a rule. Odd or even, or low or high (over 5). The rule changes without warning." back={back} credit="Method: task-switching paradigm. The extra time on trials where the rule just changed (switch cost) reads cognitive flexibility, how well your mind adapts to a changing task (Flexion; CTT Table 11). Only timings are saved.">
      <Card className="flex flex-col items-center gap-4">
        {phase === "idle" && <><p className="text-sm">About 45 seconds. Left button or left arrow for Odd or Low. Right button or right arrow for Even or High.</p><button onClick={begin} className={prim}>Start</button></>}
        {phase === "run" && <><div className="text-xs text-muted-foreground">{n} of {TOT}</div><div className="flex h-24 flex-col items-center justify-center">{cur ? <><div className="text-xs font-semibold uppercase tracking-wide text-primary">{cur.rule === "par" ? "Odd or even?" : "Low or high?"}</div><div className="text-5xl font-bold">{cur.d}</div></> : <div className="text-3xl text-muted-foreground">+</div>}</div>
          <div className="grid w-full max-w-sm grid-cols-2 gap-2"><button onPointerDown={e => { e.preventDefault(); answer(false); }} className="rounded-2xl border border-border bg-secondary/40 py-3 text-sm font-medium">{cur ? (cur.rule === "par" ? "Odd" : "Low") : "Left"}</button><button onPointerDown={e => { e.preventDefault(); answer(true); }} className="rounded-2xl border border-border bg-secondary/40 py-3 text-sm font-medium">{cur ? (cur.rule === "par" ? "Even" : "High") : "Right"}</button></div></>}
      </Card>
      {phase === "end" && res && (res.cost == null ? <Card><p className="text-sm">Too few correct answers to measure. Try again.</p><button onClick={() => setPhase("idle")} className={ghost}>Again</button></Card> :
        <Card className="space-y-2"><div className="grid gap-2 sm:grid-cols-2"><Cmp label="Switch cost" cur={res.cost} base={P(r => r.a)} unit=" ms" lowerBetter why="Extra time right after the rule changes (flexibility)" /><Cmp label="Typical answer" cur={res.rt} base={P(r => r.b)} unit=" ms" lowerBetter why={Math.round(res.errors * 100) + "% errors"} /></div>
          <Help>Comparison with your usual appears after 3 runs. Low cost means your mind switches gears easily right now.</Help><div className="flex gap-2"><button onClick={() => setPhase("idle")} className={ghost}>Again</button><button onClick={() => go("lagun")} className={ghost}>See my six forces</button></div></Card>)}
    </Screen>
  );
}

// ---------- Trace: follow a moving dot (Flexion smoothness, Slip trajectory noise) ----------
const TR = 20000, RAD = 120, SZ = 320;
export function TraceTask({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "run" | "end">("idle"); const [secs, setSecs] = useState(0); const [res, setRes] = useState<ReturnType<typeof traceMetrics> | null>(null); const [err, setErr] = useState("");
  const cv = useRef<HTMLCanvasElement>(null); const ptr = useRef<{ x: number; y: number; seen: boolean }>({ x: 0, y: 0, seen: false }); const raf = useRef(0); const prior = useRef(gameStore("trace"));
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const begin = () => {
    setErr(""); setRes(null); const c = cv.current!; const g = c.getContext("2d")!; const pts: Pt[] = []; const t0 = performance.now(); ptr.current.seen = false; setPhase("run");
    const css = (v: string, fb: string) => { const x = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return x ? "hsl(" + x + ")" : fb; };
    const step = () => {
      const t = performance.now() - t0; const a = (t / 1000) * 0.7, b = (t / 1000) * 1.05; const tx = SZ / 2 + RAD * Math.cos(a), ty = SZ / 2 + RAD * Math.sin(b);
      g.clearRect(0, 0, SZ, SZ); g.strokeStyle = css("--border", "#ccc"); g.lineWidth = 1; g.beginPath(); for (let k = 0; k <= 400; k++) { const u = (k / 400) * 4 * Math.PI; const x = SZ / 2 + RAD * Math.cos(u), y = SZ / 2 + RAD * Math.sin(1.5 * u); if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
      g.fillStyle = css("--primary", "#447d58"); g.beginPath(); g.arc(tx, ty, 9, 0, 7); g.fill();
      if (ptr.current.seen) { g.fillStyle = css("--foreground", "#222"); g.beginPath(); g.arc(ptr.current.x, ptr.current.y, 4, 0, 7); g.fill(); pts.push({ t, x: ptr.current.x, y: ptr.current.y, tx, ty }); }
      setSecs(Math.floor(t / 1000));
      if (t >= TR) { const m = traceMetrics(pts, RAD); setRes(m); setPhase("end"); if (m) { saveGame("trace", { ts: Date.now(), a: +m.error.toFixed(3), b: +m.noise.toFixed(2), c: m.ldlj == null ? 0 : +m.ldlj.toFixed(2), x: { err: +m.error.toFixed(3), noise: +m.noise.toFixed(2), ldlj: m.ldlj == null ? null : +m.ldlj.toFixed(2) } }); done("trace"); } else setErr("I did not get enough pointer movement. Keep the pointer on the dot the whole time."); return; }
      raf.current = requestAnimationFrame(step);
    }; raf.current = requestAnimationFrame(step);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); ptr.current = { x: ((e.clientX - r.left) / r.width) * SZ, y: ((e.clientY - r.top) / r.height) * SZ, seen: true }; };
  const P = (k: (x: GameRun) => number | null | undefined) => usual(prior.current, k);
  return (
    <Screen title="Trace" sub="Keep your pointer or finger on the moving dot for 20 seconds. Smooth and steady." back={back} credit="Method: how closely and how smoothly you follow a moving target. Movement smoothness (log dimensionless jerk) reads how fluently your actions flow (Flexion; cursor smoothness, IJSRA Table 8). Left-over small wobble in the path reads motor noise (Slip; cursor trajectory noise). Only summary numbers are saved.">
      <Card className="flex flex-col items-center gap-3">
        <canvas ref={cv} width={SZ} height={SZ} onPointerMove={move} onPointerDown={move} className="w-full max-w-xs touch-none rounded-3xl border border-border bg-secondary/40" aria-label="Tracking area" />
        {phase === "idle" && <button onClick={begin} className={prim}>Start</button>}
        {phase === "run" && <div className="text-sm text-muted-foreground">{Math.max(0, TR / 1000 - secs)}s. Stay on the dot.</div>}
        {err && <p className="text-sm text-[hsl(var(--v-notready))]" role="alert">{err}</p>}
      </Card>
      {phase === "end" && res && <Card className="space-y-2"><div className="grid gap-2 sm:grid-cols-3">
        <Cmp label="Tracking error" cur={Math.round(res.error * 100)} base={(() => { const b = P(r => r.a); return b == null ? null : Math.round(b * 100); })()} unit="%" lowerBetter why="Distance from the dot (of the circle size)" />
        <Cmp label="Smoothness" cur={res.ldlj} base={P(r => r.c)} digits={1} why="Higher means smoother (fluency)" />
        <Cmp label="Wobble" cur={res.noise} base={P(r => r.b)} digits={1} lowerBetter why="Small shake left over (px)" /></div>
        <Help>Comparison with your usual appears after 3 runs. Same mouse or trackpad each time keeps it fair.</Help><div className="flex gap-2"><button onClick={() => setPhase("idle")} className={ghost}>Again</button><button onClick={() => go("lagun")} className={ghost}>See my six forces</button></div></Card>}
    </Screen>
  );
}
