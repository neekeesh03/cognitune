import { burrowItems, burrowName, type BurrowItem, type Rhythm } from "@/engine/pinky";
import { tr } from "@/i18n";

const W = 22;
/** The outer group holds the position; the inner one may animate, so the animation never moves the item. */
function Item({ t, x, fresh }: { t: BurrowItem; x: number; fresh: boolean }) {
  return <g transform={`translate(${x} 0)`}><g className={fresh ? "animate-rise" : undefined}><Shape t={t} /></g></g>;
}
function Shape({ t }: { t: BurrowItem }) {
  const g = "translate(0 0)"; const leaf = "hsl(var(--primary))"; const cls = undefined;
  if (t === "sprout") return <g transform={g} className={cls}><path d="M0 62 V50" stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" /><ellipse cx="-4" cy="49" rx="5" ry="3" fill={leaf} transform="rotate(-25 -4 49)" /><ellipse cx="4" cy="46" rx="5" ry="3" fill={leaf} transform="rotate(25 4 46)" /></g>;
  if (t === "carrot") return <g transform={g} className={cls}><path d="M-5 50 L5 50 L0 63 Z" fill="hsl(var(--warning))" /><path d="M0 50 V42 M-3 50 L-5 43 M3 50 L5 43" stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" /></g>;
  if (t === "flower") return <g transform={g} className={cls}><path d="M0 62 V46" stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" />{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="40" rx="3" ry="5" fill="hsl(var(--f-cap))" transform={`rotate(${a} 0 45)`} />)}<circle cx="0" cy="45" r="3" fill="hsl(var(--warning))" /></g>;
  return <g transform={g} className={cls}><path d="M-6 54 A6 6 0 0 1 6 54 Z" fill="hsl(var(--f-anchory))" /><rect x="-2" y="54" width="4" height="8" rx="1.5" fill="hsl(var(--muted-foreground))" opacity=".5" /><circle cx="-2" cy="51" r="1" fill="#fff" opacity=".8" /></g>;
}

/** The little shared garden for one pair, plus this week's rhythm. Items are only ever added, never removed. */
export function Burrow({ first, kept, r }: { first: string; kept: number; r: Rhythm }) {
  const items = burrowItems(kept); const frac = Math.min(1, r.thisWeek / r.goal); const C = 2 * Math.PI * 16;
  const weeks = r.weeksHit === 1 ? tr("{n} week in rhythm") : tr("{n} weeks in rhythm");
  return (
    <div className="glass rounded-3xl p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1"><div className="text-xs uppercase tracking-[0.15em] text-muted-foreground" translate="no">{tr("Your burrow with {name}").replace("{name}", first)}</div>
          <div className="text-sm font-semibold">{tr(burrowName(kept))}</div>{kept > 0 && <div className="text-xs text-muted-foreground">{tr("Kept together:")} {kept}</div>}</div>
        <div className="flex shrink-0 items-center gap-2" aria-label={tr("This week: {n} of {goal}").replace("{n}", String(r.thisWeek)).replace("{goal}", String(r.goal))}>
          <svg width="40" height="40" viewBox="0 0 40 40" role="img"><circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" /><circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 20 20)" style={{ transition: "stroke-dasharray .8s ease-out" }} /><text x="20" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{r.thisWeek}/{r.goal}</text></svg>
          <div className="text-xs text-muted-foreground">{r.reached ? tr("Rhythm reached this week") : tr("This week: {n} of {goal}").replace("{n}", String(r.thisWeek)).replace("{goal}", String(r.goal))}{r.weeksHit > 0 && <div>{weeks.replace("{n}", String(r.weeksHit))}</div>}</div></div>
      </div>
      <svg viewBox="0 0 300 70" className="mt-1 h-16 w-full" role="img" aria-label={tr(burrowName(kept))}>
        <ellipse cx="150" cy="66" rx="146" ry="7" fill="hsl(var(--primary))" opacity=".14" />
        {items.length === 0 && <text x="150" y="52" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">{tr("Your first kept Pinky plants a sprout")}</text>}
        {items.map((t, i) => <Item key={i} t={t} x={(300 - items.length * W) / 2 + W / 2 + i * W} fresh={i === items.length - 1 && i === kept - 1} />)}
      </svg>
    </div>);
}
