import { useState } from "react";
import { drawCard, weekDays } from "@/components/StartsCard";
import { shareNative } from "@/engine/share";
import type { GameState } from "@/engine/game";
import type { AvatarSpec } from "@/engine/avatar";

/** Seven quiet dots. A kind sentence. Nothing to lose. */
export function WeekDots({ g, name, avatar }: { g: GameState; name: string; avatar: AvatarSpec }) {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const share = async () => { setBusy(true); setMsg(""); try { const b = await drawCard(name, avatar, g); const file = new File([b], "my-week-of-small-starts.png", { type: "image/png" }); const ok = await shareNative(`my week of small starts. join me on lagomo: ${location.origin}`, file); if (!ok) { const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = file.name; a.click(); setMsg("Saved your card."); setTimeout(() => URL.revokeObjectURL(u), 5000); } } catch { setMsg("Could not make the card."); } setBusy(false); };
  const wk = weekDays(g); const total = wk.reduce((a, d) => a + d.n, 0); const days = wk.filter(d => d.n > 0).length;
  const line = total === 0 ? "A fresh page. One start is enough." : days >= 5 ? "Showing up most days. Lovely." : `${days} ${days === 1 ? "day" : "days"} this week. Every one counts.`;
  return (
    <div className="glass flex flex-col gap-3 rounded-3xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0"><div className="text-sm font-semibold">{new Date().getDay() === 0 ? "Your week" : "This week"}</div><div className="text-xs text-muted-foreground">{line}{total > 0 && <> <button disabled={busy} onClick={share} className={new Date().getDay() === 0 ? "rounded-full bg-primary px-3 py-0.5 text-primary-foreground" : "text-primary underline-offset-2 hover:underline"}>{busy ? "Making card..." : new Date().getDay() === 0 ? "Share my week" : "Share"}</button></>}{msg && <span role="status"> {msg}</span>}</div></div>
      <div className="flex shrink-0 gap-1.5" role="img" aria-label={`${days} days started this week`}>{wk.map((d, i) => <span key={d.k} title={d.k} className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] ${d.n > 0 ? "bg-primary text-primary-foreground" : i === 6 ? "border border-primary/50 text-muted-foreground" : "bg-secondary text-muted-foreground"}`}>{d.dow}</span>)}</div>
    </div>);
}
