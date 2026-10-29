import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, X } from "lucide-react";

interface Props { color: string; task: string; onStarted: () => void; onClose: () => void; onDone?: () => void; minutes?: number; autoStart?: boolean }
const PRESETS = [{ m: 2, label: "2 min entry" }, { m: 10, label: "10 min sprint" }, { m: 25, label: "25 min block" }];
export function FocusTimer({ color, task, onStarted, onClose, onDone, minutes, autoStart }: Props) {
  const start = (minutes ?? 2) * 60;
  const [total, setTotal] = useState(start);
  const [left, setLeft] = useState(start);
  const [run, setRun] = useState(!!autoStart);
  const [done, setDone] = useState(false);
  const fired = useRef(false);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setLeft(l => { if (l <= 1) { clearInterval(id); setRun(false); setDone(true); setTimeout(() => onDone?.(), 0); return 0; } return l - 1; }), 1000);
    return () => clearInterval(id);
  }, [run]);
  useEffect(() => { if (run && !fired.current) { fired.current = true; onStarted(); } }, [run, onStarted]);
  const size = 260, r = 112, c = 2 * Math.PI * r, frac = left / total;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl animate-rise">
      <button aria-label="Close" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:text-foreground"><X /></button>
      <p className="mb-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">Focus</p>
      <h2 className="mb-8 max-w-sm px-6 text-center text-3xl">{task || "Your task"}</h2>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground) / .1)" strokeWidth="14" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`hsl(${color})`} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} style={{ transition: "stroke-dasharray 1s linear", filter: `drop-shadow(0 0 10px hsl(${color} / .6))` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-7xl tabular-nums">{done ? "Done" : `${mm}:${ss}`}</div>
          <div className="mt-1 text-xs text-muted-foreground">{done ? "You started. That is the hard part." : run ? "Just stay with it" : "Press start"}</div>
        </div>
      </div>
      {!minutes && !run && !done && left === total && (
        <div className="mt-8 flex gap-2">{PRESETS.map(p => <button key={p.m} onClick={() => { setTotal(p.m * 60); setLeft(p.m * 60); }} className={`rounded-full border px-4 py-1.5 text-sm transition ${total === p.m * 60 ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{p.label}</button>)}</div>
      )}
      <div className="mt-8 flex gap-3">
        {!done && <Button variant="hero" size="lg" className="rounded-full px-10" onClick={() => setRun(r => !r)}>{run ? <><Pause className="mr-2 h-4 w-4" />Pause</> : <><Play className="mr-2 h-4 w-4" />{left === total ? "Start" : "Resume"}</>}</Button>}
        {done && <Button variant="hero" size="lg" className="rounded-full px-10" onClick={onClose}>Back</Button>}
      </div>
    </div>
  );
}
