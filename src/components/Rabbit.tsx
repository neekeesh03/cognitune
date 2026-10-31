import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { TUNE_SPEC } from "@/components/Mascot";
import { tr } from "@/i18n";

export type Mood = "ready" | "curious" | "sleepy" | "cheering" | "proud" | "cosy";
/** Same rabbit, different face: eyes and mouth change with how your day is going. It never judges. */
const FACE: Record<Mood, { e: number; m: number }> = { ready: { e: 0, m: 0 }, curious: { e: 1, m: 0 }, sleepy: { e: 3, m: 3 }, cheering: { e: 2, m: 2 }, proud: { e: 4, m: 2 }, cosy: { e: 2, m: 0 } };
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
  const [i, setI] = useState(0); const [show, setShow] = useState(true); const [hop, setHop] = useState(false); const t = useRef(0);
  const lines = LINES[mood]; const text = line ?? tr(lines[i % lines.length]);
  const poke = () => { setHop(true); window.setTimeout(() => setHop(false), 700); setI(n => n + 1); setShow(true); };
  useEffect(() => { setShow(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setShow(false), 6000); return () => window.clearTimeout(t.current); }, [mood, i, line]);
  const spec = { ...TUNE_SPEC, ...FACE[mood] };
  return (
    <div className="flex flex-col items-center">
      <button onClick={poke} aria-label="Lagomo the rabbit. Tap for another thought." className={`rounded-full ${hop ? "animate-hop" : ""}`}><Avatar spec={spec} size={size} /></button>
      {!quiet && <div role="status" className={`mt-2 max-w-[16rem] rounded-full bg-background/70 px-3 py-1 text-center text-xs text-muted-foreground transition-opacity duration-700 ${show ? "opacity-100" : "opacity-0"}`}>{text}</div>}
    </div>);
}
