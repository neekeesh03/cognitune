import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import type { AvatarSpec } from "@/engine/avatar";
import { dkey, levelFor, type GameState } from "@/engine/game";
import { dataUrlToFile, shareNative } from "@/engine/share";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
/** The last 7 days, oldest first, with how many times you showed up on each. */
export function weekDays(g: GameState) {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); const k = dkey(d); return { k, dow: DOW[d.getDay()], n: g.counts["s_" + k] || 0 }; });
}
function line(total: number, days: number) {
  if (total === 0) return "A quiet week. Fresh page on Monday.";
  if (days >= 6) return "Showed up almost daily. Nice.";
  if (days >= 4) return "Small starts, stacked up.";
  if (total >= 3) return "Not every day. Enough days.";
  return "Started. That is the hard part.";
}
export async function drawCard(name: string, avatar: AvatarSpec, g: GameState): Promise<Blob> {
  try { await document.fonts.load("700 80px 'Inter Tight'"); } catch { /* ignore */ }
  const wk = weekDays(g); const total = wk.reduce((a, d) => a + d.n, 0); const days = wk.filter(d => d.n > 0).length;
  const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#F2F2F2"); bg.addColorStop(1, "#E4EEE7"); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const blob = (cx: number, cy: number, r: number, col: string) => { const gr = x.createRadialGradient(cx, cy, 10, cx, cy, r); gr.addColorStop(0, col); gr.addColorStop(1, col.replace(/[\d.]+\)$/, "0)")); x.fillStyle = gr; x.fillRect(0, 0, W, H); };
  blob(900, 260, 620, "rgba(183,167,217,0.55)"); blob(120, 1500, 700, "rgba(219,131,42,0.28)");
  x.fillStyle = "#101E17"; x.font = "600 54px 'Inter Tight', sans-serif"; x.fillText("lagomo", 90, 150);
  x.font = "500 46px 'Inter Tight', sans-serif"; x.fillStyle = "#696866"; x.fillText(`${name.split(" ")[0].toLowerCase()}'s week of small starts`, 90, 250);
  x.fillStyle = "#447D58"; x.font = "800 460px 'Inter Tight', sans-serif"; x.fillText(String(total), 80, 760);
  x.fillStyle = "#101E17"; x.font = "600 64px 'Inter Tight', sans-serif"; x.fillText(total === 1 ? "start this week" : "starts this week", 90, 860);
  x.font = "500 50px 'Inter Tight', sans-serif"; x.fillStyle = "#3D160B"; x.fillText(line(total, days), 90, 950);
  // week dots
  wk.forEach((d, i) => { const cx = 140 + i * 133, cy = 1130; x.beginPath(); x.arc(cx, cy, 46, 0, 7); x.fillStyle = d.n ? "#447D58" : "rgba(16,30,23,0.08)"; x.fill(); x.fillStyle = d.n ? "#F2F7F3" : "#696866"; x.font = "700 40px 'Inter Tight', sans-serif"; x.textAlign = "center"; x.fillText(d.n ? "✓" : d.dow, cx, cy + 14); x.textAlign = "left"; });
  x.fillStyle = "#101E17"; x.font = "700 56px 'Inter Tight', sans-serif"; x.fillText(`${g.streak.current} showing-up ${g.streak.current === 1 ? "day" : "days"}`, 90, 1300);
  x.fillStyle = "#696866"; x.font = "500 44px 'Inter Tight', sans-serif"; x.fillText(levelFor(g.lifetime).name + " patch", 90, 1365);
  // creature
  try {
    const svg = renderToStaticMarkup(<Avatar spec={avatar} size={420} />).replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
    const img = new Image(); await new Promise<void>((ok, bad) => { img.onload = () => ok(); img.onerror = () => bad(); img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
    x.save(); x.beginPath(); x.arc(780, 1560, 210, 0, 7); x.clip(); x.drawImage(img, 570, 1350, 420, 420); x.restore();
  } catch { /* card still works without the creature */ }
  x.fillStyle = "#101E17"; x.font = "700 60px 'Inter Tight', sans-serif"; x.fillText("small starts.", 90, 1640); x.fillText("someone's here.", 90, 1715);
  x.fillStyle = "#696866"; x.font = "500 38px 'Inter Tight', sans-serif"; x.fillText(location.host, 90, 1830);
  return new Promise(res => c.toBlob(b => res(b!), "image/png"));
}

export function StartsCard({ name, avatar, g, compact }: { name: string; avatar: AvatarSpec; g: GameState; compact?: boolean }) {
  const wk = weekDays(g); const total = wk.reduce((a, d) => a + d.n, 0); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const share = async () => {
    setBusy(true); setMsg("");
    try {
      const b = await drawCard(name, avatar, g); const url = URL.createObjectURL(b);
      const file = new File([b], "my-week-of-small-starts.png", { type: "image/png" }); void dataUrlToFile;
      const ok = await shareNative(`my week of small starts. join me on lagomo: ${location.origin}`, file);
      if (!ok) { const a = document.createElement("a"); a.href = url; a.download = file.name; a.click(); setMsg("Saved your card. Post it wherever your friends are."); }
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { setMsg("Could not make the card. Try again."); }
    setBusy(false);
  };
  if (compact) return (
    <div className="text-center">
      <p className="mb-2 text-sm text-muted-foreground">Share your week. Task names are never shown.</p>
      <Button variant="outline" className="rounded-full" disabled={busy} onClick={share}><Share2 className="mr-1 h-4 w-4" />{busy ? "Making your card..." : "Share my week"}</Button>
      {msg && <p className="mt-2 text-xs text-primary" role="status">{msg}</p>}
    </div>);
  return (
    <div className="glass rounded-3xl p-5 text-center">
      <div className="text-sm font-semibold">Your week of small starts</div>
      <div className="mt-2 flex items-center justify-center gap-2">{wk.map(d => <div key={d.k} className={`flex h-9 w-9 items-center justify-center rounded-full text-xs ${d.n ? "bg-primary text-primary-foreground" : "bg-foreground/[.07] text-muted-foreground"}`} title={`${d.k}: ${d.n}`}>{d.n ? "✓" : d.dow}</div>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">{total} {total === 1 ? "start" : "starts"} this week. Share a card with your friends, it only shows what you choose to post.</p>
      <Button variant="hero" className="mt-3 rounded-full" disabled={busy} onClick={share}><Share2 className="mr-1 h-4 w-4" />{busy ? "Making your card..." : "Share my week"}</Button>
      {msg && <p className="mt-2 text-xs text-primary" role="status">{msg}</p>}
    </div>
  );
}
