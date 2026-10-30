import { useState } from "react";
import { track } from "@/lib/track";

const KEY = "lagomo.namecheck.v1";
const SAY = [["right", "la-GO-mo"], ["other", "LAG-o-mo"], ["other", "la-GOH-moh"], ["other", "Something else"]] as const;
const MEAN = [["ok", "Just the right amount, plus go"], ["miss", "A kind of rabbit"], ["miss", "A place in Sweden"], ["miss", "No idea"]] as const;
/** Two anonymous questions, asked once, a day after you first open the app. Only counters are stored. */
export function NameCheck() {
  const first = Number(localStorage.getItem("lagomo.first") || 0);
  const [step, setStep] = useState(0);
  const due = !localStorage.getItem(KEY) && first > 0 && Date.now() - first > 20 * 3600 * 1000;
  if (!due) return null;
  const finish = () => { localStorage.setItem(KEY, String(Date.now())); setStep(3); };
  return (
    <div className="glass rounded-3xl p-5 text-sm">
      {step === 0 && <><div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Two quick questions, anonymous</div><div className="mb-3 font-semibold">How would you say the app's name out loud?</div>
        <div className="flex flex-wrap gap-2">{SAY.map(([k, l]) => <button key={l} className="rounded-full border border-border px-3 py-1.5 hover:border-primary" onClick={() => { track(k === "right" ? "name_say_right" : "name_say_other"); setStep(1); }}>{l}</button>)}</div></>}
      {step === 1 && <><div className="mb-3 font-semibold">What does the name stand for?</div>
        <div className="flex flex-wrap gap-2">{MEAN.map(([k, l]) => <button key={l} className="rounded-full border border-border px-3 py-1.5 hover:border-primary" onClick={() => { track(k === "ok" ? "name_recall_ok" : "name_recall_miss"); finish(); }}>{l}</button>)}</div></>}
      {step === 3 && <p className="text-center">Thank you. That helps us pick the right name.</p>}
    </div>
  );
}
