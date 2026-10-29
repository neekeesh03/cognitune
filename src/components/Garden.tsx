import { levelFor } from "@/engine/game";
/** A small plant that grows with your level. Made only from brand colours. */
export function Garden({ lifetime, size = 220 }: { lifetime: number; size?: number }) {
  const { level } = levelFor(lifetime); const s = Math.min(level, 8);
  const leaves = Math.min(2 + s, 10), h = 30 + s * 12;
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Your plant, level ${level + 1}`} className="mx-auto">
      <ellipse cx="100" cy="182" rx="62" ry="9" fill="hsl(var(--foreground) / .08)" />
      <path d="M72 168 h56 l-6 -30 h-44 z" fill="hsl(var(--f-primode))" />
      <rect x="68" y="160" width="64" height="10" rx="4" fill="hsl(var(--f-cap))" />
      <line x1="100" y1="142" x2="100" y2={140 - h} stroke="hsl(var(--f-anchory))" strokeWidth="5" strokeLinecap="round" />
      {Array.from({ length: leaves }, (_, i) => { const y = 138 - (h * (i + 0.6)) / (leaves + 0.2), left = i % 2 === 0, sz = 14 + Math.min(i, 5) * 2.5, cx = 100 + (left ? -1 : 1) * sz * 0.85; return (
        <ellipse key={i} cx={cx} cy={y} rx={sz} ry={sz * 0.45} transform={`rotate(${left ? -22 : 22} ${cx} ${y})`} fill={i % 3 === 0 ? "hsl(var(--f-flexion))" : "hsl(var(--primary))"} />); })}
      {s >= 5 && [[84, 138 - h], [118, 138 - h + 8], [100, 132 - h]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={6} fill="hsl(var(--f-grain))" />)}
      {s >= 7 && <circle cx="100" cy={138 - h - 6} r="9" fill="hsl(var(--f-primode))" />}
    </svg>
  );
}
