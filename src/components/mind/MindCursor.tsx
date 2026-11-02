import { useEffect, useRef, useState } from "react";
import { Card, Help, Screen, type MindProps } from "@/components/mind/MindParts";
import { analyseTremor, type TremorResult } from "@/engine/tremor";
import { gameStore, saveGame } from "@/engine/games";

const ghost = "rounded-full border border-border px-4 py-2 text-sm"; const prim = "rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground";
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const DUR = 20;

/** Laptop version of Steady hand: hold the pointer inside a circle. Position is sampled 60 times a second and run through the same tremor filter. */
export function SteadyCursor({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "run" | "end">("idle"); const [secs, setSecs] = useState(0); const [res, setRes] = useState<TremorResult | null>(null); const [inside, setInside] = useState(true);
  const pos = useRef({ x: 0, y: 0, seen: false }); const buf = useRef<{ t: number[]; x: number[]; y: number[]; z: number[] }>({ t: [], x: [], y: [], z: [] }); const timers = useRef<number[]>([]); const prior = useRef(gameStore("cursor"));
  const clear = () => { timers.current.forEach(t => { window.clearTimeout(t); window.clearInterval(t); }); timers.current = []; };
  useEffect(() => clear, []);
  const begin = () => {
    buf.current = { t: [], x: [], y: [], z: [] }; const t0 = performance.now(); setPhase("run"); setSecs(0);
    timers.current.push(window.setInterval(() => { const p = pos.current; if (!p.seen) return; const b = buf.current; b.t.push(performance.now() - t0); b.x.push(p.x); b.y.push(p.y); b.z.push(0); }, 1000 / 60));
    timers.current.push(window.setInterval(() => setSecs(v => v + 1), 1000));
    timers.current.push(window.setTimeout(() => { clear(); const b = buf.current; const out = analyseTremor(b.t, b.x, b.y, b.z); setRes(out); setPhase("end"); if (out.ok) { saveGame("cursor", { ts: Date.now(), a: out.rms, b: out.hz, c: out.rate }); done("cursor"); } }, DUR * 1000));
  };
  const base = prior.current.length >= 3 ? median(prior.current.slice(-15).map(g => g.a)) : null; const verdict = res?.ok && base ? (res.rms > base * 1.3 ? "shaky" : res.rms < base * 0.75 ? "still" : "usual") : null;
  return (
    <Screen title="Steady cursor" sub="Rest your hand on the mouse or trackpad and keep the pointer inside the circle for 20 seconds. Do not move on purpose." back={back} credit="Method: your pointer position is sampled 60 times a second, filtered to the 4 to 14 Hz band where physiological hand tremor lives, and its size is measured. This is rougher than a phone motion sensor and depends on your mouse, desk and grip, so only compare with your own runs on the same setup. Not a medical test. Nothing leaves this device.">
      <Card className="flex flex-col items-center gap-3">
        <div onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); pos.current = { x: e.clientX, y: e.clientY, seen: true }; setInside(dx * dx + dy * dy < (r.width / 2) ** 2); }} className={"flex h-44 w-44 select-none items-center justify-center rounded-full border-2 bg-secondary/40 p-4 text-center text-sm " + (phase === "run" && !inside ? "border-[hsl(var(--v-notready))]" : "border-primary")}>
          {phase === "idle" && "Move the pointer here, then press Start"}{phase === "run" && (inside ? Math.max(0, DUR - secs) + "s. Hold still" : "Back inside the circle")}{phase === "end" && "Done"}</div>
        {phase === "idle" && <button onClick={begin} className={prim}>Start</button>}
        {phase === "run" && <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: (secs / DUR) * 100 + "%" }} /></div>}
      </Card>
      {res && (res.ok ? <Card className="space-y-2"><div className="flex flex-wrap gap-6"><div><div className="text-3xl font-semibold">{res.rms.toFixed(3)}</div><div className="text-xs text-muted-foreground">pointer shake in pixels (lower is steadier)</div></div><div><div className="text-3xl font-semibold">{res.hz}</div><div className="text-xs text-muted-foreground">shake pitch (Hz)</div></div></div>
        {verdict === "shaky" && <p className="text-sm">Shakier than your usual ({base!.toFixed(3)}). Often goes with stress, caffeine or a short night. It is information, not a verdict.</p>}
        {verdict === "still" && <p className="text-sm">Steadier than your usual ({base!.toFixed(3)}).</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({base!.toFixed(3)}).</p>}
        {!base && <Help>After 3 runs it compares you with your own usual. Use the same mouse and desk each time.</Help>}
        {res.rms === 0 && <Help>The pointer did not move at all. Mice report whole pixels, so very still hands can read as zero.</Help>}
        <div className="flex flex-wrap gap-2"><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Again</button>{verdict === "shaky" && <button onClick={() => go("breathe")} className={ghost}>Slow breathing</button>}</div></Card>
        : <Card className="space-y-2"><p className="text-sm">{res.reason}</p><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Try again</button></Card>)}
    </Screen>
  );
}
