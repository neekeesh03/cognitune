import { DEFAULT_THRESHOLDS } from "@/engine/model";

interface Props { drive: number; color: string; size?: number; thresholds?: { ready: number; borderline: number }; label?: string; sub?: string; idle?: boolean }
const MAX = 1.5;
export function Orb({ drive, color, size = 280, thresholds = DEFAULT_THRESHOLDS, label, sub, idle }: Props) {
  const r = size / 2 - 14, c = 2 * Math.PI * r, arc = 0.75; // 270 degree gauge
  const pct = Math.min(1, Math.max(0, drive / MAX));
  const tick = (v: number) => { const a = (135 + (v / MAX) * 270) * (Math.PI / 180); return { x1: size / 2 + (r - 9) * Math.cos(a), y1: size / 2 + (r - 9) * Math.sin(a), x2: size / 2 + (r + 9) * Math.cos(a), y2: size / 2 + (r + 9) * Math.sin(a) }; };
  const glow = 0.25 + pct * 0.55;
  const inner = size * 0.58;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-3xl transition-all duration-700" style={{ background: `hsl(${color} / ${glow * 0.5})` }} />
      <svg width={size} height={size} className="absolute inset-0 -rotate-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * arc} ${c}`} transform={`rotate(135 ${size / 2} ${size / 2})`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`hsl(${color})`} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${c * arc * pct} ${c}`} transform={`rotate(135 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 900ms cubic-bezier(.2,.8,.2,1), stroke 500ms", filter: `drop-shadow(0 0 8px hsl(${color} / .7))` }} />
        {!idle && [thresholds.borderline, thresholds.ready].map(v => <line key={v} {...tick(v)} stroke="hsl(var(--foreground) / 0.45)" strokeWidth="2" strokeLinecap="round" />)}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center animate-breathe">
        <div className="animate-morph transition-all duration-700" style={{ width: inner * (0.8 + pct * 0.3), height: inner * (0.8 + pct * 0.3), background: `radial-gradient(circle at 35% 30%, hsl(${color} / .95), hsl(${color} / .35) 55%, hsl(${color} / .08) 80%)`, boxShadow: `0 0 60px hsl(${color} / ${glow})` }} />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        {label && <div className="font-display text-6xl leading-none text-foreground">{label}</div>}
        {sub && <div className="mt-1 text-xs uppercase tracking-[0.2em] text-foreground/70">{sub}</div>}
      </div>
    </div>
  );
}
