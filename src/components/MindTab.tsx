import { useEffect, useState } from "react";
import { Brain, ClipboardCheck, Compass, Feather, Gauge, HeartHandshake, Moon, Smile, Sparkles, Wind, Activity, BedDouble, LifeBuoy, Flame, Smartphone, Anchor as AnchorIcon, Trophy, Send, Gift as GiftIcon, Layers, Timer, Smile as SmileIcon, CloudRain, Repeat, ShieldCheck, GraduationCap, Coffee, Bookmark, Beaker, Target, FlaskConical, Footprints, HelpCircle, Gift, Sun, Waves, CalendarCheck, Zap, Shield } from "lucide-react";
import { useMind } from "@/store/useMind";
import { pickMind, type MindView } from "@/engine/mind";
import { loadLog } from "@/lib/startlog";
import { track } from "@/lib/track";
import { Checks, Wheel } from "@/components/mind/MindChecks";
import { Pm, Thoughts, Tlx, Woop } from "@/components/mind/MindTools";
import { Breathe, Kind, Wind as WindDown } from "@/components/mind/MindCalm";
import { Report } from "@/components/mind/MindReport";
import { Bundle, Compass as ValuesCompass, Data, Experiment, Good, Ladder, Pulse, Review, Sleep, Urge, Why } from "@/components/mind/MindMore";
import { Insights } from "@/components/mind/MindInsights";
import { Letter, WindowTool } from "@/components/mind/MindWeek";
import { toolEfficacy, topInsightCached as topInsight } from "@/engine/insights";
import { Anchor, Anger, KindThing, Ledger, Phone, Reach, Skills } from "@/components/mind/MindMore3";
import { Break, Deck, Exam, Feel, GuessTime, Loop, Park, TrialTool, Worry } from "@/components/mind/MindMore2";
import { Card, type MindProps } from "@/components/mind/MindParts";

const OPEN = "lagomo.mind.open";
/** Ask the Mind tab to open a specific tool the next time it shows (used by the card on Today). */
export const openMind = (v: MindView) => { try { sessionStorage.setItem(OPEN, v); } catch { /* ignore */ } };

