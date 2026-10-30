import { useEffect, useState } from "react";
import { openLink } from "@/lib/fx";
import { tr } from "@/i18n";
interface T { id: number; title: string; sub?: string; action?: { label: string; url: string } }
const COLORS = ["--f-primode", "--f-flexion", "--f-grain", "--f-cap", "--primary", "--f-anchory"];
export function FxHost() {
  const [toasts, setT] = useState<T[]>([]); const [bits, setBits] = useState<{ id: number; x: number; c: string; d: number; r: number; w: number }[]>([]);
  useEffect(() => {
    let n = 0;
    const onT = (e: Event) => { const d = (e as CustomEvent).detail; const id = ++n; setT(a => [...a.slice(-2), { id, ...d }]); setTimeout(() => setT(a => a.filter(x => x.id !== id)), d.action ? 15000 : 3200); };
    const onB = () => { if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; const base = Date.now(); setBits(Array.from({ length: 36 }, (_, i) => ({ id: base + i, x: Math.random() * 100, c: COLORS[i % COLORS.length], d: 1.6 + Math.random() * 1.4, r: Math.random() * 720 - 360, w: 6 + Math.random() * 6 }))); setTimeout(() => setBits([]), 3200); };
    window.addEventListener("lagomo:toast", onT); window.addEventListener("lagomo:burst", onB);
    return () => { window.removeEventListener("lagomo:toast", onT); window.removeEventListener("lagomo:burst", onB); };
  }, []);
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
        {bits.map(b => <span key={b.id} className="absolute top-[-10px] block rounded-[2px]" style={{ left: `${b.x}%`, width: b.w, height: b.w * 1.6, background: `hsl(var(${b.c}))`, animation: `fall ${b.d}s cubic-bezier(.3,.6,.4,1) forwards`, ["--r" as string]: `${b.r}deg` }} />)}
      </div>
      <div className="pointer-events-none fixed left-1/2 top-4 z-[70] flex w-max max-w-[92vw] -translate-x-1/2 flex-col items-center gap-2" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`glass animate-rise flex max-w-full items-center gap-3 rounded-full px-5 py-2.5 text-sm shadow-lg ${t.action ? "pointer-events-auto" : ""}`}><span><span className="font-semibold" translate="no">{t.title}</span>{t.sub && <span className="ml-2 text-muted-foreground">{t.sub}</span>}</span>{t.action && <button onClick={() => { setT(a => a.filter(x => x.id !== t.id)); openLink(t.action!.url); }} className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">{tr(t.action.label)}</button>}</div>)}
      </div>
    </>
  );
}
