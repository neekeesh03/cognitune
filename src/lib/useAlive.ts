import { useEffect, useRef, useState } from "react";
const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
export const isStill = () => { try { return localStorage.getItem("lagomo.rabbit.still") === "1"; } catch { return false; } };
/** Small signs of life, with no animation loop at rest: an irregular blink, an ear twitch now and then, and eyes that follow your finger. Off in still mode and with reduced motion. */
export function useAlive(on: boolean, asleep: boolean) {
  const ref = useRef<SVGSVGElement | null>(null); const [blink, setBlink] = useState(false); const [ear, setEar] = useState<"l" | "r" | null>(null); const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const live = on && !reduced() && !isStill();
  useEffect(() => {
    if (!live) { setBlink(false); setEar(null); setGaze({ x: 0, y: 0 }); return; }
    let t1 = 0, t2 = 0; let dead = false;
    const doBlink = () => { if (dead) return; if (!document.hidden && !asleep) { setBlink(true); window.setTimeout(() => setBlink(false), 150); if (Math.random() < 0.15) window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 130); }, 280); } t1 = window.setTimeout(doBlink, 2000 + Math.random() * 5000); };
    const doEar = () => { if (dead) return; if (!document.hidden) { setEar(Math.random() < 0.5 ? "l" : "r"); window.setTimeout(() => setEar(null), 700); } t2 = window.setTimeout(doEar, 6000 + Math.random() * 9000); };
    t1 = window.setTimeout(doBlink, 1200); t2 = window.setTimeout(doEar, 4000);
    let raf = 0; let last: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => { last = { x: e.clientX, y: e.clientY }; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const el = ref.current; if (!el || !last) return; const r = el.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45; const dx = last.x - cx, dy = last.y - cy; const d = Math.hypot(dx, dy) || 1; const k = Math.min(1, d / 220); setGaze({ x: Math.round((dx / d) * 4 * k * 10) / 10, y: Math.round((dy / d) * 3 * k * 10) / 10 }); }); };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { dead = true; window.clearTimeout(t1); window.clearTimeout(t2); window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, [live, asleep]);
  return { ref, blink, ear, gaze, live };
}
