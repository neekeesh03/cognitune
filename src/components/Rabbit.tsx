import { useEffect, useRef, useState } from "react";
import { RabbitFace, type Face, type Wear } from "@/components/RabbitFace";
import { tr } from "@/i18n";
import { feel } from "@/lib/feel";

export type Mood = "ready" | "curious" | "sleepy" | "cheering" | "proud" | "cosy";
/** Same rabbit, different face: eyes and mouth change with how your day is going. It never judges. */
export const MOOD_FACE: Record<Mood, Face> = { ready: "calm", curious: "curious", sleepy: "sleepy", cheering: "cheer", proud: "proud", cosy: "cosy" };
export const wornNow = (): Wear => { try { return (localStorage.getItem("lagomo.rabbit.wear") as Wear) || "none"; } catch { return "none"; } };
const PLAY: Face[] = ["wink", "love", "sparkle", "happy"];
const LINES: Record<Mood, string[]> = {
  ready: ["Hi. One tiny thing?", "What is the smallest first step?", "Two minutes. Just to begin."],
  curious: ["A friend started. Want to join?"],
  sleepy: ["It is late. Even one tiny step counts.", "Sleepy? Two minutes is still two minutes."],
  cheering: ["You got a cheer!"],
  proud: ["You started today. I am proud of you.", "That counts. Truly.", "Nice. Tomorrow is a fresh page."],
  cosy: ["I kept your seat warm.", "Welcome back. No rush.", "Nothing withered. Ready when you are."],
};

/** The rabbit with one speech bubble. It shows for a few seconds, then rests. Tap it for another line. Quiet mode keeps the face but drops the words. */
export function Rabbit({ size = 52, mood, line, quiet }: { size?: number; mood: Mood; line?: string; quiet?: boolean }) {
  const [i, setI] = useState(0); const [show, setShow] = useState(true); const [hop, setHop] = useState(false); const [play, setPlay] = useState<Face | null>(null); const t = useRef(0);
  const lines = LINES[mood]; const text = line ?? tr(lines[i % lines.length]);
  const poke = () => { feel("tap"); setHop(true); setPlay(PLAY[Math.floor(Math.random() * PLAY.length)]); window.setTimeout(() => { setHop(false); setPlay(null); }, 1600); setI(n => n + 1); setShow(true); };
  useEffect(() => { setShow(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setShow(false), 6000); return () => window.clearTimeout(t.current); }, [mood, i, line]);
  return (
    <div className="flex flex-col items-center">
      <button onClick={poke} aria-label="Lagomo the rabbit. Tap for another thought." className={`rounded-full ${hop ? "animate-hop" : ""}`}><RabbitFace crop face={play ?? MOOD_FACE[mood]} wear={wornNow()} size={size * 1.15} /></button>
      {!quiet && <div role="status" className={`mt-2 max-w-[16rem] rounded-full bg-background/70 px-3 py-1 text-center text-xs text-muted-foreground transition-opacity duration-700 ${show ? "opacity-100" : "opacity-0"}`}>{text}</div>}
    </div>);
}
