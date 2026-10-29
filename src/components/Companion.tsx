export type Mood = "calm" | "happy" | "thinking" | "concerned";
const MOUTH: Record<Mood, string> = { calm: "M38 62 Q50 68 62 62", happy: "M36 60 Q50 74 64 60", thinking: "M42 64 L58 64", concerned: "M38 67 Q50 60 62 67" };
export function Companion({ mood = "calm", color = "259 40% 75%", size = 160, talking }: { mood?: Mood; color?: string; size?: number; talking?: boolean }) {
  return (
    <div className="relative mx-auto animate-breathe" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: `hsl(${color} / .35)` }} />
      <div className="absolute inset-[8%] animate-morph" style={{ background: `radial-gradient(circle at 35% 28%, hsl(${color}), hsl(${color} / .45) 60%, hsl(${color} / .15))`, boxShadow: `0 0 50px hsl(${color} / .5)` }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0">
        <g fill="hsl(150 30% 9%)">
          <ellipse cx="38" cy="46" rx="4" ry={mood === "happy" ? 2.5 : 5} className="origin-center [animation:blink_5s_infinite]" />
          <ellipse cx="62" cy="46" rx="4" ry={mood === "happy" ? 2.5 : 5} className="origin-center [animation:blink_5s_infinite]" />
        </g>
        <path d={MOUTH[mood]} stroke="hsl(150 30% 9%)" strokeWidth="3" strokeLinecap="round" fill="none" className={talking ? "animate-pulse" : ""} />
        {mood === "thinking" && <circle cx="74" cy="30" r="3" fill="hsl(var(--foreground) / .5)" />}
      </svg>
    </div>
  );
}
