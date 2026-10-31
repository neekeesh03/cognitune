// Soft sound and a tiny buzz for good moments. Haptics are on by default (phones that support them), sound is off until you turn it on.
export type Feel = "tap" | "start" | "done" | "cheer" | "close";
const K = { sound: "lagomo.feel.sound", buzz: "lagomo.feel.buzz" };
const get = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v == null ? d : v === "1"; } catch { return d; } };
export const feelPrefs = () => ({ sound: get(K.sound, false), buzz: get(K.buzz, true) });
export const setFeelPref = (what: "sound" | "buzz", on: boolean) => { try { localStorage.setItem(K[what], on ? "1" : "0"); } catch { /* ignore */ } };
const BUZZ: Record<Feel, number | number[]> = { tap: 8, start: 14, done: [18, 60, 28], cheer: [10, 40, 10], close: 20 };
// A few soft notes (Hz) per moment, kept short and quiet.
const NOTES: Record<Feel, number[]> = { tap: [660], start: [523, 659], done: [523, 659, 784], cheer: [784, 988], close: [440, 330] };
let ctx: AudioContext | null = null;
const calm = () => { try { return !!localStorage.getItem("lagomo.calm") || window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
export function feel(kind: Feel) {
  const p = feelPrefs();
  if (p.buzz && !calm()) { try { navigator.vibrate?.(BUZZ[kind]); } catch { /* ignore */ } }
  if (!p.sound) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    ctx = ctx ?? new AC(); if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime; NOTES[kind].forEach((f, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain(); o.type = "sine"; o.frequency.value = f; const s = t0 + i * 0.11;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.06, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.32);
      o.connect(g).connect(ctx!.destination); o.start(s); o.stop(s + 0.35);
    });
  } catch { /* sound is a bonus, never an error */ }
}