const GROUPS: { title: string; sub: string; items: { id: MindView; title: string; line: string; icon: typeof Brain; tag: string }[] }[] = [
  { title: "Know where you are", sub: "Measure it, then watch it change", items: [
    { id: "letter", title: "Your weekly letter", line: "What your week says, kindly", icon: Send, tag: "weekly" },
    { id: "wheel", title: "Wellbeing wheel", line: "Eight areas, thirty seconds", icon: Compass, tag: "weekly" },
    { id: "checks", title: "Check-ins", line: "Wellbeing, stress, tiredness, connection, style", icon: ClipboardCheck, tag: "9 validated" },
    { id: "pulse", title: "10-second pulse", line: "Energy and mood, your own map", icon: Zap, tag: "daily" },
    { id: "sleep", title: "Sleep diary", line: "Your real sleep, and one fix", icon: BedDouble, tag: "CBT-I" },
    { id: "review", title: "Weekly review", line: "Look back, set one focus", icon: CalendarCheck, tag: "3 min" },
    { id: "trial", title: "Test what works for me", line: "A small experiment on yourself", icon: Beaker, tag: "n-of-1" },
    { id: "report", title: "Mind report", line: "Your data, joined up", icon: Activity, tag: "insight" },
  ] },
  { title: "Study and exams", sub: "What research says works", items: [
    { id: "deck", title: "Recall deck", line: "Spaced self-testing, 2 minutes a day", icon: Layers, tag: "strong evidence" },
    { id: "exam", title: "Before the exam", line: "Turn nerves into fuel", icon: GraduationCap, tag: "3 min" },
    { id: "guess", title: "Guess the time", line: "Your own planning multiplier", icon: Timer, tag: "planning" },
    { id: "park", title: "Park my place", line: "Make coming back easy", icon: Bookmark, tag: "1 line" },
  ] },
  { title: "Before and during a task", sub: "Make starting easier", items: [
    { id: "woop", title: "WOOP plan", line: "Wish, outcome, obstacle, plan", icon: Sparkles, tag: "1 min" },
    { id: "why", title: "Why am I avoiding it?", line: "Find the lever that helps most", icon: HelpCircle, tag: "motivation" },
    { id: "window", title: "Hardest task first", line: "Schedule it in your best window", icon: Timer, tag: "your data" },
    { id: "tlx", title: "Task load", line: "Why did that feel so heavy?", icon: Gauge, tag: "NASA-TLX" },
    { id: "bundle", title: "Reward pairing", line: "A treat only during the task", icon: Gift, tag: "bundling" },
    { id: "compass", title: "Values compass", line: "Give the task a reason", icon: Target, tag: "ACT" },
  ] },
  { title: "When it is hard", sub: "Small tools that change how you feel", items: [
    { id: "thoughts", title: "Unhook from a thought", line: "Defuse it or check it", icon: Feather, tag: "CBT + ACT" },
    { id: "kind", title: "Kind reset", line: "Stop being your own critic", icon: HeartHandshake, tag: "1 min" },
    { id: "breathe", title: "Slow breathing", line: "Cyclic sighing, grounding", icon: Wind, tag: "2 min" },
    { id: "pm", title: "Pleasure and mastery", line: "Find what lifts your mood", icon: Smile, tag: "activation" },
    { id: "exp", title: "Test a worry", line: "Check a prediction in real life", icon: FlaskConical, tag: "CBT" },
    { id: "ladder", title: "Step ladder", line: "Face something avoided, in tiny steps", icon: Footprints, tag: "exposure" },
    { id: "urge", title: "Ride the urge", line: "90 seconds instead of scrolling", icon: Waves, tag: "mixed evidence" },
    { id: "feel", title: "Handle a feeling", line: "Name it, then choose what fits", icon: CloudRain, tag: "emotion skills" },
    { id: "worry", title: "Worry parking", line: "Act on it, or give it a time", icon: Repeat, tag: "CBT" },
    { id: "loop", title: "Break a thought loop", line: "From why to what next", icon: SmileIcon, tag: "RF-CBT" },
    { id: "enough", title: "Good-enough test", line: "Try 80% and see what happens", icon: ShieldCheck, tag: "perfectionism" },
    { id: "brk", title: "Take a break", line: "Learn which breaks help you", icon: Coffee, tag: "energy" },
    { id: "skills", title: "Skills for hard moments", line: "Pick the urge, get a skill", icon: LifeBuoy, tag: "DBT-style" },
    { id: "anger", title: "Anger pause", line: "Cool down before you send", icon: Flame, tag: "20-min delay" },
  ] },
  { title: "Habits and focus", sub: "Make the good thing easier", items: [
    { id: "anchor", title: "Tiny anchor", line: "30 seconds after something you already do", icon: AnchorIcon, tag: "if-then" },
    { id: "ledger", title: "Proof ledger", line: "What each start proved", icon: Trophy, tag: "wins" },
    { id: "phone", title: "Phone friction", line: "Make distraction a bit harder", icon: Smartphone, tag: "RCT-backed" },
  ] },
  { title: "With people", sub: "Small, kind, no pressure", items: [
    { id: "reach", title: "Reach out", line: "Message someone you care about", icon: Send, tag: "weekly" },
    { id: "kindness", title: "One kind thing", line: "A small kindness, no streak", icon: GiftIcon, tag: "wellbeing" },
  ] },
  { title: "End of day", sub: "Let the day go", items: [
    { id: "wind", title: "Wind-down", line: "Tomorrow's list and worry time", icon: Moon, tag: "5 min" },
    { id: "good", title: "Three good things", line: "End on what went okay", icon: Sun, tag: "modest effect" },
  ] },
  { title: "Yours", sub: "You own it", items: [
    { id: "data", title: "Your data", line: "Export, print, or delete", icon: Shield, tag: "private" },
  ] },
];
const VIEWS: Record<Exclude<MindView, "home">, (p: MindProps) => JSX.Element> = { wheel: Wheel, checks: Checks, tlx: Tlx, woop: Woop, thoughts: Thoughts, pm: Pm, wind: WindDown, breathe: Breathe, kind: Kind, report: Report, letter: Letter, window: WindowTool, insights: Insights, skills: Skills, anger: Anger, phone: Phone, anchor: Anchor, ledger: Ledger, reach: Reach, kindness: KindThing, deck: Deck, guess: GuessTime, feel: Feel, worry: Worry, loop: Loop, enough: (p: MindProps) => <Experiment {...p} preset="enough" />, exam: Exam, brk: Break, park: Park, trial: TrialTool, sleep: Sleep, compass: ValuesCompass, exp: Experiment, ladder: Ladder, why: Why, bundle: Bundle, good: Good, urge: Urge, review: Review, pulse: Pulse, data: Data };

