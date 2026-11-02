import { useEffect, useRef, useState } from "react";
import { exGauss, entropy, sd, mean } from "@/engine/signals";
import { Card, Help, Primary, Saved, Screen, type MindProps } from "@/components/mind/MindParts";

const ghost = "rounded-full border border-border px-4 py-2 text-sm";
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };

// ---- Mood map: one tap on a picture instead of two questions ----
const QUAD = (e: number, m: number) => e >= 3 && m >= 3 ? { name: "Fired up", tip: "Good moment to start something that matters.", view: null as null | "breathe" | "kind" | "brk" } : e >= 3 ? { name: "Wound up", tip: "Lots of energy, not so happy. Slow breathing helps settle it first.", view: "breathe" as const } : m >= 3 ? { name: "Calm and content", tip: "Gentle energy. A small, easy start suits this.", view: null } : { name: "Flat", tip: "Low on both. Be kind first, then take a short break.", view: "kind" as const };
export function MoodMap({ mind, update, done, back, go }: MindProps) {
  const [pt, setPt] = useState<{ e: number; m: number; x: number; y: number } | null>(null); const [saved, setSaved] = useState(false);
  const recent = (mind.pulse ?? []).filter(p => Date.now() - p.ts < 7 * 864e5).slice(-30);
  const pick = (ev: React.PointerEvent<HTMLDivElement>) => { const r = ev.currentTarget.getBoundingClientRect(); const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)); setPt({ x, y, m: Math.round(1 + x * 4), e: Math.round(1 + (1 - y) * 4) }); setSaved(false); };
  const q = pt ? QUAD(pt.e, pt.m) : null;
  return (
    <Screen title="Mood map" sub="No questions. Tap the spot that feels like you right now." back={back} credit="Based on the circumplex model of mood (Russell, 1980): feelings sit on two simple scales, pleasant to unpleasant and calm to energised. Single-item ratings are less precise than long questionnaires, so this is best for spotting your own ups and downs over time, not for labelling you.">
      <Card>
        <div className="relative mx-auto aspect-square w-full max-w-sm touch-none select-none overflow-hidden rounded-3xl border border-border bg-secondary/40" onPointerDown={pick} role="application" aria-label="Mood map. Tap to place yourself. Left is low mood, right is good mood, up is more energy.">
          <div className="pointer-events-none absolute inset-y-0 start-1/2 w-px bg-border" /><div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-border" />
          <span className="pointer-events-none absolute start-2 top-2 text-[11px] text-muted-foreground">Wound up</span><span className="pointer-events-none absolute end-2 top-2 text-[11px] text-muted-foreground">Fired up</span>
          <span className="pointer-events-none absolute start-2 bottom-2 text-[11px] text-muted-foreground">Flat</span><span className="pointer-events-none absolute end-2 bottom-2 text-[11px] text-muted-foreground">Calm and content</span>
          {recent.map(p => <span key={p.ts} className="pointer-events-none absolute h-2 w-2 -translate-x-1 -translate-y-1 rounded-full bg-primary/30" style={{ left: `${((p.m - 1) / 4) * 100}%`, top: `${(1 - (p.e - 1) / 4) * 100}%` }} />)}
          {pt && <span className="pointer-events-none absolute h-6 w-6 -translate-x-3 -translate-y-3 rounded-full border-2 border-background bg-primary shadow-lg" style={{ left: `${pt.x * 100}%`, top: `${pt.y * 100}%` }} />}
        </div>
        <div className="mx-auto mt-1 flex max-w-sm justify-between text-[11px] text-muted-foreground"><span>Low mood</span><span>Good mood</span></div>
        <Help>Up is more energy, down is less. Faint dots are your taps from the last 7 days.</Help>
      </Card>
      {q && <Card className="space-y-2"><div className="text-lg font-semibold">{q.name}</div><p className="text-sm">{q.tip}</p>
        <div className="flex flex-wrap gap-2">{!saved ? <Primary onClick={() => { update(x => ({ ...x, pulse: [...x.pulse, { ts: Date.now(), e: pt!.e, m: pt!.m }] })); setSaved(true); done("pulse"); }}>Save this spot</Primary> : <Saved text="Saved. It also feeds your energy map." />}{q.view && <button onClick={() => go(q.view!)} className={ghost}>Try the suggestion</button>}</div></Card>}
    </Screen>
  );
}

