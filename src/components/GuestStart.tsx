import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestSteps } from "@/engine/plan";
import { FocusTimer } from "@/components/FocusTimer";
import { Mascot } from "@/components/Mascot";
import { guestHit, rememberGuestStart } from "@/lib/guest";
import { tr } from "@/i18n";

const EXAMPLES = ["Reply to that email", "Start my essay", "Tidy my desk"];

/** Try before sign-up: one box, one button, a real two-minute start. Saving it is the reason to make an account. */
export function GuestStart({ onSave }: { onSave: () => void }) {
  const [what, setWhat] = useState(() => { const p = sessionStorage.getItem("lagomo.prefill") || ""; return p; });
  const [live, setLive] = useState<string | null>(null);
  const title = what.trim(); const step = title ? suggestSteps(title)[0]?.text ?? "Just open it" : "";
  const go = () => { if (!title) return; guestHit("guest_start"); rememberGuestStart(); setLive(step); };
  return (
    <div className="w-full">
      <div className="glass flex flex-col gap-2 rounded-3xl p-3">
        <input value={what} onChange={e => setWhat(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} aria-label="What are you putting off" placeholder="What are you putting off?" className="h-12 w-full shrink-0 rounded-2xl bg-secondary/60 px-4 text-base outline-none focus:ring-2 focus:ring-primary/40" />
        <Button variant="hero" className="h-12 w-full rounded-2xl px-6 text-base" disabled={!title} onClick={go}><Play className="mr-2 h-4 w-4" />Start for 2 minutes</Button>
      </div>
      {!title && <div className="mt-2 flex flex-wrap justify-center gap-2">{EXAMPLES.map(x => <button key={x} onClick={() => setWhat(tr(x))} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-foreground">{tr(x)}</button>)}</div>}
      {title ? <p className="mt-2 text-sm text-muted-foreground">{`First tiny step: ${step}`}</p> : <p className="mt-2 text-sm text-muted-foreground">No account needed. Nothing is judged.</p>}
      {live && <FocusTimer color="var(--f-flexion)" task={live} minutes={2} autoStart onStarted={() => undefined} onDone={() => guestHit("guest_done")} onClose={() => setLive(null)} cele={{}} guest={{ onSave: () => { guestHit("guest_save"); sessionStorage.removeItem("lagomo.prefill"); setLive(null); onSave(); } }} />}
    </div>);
}

/** Shown inside the timer for guests once the two minutes are up (or they stop early). */
export function GuestSave({ onSave, onLater }: { onSave: () => void; onLater: () => void }) {
  return (
    <div className="mt-5 w-full max-w-sm rounded-3xl bg-secondary/60 p-5 text-center">
      <div className="mx-auto mb-2 w-fit"><Mascot size={44} /></div>
      <div className="text-lg font-semibold">You started. Keep it.</div>
      <p className="mt-1 text-sm text-muted-foreground">Make a free account to save this start and let a friend see you hop in next time.</p>
      <Button variant="hero" className="mt-4 h-11 w-full rounded-2xl" onClick={onSave}>Save my start</Button>
      <button onClick={onLater} className="mt-2 text-sm text-muted-foreground hover:text-foreground">Not now</button>
    </div>);
}
