import { useState } from "react";
import { feel, feelPrefs, setFeelPref } from "@/lib/feel";
import { tr } from "@/i18n";

/** Two small switches: a soft sound and a tiny buzz. Both are gentle and can be turned off. */
export function FeelToggles() {
  const [p, setP] = useState(feelPrefs);
  const flip = (k: "sound" | "buzz") => { const v = !p[k]; setFeelPref(k, v); setP(feelPrefs()); if (v) feel("tap"); };
  const row = (k: "sound" | "buzz", label: string, sub: string) => (
    <label className="flex items-center justify-between gap-3 py-1"><span><span className="block text-sm font-medium">{tr(label)}</span><span className="block text-xs text-muted-foreground">{tr(sub)}</span></span>
      <button type="button" role="switch" aria-checked={p[k]} onClick={() => flip(k)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${p[k] ? "bg-primary" : "bg-muted"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${p[k] ? "left-[22px]" : "left-0.5"}`} /></button></label>);
  return <div className="glass rounded-3xl p-5"><div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{tr("Little touches")}</div>
    {row("sound", "Soft sounds", "A quiet chime when you start or finish.")}{row("buzz", "Tiny buzz", "A light vibration on phones that support it.")}</div>;
}
