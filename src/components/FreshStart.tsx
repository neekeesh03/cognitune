import { useState } from "react";
import { Trash2 } from "lucide-react";
import { PRESETS, loadLandmarks, nextLandmark, saveLandmarks, type Landmark } from "@/engine/fresh";

/** Pick your own fresh-start dates. A new semester or a new job feels like a clean page, and that helps you begin. */
export function FreshStart() {
  const [marks, setMarks] = useState<Landmark[]>(loadLandmarks); const [label, setLabel] = useState(PRESETS[0]); const [date, setDate] = useState("");
  const save = (m: Landmark[]) => { setMarks(m); saveLandmarks(m); };
  const nxt = nextLandmark(new Date(), marks);
  return (
    <div className="glass rounded-3xl p-5">
      <div className="text-sm font-semibold">Fresh-start dates</div>
      <p className="mt-1 text-xs text-muted-foreground">New weeks and months already count. Add your own, like a new term. On that day you get a clean-page nudge.</p>
      {nxt && <p className="mt-2 rounded-2xl bg-primary/10 px-3 py-2 text-sm">{nxt.label} is in {nxt.days} {nxt.days === 1 ? "day" : "days"}. A good day to begin something.</p>}
      {marks.length > 0 && <ul className="mt-2 space-y-1 text-sm">{marks.map(m => <li key={m.id} className="flex items-center justify-between gap-2"><span>{m.label} <span className="text-muted-foreground">· {m.date}</span></span><button aria-label={`Remove ${m.label}`} onClick={() => save(marks.filter(x => x.id !== m.id))} className="p-1 text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={label} onChange={e => setLabel(e.target.value)} aria-label="What is starting" className="h-9 rounded-2xl border border-border bg-secondary/60 px-3 text-sm">{PRESETS.map(p => <option key={p}>{p}</option>)}</select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date" className="h-9 rounded-2xl border border-border bg-secondary/60 px-3 text-sm" />
        <button disabled={!date} onClick={() => { save([...marks, { id: crypto.randomUUID(), label, date }]); setDate(""); }} className="rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-40">Add</button>
      </div>
    </div>);
}
