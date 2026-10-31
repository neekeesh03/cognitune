import { useState } from "react";
import { Moon } from "lucide-react";
import { RabbitFace, type Face } from "@/components/RabbitFace";
import { wornNow } from "@/components/Rabbit";
import { VoiceButton } from "@/components/VoiceButton";
import { dkey } from "@/engine/game";
import type { GameApi } from "@/store/useGame";
import type { JournalApi } from "@/store/useJournal";
import type { PlanApi } from "@/store/usePlan";

const MOODS: { label: string; face: Face }[] = [{ label: "Low", face: "sleepy" }, { label: "Down", face: "gentle" }, { label: "Okay", face: "calm" }, { label: "Good", face: "happy" }, { label: "Great", face: "sparkle" }];
const key = () => "lagomo.wrap." + dkey();
/** Twenty seconds to close the day: one face, one line (typed or spoken), and a kind little summary. Optional, always. */
export function EveningWrap({ j, game, plan, name, alwaysOpen }: { j: JournalApi; game: GameApi; plan: PlanApi; name: string; alwaysOpen?: boolean }) {
  const [done, setDone] = useState(() => !!localStorage.getItem(key())); const [open, setOpen] = useState(!!alwaysOpen); const [mood, setMood] = useState(2); const [text, setText] = useState("");
  const hour = new Date().getHours(); if (!alwaysOpen && (hour < 17 || (done && !open))) return null;
  const day = dkey(); const starts = game.g.counts["s_" + day] ?? 0;
  const tasks = plan.tasks.filter(t => t.doneAt && dkey(new Date(t.doneAt)) === day).length; const blocks = plan.blocks.filter(b => b.day === day && b.done).length;
  const steps = plan.tasks.reduce((n, t) => n + t.steps.filter(s => s.doneAt && dkey(new Date(s.doneAt)) === day).length, 0);
  const save = () => { j.addUser(text.trim() || `Evening wrap-up: ${MOODS[mood].label}`, "journal", { prompt: "Evening wrap-up", mood: mood / 4 }); game.earn("journal"); localStorage.setItem(key(), "1"); setDone(true); };
  if (done) {
    const bits = [starts && `${starts} start${starts === 1 ? "" : "s"}`, steps && `${steps} tiny step${steps === 1 ? "" : "s"}`, tasks && `${tasks} task${tasks === 1 ? "" : "s"} finished`, blocks && `${blocks} planned block${blocks === 1 ? "" : "s"}`].filter(Boolean) as string[];
    return (
      <div className="glass rounded-3xl p-5 text-center">
        <div className="mx-auto w-fit"><RabbitFace crop face={starts || steps || tasks ? "proud" : "cosy"} wear={wornNow()} size={72} /></div>
        <div className="mt-1 font-semibold">That is today, {name.split(" ")[0]}.</div>
        <p className="mt-1 text-sm text-muted-foreground">{bits.length ? `You did ${bits.join(", ")}.` : "A quiet day. That counts too."} Rest well. Tomorrow is a fresh page.</p>
        {!alwaysOpen && <button onClick={() => { localStorage.removeItem(key()); setDone(false); setOpen(true); }} className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline">Add another line</button>}
      </div>);
  }
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold"><Moon className="h-4 w-4 text-primary" />Close the day <span className="font-normal text-muted-foreground">· 20 seconds</span></div>
      <p className="text-sm text-muted-foreground">How was today, in one tap?</p>
      <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="How was today">
        {MOODS.map((m, i) => <button key={m.label} role="radio" aria-checked={mood === i} onClick={() => setMood(i)} className={`flex flex-col items-center rounded-2xl border px-1 py-1.5 text-xs transition ${mood === i ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}><RabbitFace crop face={m.face} size={34} title={m.label} />{m.label}</button>)}
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="One line about today. Optional." aria-label="One line about today" className="mt-3 w-full resize-none rounded-2xl border border-border bg-secondary/40 p-3 text-base outline-none focus:border-primary/60" />
      <div className="mt-2"><VoiceButton value={text} onChange={setText} /></div>
      <button onClick={save} className="mt-3 h-11 w-full rounded-2xl bg-primary text-primary-foreground">Close the day</button>
    </div>);
}
