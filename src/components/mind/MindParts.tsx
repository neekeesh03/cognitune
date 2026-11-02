import type { ReactNode } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { looksUnsafe } from "@/engine/coachNlu";
import { loadMind, saveMind, type Mind } from "@/store/useMind";

/** What every Mind screen receives. `done` gives sparks and returns to the hub; `go` jumps to another tool. */
export interface MindProps {
  mind: Mind; update: (fn: (m: Mind) => Mind) => void; done: (note?: string) => void; back: () => void;
  go: (v: import("@/engine/mind").MindView) => void; onStart: (title: string, step: string) => void;
  friends?: { id: string; name: string; last: number | null }[]; openChat?: (id: string, draft: string) => void;
}
export function Screen({ title, sub, back, children, credit }: { title: string; sub?: string; back: () => void; children: ReactNode; credit?: string }) {
  return (
    <section className="mx-auto max-w-xl space-y-4">
      <div><button onClick={back} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Mind</button>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>{sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}</div>
      {children}
      {credit && <p className="px-1 text-[11px] leading-snug text-muted-foreground">{credit}</p>}
      <Worse tool={title} />
    </section>
  );
}
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => <div className={`glass rounded-3xl p-4 ${className}`}>{children}</div>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Pills<T extends string | number>({ options, value, onChange, label }: { options: { v: T; label: string }[]; value: T | null; onChange: (v: any) => void; label?: string }) {
  return <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">{options.map(o => <button key={String(o.v)} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={`rounded-full border px-3 py-1.5 text-sm transition ${value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 hover:bg-secondary/60"}`}>{o.label}</button>)}</div>;
}
export function Rate({ label, ask, value, onChange, lo, hi, max = 100, step = 5 }: { label: string; ask?: string; value: number; onChange: (n: number) => void; lo?: string; hi?: string; max?: number; step?: number }) {
  return (
    <div><div className="flex items-baseline justify-between gap-2"><label className="text-sm font-medium">{label}</label><span className="text-sm tabular-nums text-muted-foreground">{value}</span></div>
      {ask && <div className="text-xs text-muted-foreground">{ask}</div>}
      <input type="range" min={0} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} aria-label={label} className="mt-1 w-full accent-[hsl(var(--primary))]" />
      {(lo || hi) && <div className="flex justify-between text-[11px] text-muted-foreground"><span>{lo}</span><span>{hi}</span></div>}
    </div>
  );
}
/** Free text in Mind is checked on this device: if it points to self-harm, a support card appears right under the box. */
export const Field = ({ label, hint, value, onChange, rows = 2, ph }: { label: string; hint?: string; value: string; onChange: (s: string) => void; rows?: number; ph?: string }) => (
  <div><label className="block"><span className="text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    <textarea value={value} onChange={e => onChange(e.target.value.slice(0, 400))} rows={rows} placeholder={ph} className="mt-1 w-full resize-none rounded-2xl border border-input bg-background/70 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
    {value.length > 8 && looksUnsafe(value) && <div className="mt-2"><SupportCard strong /></div>}</div>
);
export const Primary = ({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) => <Button variant="hero" className="w-full rounded-full" disabled={disabled} onClick={onClick}>{children}</Button>;
export const Saved = ({ text }: { text: string }) => <div role="status" className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-sm text-primary"><Check className="h-4 w-4" />{text}</div>;
export const Help = ({ children }: { children: ReactNode }) => <p className="text-xs leading-snug text-muted-foreground">{children}</p>;

/** A small trend line. Values are drawn left (old) to right (new). */
export function Spark({ values, min, max, good = "high" }: { values: number[]; min: number; max: number; good?: "high" | "low" }) {
  if (values.length < 2) return <div className="text-xs text-muted-foreground">One more check and a trend line appears.</div>;
  const W = 160, H = 40, pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 8) + 4, H - 4 - ((v - min) / Math.max(1, max - min)) * (H - 8)]);
  const up = values[values.length - 1] >= values[0]; const color = (up === (good === "high")) ? "hsl(var(--v-ready))" : "hsl(var(--v-notready))";
  return <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-40" role="img" aria-label={`Trend: ${values.join(", ")}`}><polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts.map(p => p.join(",")).join(" ")} />{pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3.5 : 2} fill={color} />)}</svg>;
}
export function Radar({ labels, now, before }: { labels: string[]; now: number[]; before?: number[] }) {
  const n = labels.length, R = 78, C = 100; const pt = (i: number, v: number) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2; const r = (v / 10) * R; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
  const poly = (vs: number[]) => vs.map((v, i) => pt(i, v).join(",")).join(" ");
  return (
    <svg viewBox="-30 -4 260 208" className="mx-auto h-64 w-full max-w-sm" role="img" aria-label={"Wellbeing wheel: " + labels.map((l, i) => `${l} ${now[i]}`).join(", ")}>
      {[2.5, 5, 7.5, 10].map(r => <polygon key={r} points={labels.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />)}
      {labels.map((_, i) => <line key={i} x1={C} y1={C} x2={pt(i, 10)[0]} y2={pt(i, 10)[1]} stroke="hsl(var(--border))" strokeWidth="1" />)}
      {before && <polygon points={poly(before)} fill="none" stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeWidth="1.5" />}
      <polygon points={poly(now)} fill="hsl(var(--primary) / 0.25)" stroke="hsl(var(--primary))" strokeWidth="2" />
      {labels.map((l, i) => { const [x, y] = pt(i, 11.8); return <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="hsl(var(--foreground))">{l}</text>; })}
    </svg>
  );
}
export const SupportCard = ({ strong }: { strong?: boolean }) => (
  <div role="alert" className={`rounded-3xl border p-4 text-sm ${strong ? "border-destructive/50 bg-destructive/10" : "border-border bg-secondary/50"}`}>
    <div className="font-semibold">{strong ? "You do not have to carry this alone." : "Support is available."}</div>
    <p className="mt-1">If you might hurt yourself or you are in danger, please contact your local emergency number, or someone near you, right now.</p>
    <p className="mt-1"><a className="underline" href="https://findahelpline.com" target="_blank" rel="noreferrer">findahelpline.com</a> lists free, confidential lines by country.</p>
  </div>
);

/** One tap on every Mind screen: "this made me feel worse". Kept on the device; shows support. Self-monitoring can backfire for some people. */
function Worse({ tool }: { tool: string }) {
  const [on, setOn] = useState(false);
  return on ? <div className="space-y-2"><p className="text-xs text-muted-foreground">Thank you for telling us. Stop if this is not helping. It is fine to skip any tool.</p><SupportCard /></div>
    : <button onClick={() => { const m = loadMind(); saveMind({ ...m, worse: [...m.worse, { ts: Date.now(), tool }] }); setOn(true); }} className="px-1 text-[11px] text-muted-foreground underline">This made me feel worse</button>;
}
