import { weekDays } from "@/components/StartsCard";
import type { GameState } from "@/engine/game";

/** Seven quiet dots. A kind sentence. Nothing to lose. */
export function WeekDots({ g }: { g: GameState }) {
  const wk = weekDays(g); const total = wk.reduce((a, d) => a + d.n, 0); const days = wk.filter(d => d.n > 0).length;
  const line = total === 0 ? "A fresh page. One start is enough." : days >= 5 ? "Showing up most days. Lovely." : `${days} ${days === 1 ? "day" : "days"} this week. Every one counts.`;
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0"><div className="text-sm font-semibold">This week</div><div className="text-xs text-muted-foreground">{line}</div></div>
      <div className="flex shrink-0 gap-1.5" role="img" aria-label={`${days} days started this week`}>{wk.map((d, i) => <span key={d.k} title={d.k} className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] ${d.n > 0 ? "bg-primary text-primary-foreground" : i === 6 ? "border border-primary/50 text-muted-foreground" : "bg-secondary text-muted-foreground"}`}>{d.dow}</span>)}</div>
    </div>);
}
