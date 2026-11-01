import { Gift } from "lucide-react";
/** Today in three small steps. Filling the ring is the goal, and finishing it opens the spark box. No penalty for a partial day. */
export function MomentumRing({ steps, boxReady, onBox }: { steps: { label: string; done: boolean }[]; boxReady: boolean; onBox: () => void }) {
  const n = steps.filter(s => s.done).length; const R = 26, C = 2 * Math.PI * R, seg = C / 3, gap = 6; const next = steps.find(s => !s.done);
  return (
    <div className="glass flex items-center gap-4 rounded-3xl p-4">
      <div className="relative h-16 w-16 shrink-0"><svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>{steps.map((s, i) => <circle key={i} cx="32" cy="32" r={R} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${seg - gap} ${C - seg + gap}`} strokeDashoffset={-i * seg} className={s.done ? "stroke-primary" : "stroke-foreground/10"} style={{ transition: "stroke .4s" }} />)}</svg><div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{n}/3</div></div>
      <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{n === 3 ? "Day complete" : "Today"}</div><div className="text-xs text-muted-foreground">{n === 3 ? "That is a full day of small wins." : next ? `Next: ${next.label.toLowerCase()}` : ""}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">{steps.map(s => <span key={s.label} className={s.done ? "text-primary" : "text-muted-foreground"}>{s.done ? "✓ " : "○ "}{s.label}</span>)}</div></div>
      {boxReady && <button onClick={onBox} className="flex shrink-0 animate-breathe items-center gap-1 rounded-full bg-primary/15 px-3 py-1.5 text-sm text-primary"><Gift className="h-4 w-4" />Open</button>}
    </div>);
}
