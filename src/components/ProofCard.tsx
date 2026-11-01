import { useMemo } from "react";
import { useStartLog } from "@/lib/startlog";
import { loadCoach } from "@/engine/coach";
import { proof } from "@/engine/proof";

/** Proof you can start: your own record. On a day it feels impossible, this is the answer. */
export function ProofCard() {
  const { log } = useStartLog(); const p = useMemo(() => proof(log, loadCoach().events), [log]);
  if (p.starts === 0) return null;
  const since = p.first ? new Date(p.first).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Proof you can start</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div><div className="text-3xl font-semibold text-primary">{p.starts}</div><div className="text-xs text-muted-foreground">{p.starts === 1 ? "start" : "starts"}</div></div>
        <div><div className="text-3xl font-semibold text-primary">{p.days}</div><div className="text-xs text-muted-foreground">{p.days === 1 ? "day" : "days"} you began</div></div>
        <div><div className="text-3xl font-semibold text-primary">{p.hardDays}</div><div className="text-xs text-muted-foreground">on hard days</div></div>
      </div>
      <p className="mt-3 text-sm">{p.hardDays > 0 ? "You started even when it felt heavy. That is the real skill." : "Every one of these was a day you began."}{since && <span className="text-muted-foreground"> Since {since}.</span>}</p>
      <ul className="mt-3 space-y-1 text-sm">{p.recent.map(r => <li key={r.ts} className="flex justify-between gap-3"><span className="truncate">{r.task}</span><span className="shrink-0 text-muted-foreground">{r.o === "did" ? "Did it" : r.o === "got" ? "Got going" : new Date(r.ts).toLocaleDateString([], { month: "short", day: "numeric" })}</span></li>)}</ul>
    </div>);
}
