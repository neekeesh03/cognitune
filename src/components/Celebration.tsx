import { useEffect, useMemo } from "react";
import { Flame, Sparkles, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import type { AvatarSpec } from "@/engine/avatar";

/** Lagomo the rabbit, full body, paws up. Colours come from the brand tokens. */
function CheerBunny({ size = 190 }: { size?: number }) {
  const lav = "hsl(var(--f-grain))", lavDark = "hsl(259 32% 52%)", ink = "hsl(var(--foreground))";
  return (
    <svg viewBox="0 0 200 230" width={size} height={size * 1.15} aria-hidden="true" className="overflow-visible">
      <g className="cele-ear-l" style={{ transformOrigin: "82px 70px" }}><ellipse cx="80" cy="34" rx="15" ry="38" fill={lav} /><ellipse cx="80" cy="38" rx="7" ry="26" fill="hsl(var(--warning) / .35)" /></g>
      <g className="cele-ear-r" style={{ transformOrigin: "118px 70px" }}><ellipse cx="120" cy="34" rx="15" ry="38" fill={lav} /><ellipse cx="120" cy="38" rx="7" ry="26" fill="hsl(var(--warning) / .35)" /></g>
      <g className="cele-arm-l" style={{ transformOrigin: "74px 146px" }}><path d="M74 146 L40 102" stroke={lav} strokeWidth="16" strokeLinecap="round" /><circle cx="38" cy="99" r="11" fill={lav} /></g>
      <g className="cele-arm-r" style={{ transformOrigin: "126px 146px" }}><path d="M126 146 L160 102" stroke={lav} strokeWidth="16" strokeLinecap="round" /><circle cx="162" cy="99" r="11" fill={lav} /></g>
      <ellipse cx="100" cy="170" rx="38" ry="42" fill={lav} />
      <ellipse cx="100" cy="176" rx="22" ry="27" fill="hsl(var(--background))" opacity=".85" />
      <ellipse cx="82" cy="212" rx="15" ry="9" fill={lavDark} /><ellipse cx="118" cy="212" rx="15" ry="9" fill={lavDark} />
      <circle cx="100" cy="98" r="44" fill={lav} />
      <path d="M78 94 q8 -10 16 0" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M106 94 q8 -10 16 0" stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="74" cy="110" r="7" fill="hsl(var(--warning) / .55)" /><circle cx="126" cy="110" r="7" fill="hsl(var(--warning) / .55)" />
      <path d="M88 110 q12 20 24 0 z" fill={ink} /><path d="M94 116 q6 7 12 0" fill="hsl(var(--warning) / .8)" />
    </svg>);
}

function Burst({ x, y, color, delay, size = 46 }: { x: string; y: string; color: string; delay: number; size?: number }) {
  return (
    <svg viewBox="-24 -24 48 48" width={size} height={size} className="cele-burst absolute" style={{ left: x, top: y, animationDelay: `${delay}s` }} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1="-9" x2="0" y2={i % 2 ? -16 : -21} stroke={color} strokeWidth="3.4" strokeLinecap="round" transform={`rotate(${i * 45})`} />)}
    </svg>);
}

/** Soft three-note chime. Quiet, short, and skipped if audio is not available. */
function chime() {
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext); if (!Ctx) return;
    const ctx = new Ctx(); const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, now + i * 0.09); g.gain.linearRampToValueAtTime(0.07, now + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.5); o.connect(g).connect(ctx.destination); o.start(now + i * 0.09); o.stop(now + i * 0.09 + 0.55); });
    setTimeout(() => ctx.close().catch(() => undefined), 1500);
  } catch { /* no sound */ }
}

const TITLES = ["You did it!", "Look at you go!", "Two minutes, done!"];
const CONFETTI = ["hsl(var(--f-grain))", "hsl(var(--warning))", "hsl(var(--primary))", "hsl(var(--f-flexion))", "hsl(var(--accent))"];

