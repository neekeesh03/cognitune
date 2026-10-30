import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestSteps } from "@/engine/plan";
import { Mascot } from "@/components/Mascot";

/** The one thing Lagomo is for: press Start on something you have been putting off. */
export function StartHero({ suggestion, onStart }: { suggestion: string; onStart: (title: string, firstStep: string) => void }) {
  const [what, setWhat] = useState(""); const [hop, setHop] = useState(false);
  const title = (what.trim() || suggestion).trim();
  const step = title ? suggestSteps(title)[0]?.text ?? "Just open it" : "";
  return (
    <div className="glass rounded-3xl p-6 text-center">
      <div className={`mx-auto mb-2 w-fit ${hop ? "animate-hop" : ""}`}><Mascot size={52} /></div>
      <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Just enough to start</div>
      <h2 className="text-3xl leading-snug">What are you putting off?</h2>
      <input value={what} onChange={e => setWhat(e.target.value)} placeholder={suggestion || "e.g. start my essay"} aria-label="What are you putting off" className="mx-auto mt-4 w-full max-w-md rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary/40" />
      {title && <p className="mt-3 text-sm text-muted-foreground">First tiny step: <span className="font-medium text-foreground">{step}</span>. Two minutes. That is all.</p>}
      <Button variant="hero" size="lg" className="mt-4 h-14 w-full max-w-md rounded-2xl text-lg" disabled={!title} onClick={() => { setHop(true); setTimeout(() => setHop(false), 800); setTimeout(() => { onStart(title, step); setWhat(""); }, 450); }}><Play className="mr-2 h-5 w-5" />Start</Button>
      <p className="mt-3 text-xs text-muted-foreground">No shame if you stop. Starting counts.</p>
    </div>
  );
}
