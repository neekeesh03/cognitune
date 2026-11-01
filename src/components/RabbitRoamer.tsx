import { useEffect, useRef, useState } from "react";
import { RabbitFace, type Face } from "@/components/RabbitFace";
import { wornNow } from "@/components/Rabbit";
import { usePet } from "@/lib/pet";
import { isStill } from "@/lib/useAlive";
import { track } from "@/lib/track";

export const roamOn = () => { try { return localStorage.getItem("lagomo.rabbit.roam") !== "0"; } catch { return true; } };
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/** The rabbit's spot at the end of Today. Now and then it hops to another place along the lane. It never covers anything, and it is off in still mode and with reduced motion. Tap it for a happy hop. */
export function RabbitRoamer() {
  const pet = usePet(); const lane = useRef<HTMLDivElement>(null); const box = useRef<HTMLButtonElement>(null); const [x, setX] = useState(18); const [flip, setFlip] = useState(false); const [face, setFace] = useState<Face>("calm"); const xRef = useRef(18); xRef.current = x;
  useEffect(() => {
    if (!roamOn() || isStill() || reduced()) return; let timer = 0; let dead = false;
    const fast = localStorage.getItem("lagomo.roam.fast") === "1";
    const schedule = () => { timer = window.setTimeout(roam, fast ? 2500 : 40000 + Math.random() * 50000); };
    const roam = () => {
      if (dead) return; const el = box.current; if (!el || document.hidden) return schedule();
      const w = lane.current?.clientWidth ?? window.innerWidth; const to = Math.round(14 + Math.random() * Math.max(40, w - 80)); const from = xRef.current; const dist = Math.abs(to - from); if (dist < 60) return schedule();
      const hops = Math.max(2, Math.round(dist / 90)); const frames: Keyframe[] = [];
      for (let i = 0; i < hops; i++) { const a = from + ((to - from) * i) / hops, b = from + ((to - from) * (i + 1)) / hops; frames.push({ transform: `translate(${a}px,0) scale(${to < from ? -1 : 1},1)`, offset: i / hops }, { transform: `translate(${(a + b) / 2}px,-16px) scale(${to < from ? -.94 : .94},1.08)`, offset: (i + .5) / hops }); }
      frames.push({ transform: `translate(${to}px,0) scale(${to < from ? -1 : 1},1)`, offset: 1 });
      setFlip(to < from); const an = el.animate(frames, { duration: hops * 420, easing: "ease-in-out", fill: "forwards" });
      an.onfinish = () => { setX(to); an.cancel(); schedule(); }; an.oncancel = () => { /* cleaned up by finish */ };
    };
    schedule(); return () => { dead = true; window.clearTimeout(timer); box.current?.getAnimations().forEach(a => a.cancel()); };
  }, []);
  const poke = () => { track("rabbit_roam_tap"); setFace("happy"); box.current?.animate([{ transform: `translate(${x}px,0) scale(${flip ? -1 : 1},1)` }, { transform: `translate(${x}px,-20px) scale(${flip ? -.94 : .94},1.08)` }, { transform: `translate(${x}px,0) scale(${flip ? -1 : 1},1)` }], { duration: 520, easing: "ease-out" }); window.setTimeout(() => setFace("calm"), 1500); };
  if (!roamOn()) return null;
  return (
    <div ref={lane} className="relative mx-auto mt-4 h-[58px] w-full overflow-hidden lg:col-span-5">
      <button ref={box} onClick={poke} aria-label={`${pet.name}, wandering. Tap to say hi.`} className="absolute bottom-0 left-0 rounded-full" style={{ transform: `translate(${x}px,0) scale(${flip ? -1 : 1},1)` }}><RabbitFace alive crop face={face} wear={wornNow()} size={34} /></button>
    </div>);
}
