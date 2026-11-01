import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rabbit, type Mood } from "@/components/Rabbit";
import { suggestSteps } from "@/engine/plan";
import { ARMS } from "@/engine/pattern";
import { saveCheck } from "@/lib/startlog";
import type { DriveRead } from "@/lib/useDrive";
import { usePet } from "@/lib/pet";

const ROWS: { k: "sleep" | "energy" | "dread"; q: string; o: [string, string, string] }[] = [
  { k: "sleep", q: "Sleep", o: ["Poor", "Okay", "Good"] }, { k: "energy", q: "Energy", o: ["Low", "Okay", "High"] }, { k: "dread", q: "Feels", o: ["Light", "Some weight", "Heavy"] },
];
const EXAMPLES = ["Reply to that email", "Start my essay", "Tidy my desk"];

/** The front door: the Coach (a small AI that runs on your device) in one card. Say what you are putting off, press Start, or ask for help. */
export function CoachHero({ suggestion, onStart, onCoach, mood, rabbitLine, quiet, drive }: { suggestion: string; onStart: (title: string, step: string) => void; onCoach: (title: string) => void; mood: Mood; rabbitLine?: string; quiet?: boolean; drive: DriveRead }) {
  const [what, setWhat] = useState(() => { const p = sessionStorage.getItem("lagomo.prefill") || ""; if (p) sessionStorage.removeItem("lagomo.prefill"); return p; });
  const pet = usePet(); const [intro, setIntro] = useState(() => localStorage.getItem("lagomo.pet.intro") !== "1"); const [hop, setHop] = useState(false); const [openCheck, setOpenCheck] = useState(false); const [pick, setPick] = useState<{ sleep?: number; energy?: number; dread?: number }>({});
  const title = (what.trim() || suggestion).trim(); const step = title ? suggestSteps(title)[0]?.text ?? "Just open it" : "";
  const { pred, check, arm, startedToday, unsure, level, known } = drive;
  const line = rabbitLine ?? (startedToday ? "You started today. Anything more is a bonus." : known >= 3 && !unsure && pred.why[0] ? pred.why[0] : known >= 3 && !unsure ? level + " today." : title ? "Two minutes. I will stay with you." : "What is one thing you have been putting off?");
  const choose = (k: "sleep" | "energy" | "dread", v: number) => { const n = { ...pick, [k]: v }; setPick(n); if (n.sleep && n.energy && n.dread) { saveCheck({ sleep: n.sleep, energy: n.energy, dread: n.dread }); setOpenCheck(false); } };
  const idea = arm && arm !== "none" && !startedToday ? ARMS[arm] : null;
  return (
    <div className="rounded-3xl border border-primary/25 p-5 shadow-[var(--shadow-soft)] sm:p-6" style={{ background: "linear-gradient(160deg, hsl(var(--primary) / .14), hsl(var(--f-grain) / .22))" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5"><Rabbit size={40} mood={hop ? "proud" : mood} quiet /><div className="leading-tight"><div className="text-sm font-semibold" translate="no">{pet.name}</div><div className="text-[11px] text-muted-foreground">your rabbit · an AI that lives here</div></div></div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary" title={`${pet.name} is a small AI that lives in this app. What you type to it stays on your device.`}><Sparkles className="h-3 w-3" />AI</span>
      </div>
      {intro && <div className="mt-3 rounded-2xl bg-background/70 p-3 text-sm" role="note"><span translate="no" className="font-medium">{pet.name}</span> here. I am an AI that lives in this app, not a person. What you tell me stays on your device.<button onClick={() => { localStorage.setItem("lagomo.pet.intro", "1"); setIntro(false); }} className="ml-2 text-primary underline-offset-4 hover:underline">Got it</button></div>}
      <p className="mt-4 min-h-[2.5rem] font-display text-xl leading-snug sm:text-2xl" aria-live="polite">{line}</p>
      <input value={what} onChange={e => setWhat(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && title) { setHop(true); setTimeout(() => { onStart(title, step); setWhat(""); setHop(false); }, 350); } }} placeholder={suggestion || "e.g. start my essay"} aria-label="What are you putting off" className="mt-3 w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/40" />
      {!what.trim() && !suggestion && <div className="mt-2 flex flex-wrap gap-2" aria-label="Examples">{EXAMPLES.map(x => <button key={x} onClick={() => setWhat(x)} className="rounded-full border border-border bg-background/60 px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-foreground">{x}</button>)}</div>}
      {title && <p className="mt-2 text-sm text-muted-foreground">First tiny step: <span className="font-medium text-foreground">{step}</span></p>}
      <div className="mt-3 flex gap-2">
        <Button variant="hero" size="lg" className="h-13 flex-1 rounded-2xl text-lg" disabled={!title} onClick={() => { setHop(true); setTimeout(() => setHop(false), 800); setTimeout(() => { onStart(title, step); setWhat(""); }, 450); }}><Play className="mr-2 h-5 w-5" />Start</Button>
        <Button variant="outline" size="lg" className="h-13 rounded-2xl bg-background/60" onClick={() => onCoach(title || "something I am putting off")}><span>Ask <span translate="no">{pet.name}</span></span></Button>
      </div>
      {(idea || !check) && <div className="mt-3 space-y-2 text-sm">
        {idea && <div className="rounded-2xl bg-background/60 px-3 py-2"><span className="text-xs uppercase tracking-[0.15em] text-primary">Try this today</span><div className="font-medium">{idea.title}</div><div className="text-muted-foreground">{idea.text}</div></div>}
        {!check && !openCheck && <button onClick={() => setOpenCheck(true)} className="text-primary underline-offset-4 hover:underline">Ten-second check-in, so I can read your day</button>}
        {!check && openCheck && <div className="rounded-2xl bg-background/60 p-3">{ROWS.map(r => <div key={r.k} className="mb-1.5 flex items-center gap-2"><span className="w-14 shrink-0 text-xs text-muted-foreground">{r.q}</span><div className="flex flex-1 gap-1.5">{r.o.map((l, i) => <button key={l} onClick={() => choose(r.k, i + 1)} className={`flex-1 rounded-full border px-2 py-1 text-xs transition ${pick[r.k] === i + 1 ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{l}</button>)}</div></div>)}<p className="text-[11px] text-muted-foreground">Stays on your device.</p></div>}
      </div>}
    </div>);
}
