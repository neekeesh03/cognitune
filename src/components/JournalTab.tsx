import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { promptFor } from "@/engine/prompts";
import { FORCE, fc } from "@/engine/forces";
import { VAR_KEYS } from "@/engine/model";
import type { JournalApi } from "@/store/useJournal";

const MOODS = ["Low", "Down", "Okay", "Good", "Great"];
export function JournalTab({ j, earn }: { j: JournalApi; earn?: () => void }) {
  const [text, setText] = useState(""); const [mood, setMood] = useState(2);
  const prompt = useMemo(() => promptFor(j.profile, j.shuffleToday), [j.profile, j.shuffleToday]);
  const list = j.entries.filter(e => e.kind === "journal" && e.role === "user").slice().reverse();
  const save = () => { if (!text.trim()) return; j.addUser(text, "journal", { prompt: prompt.text, mood: mood / 4 }); earn?.(); setText(""); };
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-6">
      <div className="glass rounded-3xl p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New entry</div>
        <h2 className="mt-1 text-3xl leading-snug">{prompt.text}</h2>
        <button onClick={j.reshuffle} className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline">Different prompt</button>
        <div className="my-4 flex gap-1.5">{MOODS.map((m, i) => <button key={m} onClick={() => setMood(i)} className={`flex-1 rounded-full border px-2 py-1.5 text-xs transition ${mood === i ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{m}</button>)}</div>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Write freely..." className="w-full resize-none rounded-2xl border border-border bg-secondary/40 p-4 outline-none focus:border-primary/60" />
        <Button variant="hero" size="lg" className="mt-3 h-12 w-full rounded-2xl" disabled={!text.trim()} onClick={save}>Save entry</Button>
      </div>
      <div className="space-y-3">
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground">Your entries will appear here, with what the app picked up.</p>}
        {list.map(e => (
          <div key={e.id} className="glass rounded-3xl p-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{new Date(e.ts).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}{e.mood != null && ` · ${MOODS[Math.round(e.mood * 4)]}`}</span><button aria-label="Delete entry" onClick={() => j.remove(e.id)}><Trash2 className="h-3.5 w-3.5" /></button></div>
            {e.prompt && <div className="mb-1 font-display text-lg text-muted-foreground">{e.prompt}</div>}
            <p className="whitespace-pre-wrap">{e.text}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {VAR_KEYS.filter(k => e.signals?.levels[k] != null).map(k => { const v = e.signals!.levels[k]!; return <span key={k} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: fc(FORCE[k].color, 0.18), color: fc(FORCE[k].color) }}>{FORCE[k].title} {v >= 0.5 ? "up" : "down"}</span>; })}
              {e.signals?.openLoops.length ? <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs">open loop</span> : null}
              {e.signals?.wins.length ? <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-xs text-success">win</span> : null}
            </div>
          </div>))}
      </div>
    </div>
  );
}