// ---- Focus tap: a 40-second reaction game. Your own speed against your own usual ----
const KEY = "lagomo.reflex.v1"; interface Run { ts: number; med: number; lapses: number; early: number; n: number; tau?: number; cv?: number; ent?: number }
const loadRuns = (): Run[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const TRIALS = 10;
export function FocusTap({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "end">("idle"); const [count, setCount] = useState(0); const [last, setLast] = useState<number | null>(null);
  const rts = useRef<number[]>([]); const early = useRef(0); const t0 = useRef(0); const timer = useRef<number>(); const runs = useRef<Run[]>(loadRuns()); const [res, setRes] = useState<Run | null>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const next = () => { setPhase("wait"); timer.current = window.setTimeout(() => { t0.current = performance.now(); setPhase("go"); }, 1200 + Math.random() * 2800); };
  const finish = () => {
    const med = Math.round(median(rts.current)); const ex = exGauss(rts.current); const run: Run = { ts: Date.now(), med, lapses: rts.current.filter(x => x > 500).length, early: early.current, n: rts.current.length, tau: Math.round(ex.tau), cv: Math.round((sd(rts.current) / (mean(rts.current) || 1)) * 1000) / 1000, ent: Math.round(entropy(rts.current, 8, 150, 1500) * 1000) / 1000 };
    runs.current = [...runs.current, run].slice(-60); try { localStorage.setItem(KEY, JSON.stringify(runs.current)); } catch { /* ignore */ } setRes(run); setPhase("end"); done("focus");
  };
  const tap = () => {
    if (phase === "idle") { rts.current = []; early.current = 0; setCount(0); setRes(null); next(); return; }
    if (phase === "wait") { window.clearTimeout(timer.current); early.current++; setLast(null); next(); return; }
    if (phase === "go") { const rt = Math.round(performance.now() - t0.current); rts.current.push(rt); setLast(rt); setCount(rts.current.length); if (rts.current.length >= TRIALS) finish(); else next(); }
  };
  const prev = runs.current.filter(r => !res || r.ts !== res.ts).slice(-15); const base = prev.length >= 3 ? median(prev.map(r => r.med)) : null;
  const verdict = res && base ? (res.med > base * 1.15 ? "slow" : res.med < base * 0.9 ? "sharp" : "usual") : null;
  return (
    <Screen title="Focus tap" sub="A 40-second game, no questions. Tap the circle the moment it turns green." back={back} credit="Based on the psychomotor vigilance test, a standard lab measure of alertness that slows when you are short on sleep. A 3-minute version has been validated (Basner et al., 2011); this 40-second version has not, so it only compares you with your own usual, never with other people.">
      <Card className="flex flex-col items-center gap-3">
        <button onPointerDown={e => { e.preventDefault(); tap(); }} aria-label={phase === "go" ? "Tap now" : "Tap when it turns green"} className={`flex h-48 w-48 touch-none select-none items-center justify-center rounded-full text-lg font-semibold text-primary-foreground transition-colors ${phase === "go" ? "bg-[hsl(var(--v-ready))]" : phase === "wait" ? "bg-[hsl(var(--v-notready))]" : "bg-primary"}`}>
          {phase === "idle" ? "Tap to begin" : phase === "wait" ? "Wait..." : phase === "go" ? "TAP" : last != null ? `${last} ms` : "Done"}</button>
        {(phase === "wait" || phase === "go") && <div className="text-sm text-muted-foreground">{count} of {TRIALS}{last != null ? ` · last ${last} ms` : ""}</div>}
        {phase === "wait" && <Help>Tapping early just restarts that round.</Help>}
      </Card>
      {res && <Card className="space-y-2"><div className="text-lg font-semibold">{res.med} ms typical reaction</div>
        <p className="text-sm">{res.lapses} slow taps (over half a second) and {res.early} early taps.</p>
        {verdict === "slow" && <p className="text-sm">That is slower than your usual ({Math.round(base!)} ms). It often goes with a short night or a long stretch of work. It is information, not a verdict.</p>}
        {verdict === "sharp" && <p className="text-sm">Sharper than your usual ({Math.round(base!)} ms). A good moment for the task that needs thinking.</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({Math.round(base!)} ms).</p>}
        {!base && <Help>Do this a few times on different days. After 3 runs it compares you with your own usual.</Help>}
        <div className="flex flex-wrap gap-2"><button onClick={() => { setPhase("idle"); setRes(null); }} className={ghost}>Again</button>{verdict === "slow" && <><button onClick={() => go("brk")} className={ghost}>Take a short break</button><button onClick={() => go("sleep")} className={ghost}>Check my sleep</button></>}</div></Card>}
      {runs.current.length > 1 && <Card><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your last runs (typical ms, lower is quicker)</div><div className="mt-2 flex h-16 items-end gap-1">{runs.current.slice(-20).map(r => <div key={r.ts} title={`${r.med} ms`} className="flex-1 rounded-t bg-primary/60" style={{ height: `${Math.min(100, (r.med / Math.max(...runs.current.slice(-20).map(x => x.med))) * 100)}%` }} />)}</div></Card>}
    </Screen>
  );
}
