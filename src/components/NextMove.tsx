import { useState } from "react";
import { ChevronDown } from "lucide-react";
export interface Move { key: string; kicker: string; title: string; sub?: string; cta: string; onClick: () => void }

/** One best next step, not a pile of cards. The rest wait one tap away. */
export function NextMove({ moves }: { moves: Move[] }) {
  const [all, setAll] = useState(false);
  if (!moves.length) return null; const [first, ...rest] = moves;
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1"><div className="text-xs uppercase tracking-[0.2em] text-primary">{first.kicker}</div><div className="truncate text-lg font-semibold">{first.title}</div>{first.sub && <div className="line-clamp-2 text-sm text-muted-foreground">{first.sub}</div>}</div>
        <button onClick={first.onClick} className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm">{first.cta}</button>
      </div>
      {rest.length > 0 && <>
        <button onClick={() => setAll(a => !a)} aria-expanded={all} className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">{all ? "Hide the rest" : `${rest.length} more`}<ChevronDown className={`h-3.5 w-3.5 transition ${all ? "rotate-180" : ""}`} /></button>
        {all && <ul className="mt-2 space-y-2 border-t border-border/60 pt-2">{rest.map(m => <li key={m.key} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{m.kicker}</div><div className="truncate text-sm font-medium">{m.title}</div>{m.sub && <div className="truncate text-xs text-muted-foreground">{m.sub}</div>}</div><button onClick={m.onClick} className="shrink-0 rounded-full border border-primary/40 px-3 py-1 text-sm text-primary">{m.cta}</button></li>)}</ul>}
      </>}
    </div>);
}
