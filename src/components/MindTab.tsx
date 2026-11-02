import { useEffect, useState } from "react";
import { Brain, ClipboardCheck, Compass, Feather, Gauge, HeartHandshake, Moon, Smile, Sparkles, Wind, Activity } from "lucide-react";
import { useMind } from "@/store/useMind";
import { pickMind, type MindView } from "@/engine/mind";
import { loadLog } from "@/lib/startlog";
import { track } from "@/lib/track";
import { Checks, Wheel } from "@/components/mind/MindChecks";
import { Pm, Thoughts, Tlx, Woop } from "@/components/mind/MindTools";
import { Breathe, Kind, Wind as WindDown } from "@/components/mind/MindCalm";
import { Report } from "@/components/mind/MindReport";
import { Card, type MindProps } from "@/components/mind/MindParts";

const OPEN = "lagomo.mind.open";
/** Ask the Mind tab to open a specific tool the next time it shows (used by the card on Today). */
export const openMind = (v: MindView) => { try { sessionStorage.setItem(OPEN, v); } catch { /* ignore */ } };

const GROUPS: { title: string; sub: string; items: { id: MindView; title: string; line: string; icon: typeof Brain; tag: string }[] }[] = [
  { title: "Know where you are", sub: "Measure it, then watch it change", items: [
    { id: "wheel", title: "Wellbeing wheel", line: "Eight areas, thirty seconds", icon: Compass, tag: "weekly" },
    { id: "checks", title: "Check-ins", line: "WHO-5, mood, worry, focus", icon: ClipboardCheck, tag: "validated" },
    { id: "report", title: "Mind report", line: "Your data, joined up", icon: Activity, tag: "insight" },
  ] },
  { title: "Before and during a task", sub: "Make starting easier", items: [
    { id: "woop", title: "WOOP plan", line: "Wish, outcome, obstacle, plan", icon: Sparkles, tag: "1 min" },
    { id: "tlx", title: "Task load", line: "Why did that feel so heavy?", icon: Gauge, tag: "NASA-TLX" },
  ] },
  { title: "When it is hard", sub: "Small tools that change how you feel", items: [
    { id: "thoughts", title: "Unhook from a thought", line: "Defuse it or check it", icon: Feather, tag: "CBT + ACT" },
    { id: "kind", title: "Kind reset", line: "Stop being your own critic", icon: HeartHandshake, tag: "1 min" },
    { id: "breathe", title: "Slow breathing", line: "Cyclic sighing, grounding", icon: Wind, tag: "2 min" },
    { id: "pm", title: "Pleasure and mastery", line: "Find what lifts your mood", icon: Smile, tag: "activation" },
  ] },
  { title: "End of day", sub: "Let the day go", items: [
    { id: "wind", title: "Wind-down", line: "Tomorrow's list and worry time", icon: Moon, tag: "5 min" },
  ] },
];
const VIEWS: Record<Exclude<MindView, "home">, (p: MindProps) => JSX.Element> = { wheel: Wheel, checks: Checks, tlx: Tlx, woop: Woop, thoughts: Thoughts, pm: Pm, wind: WindDown, breathe: Breathe, kind: Kind, report: Report };

interface Props { onStart: (title: string, step: string) => void; onSpark: () => void }
/** The Mind tab: a hub of short, evidence-based tools. Everything is stored on this device. */
export function MindTab({ onStart, onSpark }: Props) {
  const { mind, update } = useMind();
  const [view, setView] = useState<MindView>(() => { try { const v = sessionStorage.getItem(OPEN) as MindView | null; sessionStorage.removeItem(OPEN); return v ?? "home"; } catch { return "home"; } });
  useEffect(() => { const f = () => { try { const v = sessionStorage.getItem(OPEN) as MindView | null; if (v) { sessionStorage.removeItem(OPEN); setView(v); } } catch { /* ignore */ } }; f(); window.addEventListener("lagomo:mindopen", f); return () => window.removeEventListener("lagomo:mindopen", f); }, []);
  const go = (v: MindView) => { setView(v); window.scrollTo({ top: 0 }); if (v !== "home") track("mind_open", { tool: v }); };
  const done = (note?: string) => {
    // up to three sparks a day, so the tools are used for the practice and not for points
    const k = "lagomo.mind.sparks"; let d: { day: string; n: number } = { day: "", n: 0 }; try { d = JSON.parse(localStorage.getItem(k) || "{}"); } catch { /* ignore */ }
    const day = new Date().toDateString(); const n = d.day === day ? d.n : 0; if (n < 3) { onSpark(); localStorage.setItem(k, JSON.stringify({ day, n: n + 1 })); }
    track("mind_done", { tool: (note ?? "x").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 12) });
  };
  const props: MindProps = { mind, update, done, back: () => go("home"), go, onStart };
  if (view !== "home") { const V = VIEWS[view]; return <V {...props} />; }
  const pick = pickMind(mind, loadLog().starts.map(s => s.ts));
  const used = mind.checks.length + mind.tlx.length + mind.woop.length + mind.thoughts.length + mind.pm.length + mind.wind.length + mind.calm.length + mind.wheel.length;
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div><h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><Brain className="h-7 w-7 text-primary" />Mind</h1>
        <p className="mt-1 text-sm text-muted-foreground">Short tools from psychology that actually move something. Each one measures, guides, or helps you act. {used === 0 ? "Start with one." : `${used} things recorded so far.`} Everything stays on this device.</p></div>
      {pick && <button onClick={() => go(pick.view)} className="glass w-full rounded-3xl p-4 text-start transition hover:shadow-lg"><div className="text-xs font-semibold uppercase tracking-wide text-primary">For right now</div><div className="mt-1 text-lg font-semibold">{pick.title}</div><div className="text-sm text-muted-foreground">{pick.line}</div><div className="mt-2 text-[11px] text-muted-foreground">Based on: {pick.why}</div></button>}
      {GROUPS.map(g => (
        <div key={g.title}><div className="mb-2 px-1"><h2 className="text-base font-semibold">{g.title}</h2><p className="text-xs text-muted-foreground">{g.sub}</p></div>
          <div className="grid gap-2 sm:grid-cols-2">{g.items.map(it => { const I = it.icon; return (
            <button key={it.id} onClick={() => go(it.id)} className="glass flex items-start gap-3 rounded-3xl p-4 text-start transition hover:shadow-lg"><span className="rounded-2xl bg-primary/10 p-2 text-primary"><I className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{it.title}</span><span className="block text-xs text-muted-foreground">{it.line}</span></span><span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{it.tag}</span></button>); })}</div></div>
      ))}
      <Card><p className="text-xs leading-snug text-muted-foreground">These tools are for everyday self-help and self-understanding. They do not diagnose or treat anything and are not a substitute for a doctor or counsellor. If things feel heavy for more than a couple of weeks, please talk to someone. In an emergency contact your local emergency number; findahelpline.com lists free lines by country.</p></Card>
    </section>
  );
}
