import { useEffect, useState } from "react";
import { RabbitFace, type Face, type Wear } from "@/components/RabbitFace";

interface Snap { name: string; day: string; active: boolean; streak: number; friends: number; wear: Wear; starts: number }
const dk = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const read = (): Snap | null => { try { return JSON.parse(localStorage.getItem("lagomo.widget") || "null"); } catch { return null; } };
/** A tiny always-ready screen: the rabbit and one line. Add it to your home screen as its own icon, or keep it in a small window. */
export default function Widget() {
  const [snap, setSnap] = useState<Snap | null>(read); const [tick, setTick] = useState(0);
  useEffect(() => { const up = () => { setSnap(read()); setTick(t => t + 1); }; const t = setInterval(up, 20000); window.addEventListener("storage", up); document.addEventListener("visibilitychange", up); return () => { clearInterval(t); window.removeEventListener("storage", up); document.removeEventListener("visibilitychange", up); }; }, []);
  useEffect(() => { document.title = "Lagomo"; const l = document.querySelector('link[rel="manifest"]'); if (l) l.setAttribute("href", "/widget.webmanifest"); return () => { l?.setAttribute("href", "/manifest.webmanifest"); }; }, []);
  const today = !!snap && snap.day === dk() && snap.active; const h = new Date().getHours(); void tick;
  const face: Face = !snap ? "calm" : today ? "proud" : h >= 22 || h < 5 ? "sleepy" : "gentle";
  const line = !snap ? "Open Lagomo once to wake me up." : today ? "You started today." : h >= 22 || h < 5 ? "Rest is allowed. Tomorrow is a fresh page." : "Ready when you are. Two minutes.";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <RabbitFace face={face} wear={snap?.wear ?? "none"} size={180} />
      <h1 className="text-3xl">{today ? "Started" : "Not yet"}</h1>
      <p className="text-muted-foreground" role="status">{line}</p>
      {snap && <p className="text-sm text-muted-foreground">{snap.streak > 0 ? `${snap.streak} day${snap.streak === 1 ? "" : "s"} showing up` : "A fresh page"}{snap.friends > 0 ? ` · ${snap.friends} friend${snap.friends === 1 ? "" : "s"} started today` : ""}</p>}
      <a href="/?start=1" className="mt-2 inline-flex h-12 items-center rounded-full bg-primary px-8 text-primary-foreground shadow-lg">{today ? "Open Lagomo" : "Start something"}</a>
    </main>);
}
