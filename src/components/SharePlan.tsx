import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtTime, type Block } from "@/engine/plan";
import type { SharedPlan } from "@/net/useChat";

const DURS = [15, 25, 45, 60];
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayLabel = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); };

/** Small form to plan a start with a friend. */
export function PlanTogetherForm({ first, onSend, onClose }: { first: string; onSend: (p: SharedPlan, addMine: boolean) => Promise<void>; onClose: () => void }) {
  const today = new Date(); const [title, setTitle] = useState(""); const [day, setDay] = useState(keyOf(today)); const [start, setStart] = useState(() => Math.min(21 * 60, (Math.ceil((today.getHours() * 60 + today.getMinutes() + 30) / 30) * 30)));
  const [dur, setDur] = useState(25); const [mine, setMine] = useState(true); const [busy, setBusy] = useState(false);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const send = async () => { if (!title.trim() || busy) return; setBusy(true); try { await onSend({ id: crypto.randomUUID(), title: title.trim().slice(0, 120), day, start, dur }, mine); onClose(); } finally { setBusy(false); } };
  return (
    <div className="space-y-3 rounded-3xl border border-border bg-background p-4 text-sm">
      <div className="font-semibold">Plan a start with {first}</div>
      <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} aria-label="What will you start" placeholder="What will you start?" maxLength={120} translate="no" dir="auto" className="h-11 w-full rounded-2xl bg-secondary/60 px-3 outline-none focus:ring-2 focus:ring-primary/30" />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setDay(keyOf(today))} className={`rounded-full border px-3 py-1.5 ${day === keyOf(today) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>Today</button>
        <button onClick={() => setDay(keyOf(tomorrow))} className={`rounded-full border px-3 py-1.5 ${day === keyOf(tomorrow) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>Tomorrow</button>
        <input type="date" aria-label="Pick a day" value={day} min={keyOf(today)} onChange={e => e.target.value && setDay(e.target.value)} className="h-9 rounded-2xl border border-border bg-secondary/60 px-3" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Start time" value={start} onChange={e => setStart(Number(e.target.value))} className="h-9 rounded-2xl border border-border bg-secondary/60 px-3">{Array.from({ length: 34 }, (_, i) => 360 + i * 30).map(m => <option key={m} value={m}>{fmtTime(m)}</option>)}</select>
        {DURS.map(d => <button key={d} onClick={() => setDur(d)} className={`rounded-full border px-3 py-1.5 ${dur === d ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{d} min</button>)}
      </div>
      <label className="flex items-center gap-2 text-muted-foreground"><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />Also add it to my day, with a reminder</label>
      <div className="flex gap-2"><Button variant="hero" className="rounded-full" disabled={!title.trim() || busy} onClick={send}><CalendarPlus className="mr-1 h-4 w-4" />Send plan</Button><Button variant="ghost" className="rounded-full" onClick={onClose}>Cancel</Button></div>
    </div>);
}

/** A plan shown inside the chat. The other person can add it to their own day with one tap. */
export function PlanCard({ p, mine, first, blocks, onAdd }: { p: SharedPlan; mine: boolean; first: string; blocks: Block[]; onAdd: () => void }) {
  const added = blocks.some(b => b.sharedId === p.id);
  return (
    <div className="min-w-[14rem]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] opacity-80"><CalendarPlus className="h-3.5 w-3.5" />{mine ? "You planned" : `${first} planned`}</div>
      <div className="mt-1 text-lg font-semibold" translate="no" dir="auto">{p.title}</div>
      <div className="text-sm opacity-90">{dayLabel(p.day)} · {fmtTime(p.start)} · {p.dur} min</div>
      {added ? <div className="mt-2 flex items-center gap-1 text-sm opacity-90"><Check className="h-4 w-4" />In your day</div>
        : !mine && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={onAdd}>Add to my day</Button>}
      {mine && !added && <div className="mt-1 text-xs opacity-80">Sent. Not in your day yet.</div>}
    </div>);
}