export interface CelebrationProps { minutes: number; sparks?: number; streak?: number; me?: AvatarSpec; buddy?: AvatarSpec; title?: string; sub?: string; onContinue: () => void }

/** The finish moment: big, warm and short. Then one button to carry on. */
export function Celebration({ minutes, sparks, streak, me, buddy, title, sub, onContinue }: CelebrationProps) {
  const heading = useMemo(() => title ?? TITLES[Math.floor(Math.random() * TITLES.length)], [title]);
  const bits = useMemo(() => Array.from({ length: 26 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 1.2, dur: 2.4 + Math.random() * 1.8, color: CONFETTI[i % CONFETTI.length], w: 6 + Math.random() * 6, round: Math.random() > 0.6 })), []);
  useEffect(() => { chime(); try { navigator.vibrate?.(35); } catch { /* ignore */ } }, []);
  const cards = [
    sparks ? { k: "s", label: "Sparks", tone: "var(--warning)", icon: <Sparkles className="h-6 w-6" />, value: `+${sparks} sparks` } : null,
    { k: "f", label: "Focused", tone: "var(--primary)", icon: <Timer className="h-6 w-6" />, value: `${minutes} min focused` },
    streak ? { k: "d", label: "Showing up", tone: "var(--f-grain)", icon: <Flame className="h-6 w-6" />, value: `${streak} ${streak === 1 ? "day" : "days"} in a row` } : null,
  ].filter(Boolean) as { k: string; label: string; tone: string; icon: JSX.Element; value: string }[];
  return (
    <div className="relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center" role="dialog" aria-label="Session complete!">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {bits.map((b, i) => <span key={i} className="cele-confetti absolute top-0" style={{ left: `${b.left}%`, width: b.w, height: b.round ? b.w : b.w * 1.8, background: b.color, borderRadius: b.round ? 999 : 3, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s` }} />)}
        <Burst x="18%" y="12%" color="hsl(var(--f-grain))" delay={0.1} />
        <Burst x="74%" y="9%" color="hsl(var(--warning))" delay={0.5} size={54} />
        <Burst x="84%" y="34%" color="hsl(var(--primary))" delay={0.9} size={38} />
        <Burst x="9%" y="40%" color="hsl(var(--warning))" delay={1.3} size={36} />
      </div>
      <div className="relative flex items-end justify-center gap-2">
        <div className="cele-hop"><CheerBunny size={170} /></div>
        {me && <div className="cele-hop-late mb-3"><Avatar spec={me} size={74} /></div>}
        {buddy && <div className="cele-hop mb-3" style={{ animationDelay: ".35s" }}><Avatar spec={buddy} size={66} /></div>}
      </div>
      <div className="h-2 w-64 rounded-full bg-foreground/10" aria-hidden="true" />
      <h1 className="cele-pop mt-8 text-5xl font-bold tracking-tight" style={{ color: "hsl(var(--warning))", animationDelay: ".15s" }}>{heading}</h1>
      <p className="cele-pop mt-3 text-lg text-muted-foreground" style={{ animationDelay: ".3s" }}>{sub ?? "You started. That is the hard part."}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {cards.map((c, i) => (
          <div key={c.k} className="cele-pop w-40 overflow-hidden rounded-3xl border-2" style={{ borderColor: `hsl(${c.tone})`, animationDelay: `${0.45 + i * 0.12}s` }}>
            <div className="py-1.5 text-xs font-bold uppercase tracking-[0.18em]" style={{ background: `hsl(${c.tone})`, color: "hsl(var(--background))" }}>{c.label}</div>
            <div className="flex items-center justify-center gap-2 bg-background/70 px-3 py-4 text-lg font-bold" style={{ color: `hsl(${c.tone})` }}>{c.icon}<span className="leading-tight">{c.value}</span></div>
          </div>))}
      </div>
      <Button variant="hero" size="lg" className="cele-pop mt-10 h-14 w-full max-w-sm rounded-2xl text-lg" style={{ animationDelay: ".8s" }} onClick={onContinue} autoFocus>Continue</Button>
    </div>);
}