interface Props { schedule?: (title: string, day: string, start: number, dur: number) => void; tasks?: { id: string; title: string }[]; onStart: (title: string, step: string) => void; onSpark: () => void; friends?: { id: string; name: string; last: number | null }[]; openChat?: (id: string, draft: string) => void }
/** The Mind tab: a hub of short, evidence-based tools. Everything is stored on this device. */
export function MindTab({ onStart, onSpark, friends, openChat, schedule, tasks }: Props) {
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
  const props: MindProps = { mind, update, done, back: () => go("home"), go, onStart, friends, openChat, schedule, tasks };
  if (view !== "home") { const V = VIEWS[view]; return <V {...props} />; }
  const worksFor = new Set(toolEfficacy(mind).filter(e => e.n >= 3 && e.shrunk > 0.15).slice(0, 4).map(e => e.view as string));
  const pick = pickMind(mind, loadLog().starts.map(s => s.ts));
  const used = mind.checks.length + mind.tlx.length + mind.woop.length + mind.thoughts.length + mind.pm.length + mind.wind.length + mind.calm.length + mind.wheel.length + mind.sleep.length + mind.tmt.length + mind.good.length + mind.pulse.length + mind.urges.length + mind.exps.length + mind.ladders.length + mind.bundles.length + mind.compass.length + mind.reviews.length + mind.deckLog.length + mind.guesses.length + mind.feelings.length + mind.worries.length + mind.loops.length + mind.exams.length + mind.breaks.length + mind.park.length + mind.trials.length;
  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <div><h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight"><Brain className="h-7 w-7 text-primary" />Mind</h1>
        <p className="mt-1 text-sm text-muted-foreground">Short tools from psychology that actually move something. Each one measures, guides, or helps you act. {used === 0 ? "Start with one." : `${used} things recorded so far.`} Everything stays on this device.</p></div>
      {(() => { const ins = topInsight(mind, loadLog().starts.map(s => s.ts)); return ins ? <button onClick={() => go("insights")} className="w-full rounded-3xl border border-primary/30 bg-primary/5 p-4 text-start transition hover:shadow-lg"><div className="text-xs font-semibold uppercase tracking-wide text-primary">From your data</div><div className="mt-1 text-sm">{ins.text}</div><div className="mt-2 text-[11px] text-muted-foreground">Open your patterns</div></button> : <button onClick={() => go("insights")} className="w-full rounded-3xl border border-border p-4 text-start transition hover:shadow-lg"><div className="text-xs font-semibold uppercase tracking-wide text-primary">Your patterns</div><div className="mt-1 text-sm text-muted-foreground">See how stretched you are, what goes with your best days, and what works for you.</div></button>; })()}
      {pick && <button onClick={() => go(pick.view)} className="glass w-full rounded-3xl p-4 text-start transition hover:shadow-lg"><div className="text-xs font-semibold uppercase tracking-wide text-primary">For right now</div><div className="mt-1 text-lg font-semibold">{pick.title}</div><div className="text-sm text-muted-foreground">{pick.line}</div><div className="mt-2 text-[11px] text-muted-foreground">Based on: {pick.why}</div></button>}
      {GROUPS.map(g => (
        <div key={g.title}><div className="mb-2 px-1"><h2 className="text-base font-semibold">{g.title}</h2><p className="text-xs text-muted-foreground">{g.sub}</p></div>
          <div className="grid gap-2 sm:grid-cols-2">{g.items.map(it => { const I = it.icon; return (
            <button key={it.id} onClick={() => go(it.id)} className="glass flex items-start gap-3 rounded-3xl p-4 text-start transition hover:shadow-lg"><span className="rounded-2xl bg-primary/10 p-2 text-primary"><I className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-medium">{it.title}</span><span className="block text-xs text-muted-foreground">{it.line}</span></span><span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{worksFor.has(it.id) ? "works for you" : it.tag}</span></button>); })}</div></div>
      ))}
      <Card><p className="text-xs leading-snug text-muted-foreground">These tools are for everyday self-help and self-understanding. They do not diagnose or treat anything and are not a substitute for a doctor or counsellor. If things feel heavy for more than a couple of weeks, please talk to someone. In an emergency contact your local emergency number; findahelpline.com lists free lines by country.</p></Card>
    </section>
  );
}
