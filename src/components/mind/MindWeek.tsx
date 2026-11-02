import { useEffect, useState } from "react";
import { loadLog } from "@/lib/startlog";
import { bestWindow, trialFromDriver, weeklyLetter } from "@/engine/insights";
import { dkL } from "@/engine/insights";
import { Card, Field, Help, Pills, Primary, Saved, Screen, type MindProps } from "@/components/mind/MindParts";

const cls = "rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"; const ghost = "rounded-full border border-border px-4 py-2 text-sm";
export const LETTER_KEY = "lagomo.letter.ts";
const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Your weekly Mind letter: a short, kind write-up of your week, built only from your own data. */
export function Letter({ mind, update, done, back, go }: MindProps) {
  const starts = loadLog().starts.map(s => s.ts); const L = weeklyLetter(mind, starts); const [made, setMade] = useState(false);
  useEffect(() => { try { localStorage.setItem(LETTER_KEY, String(Date.now())); } catch { /* ignore */ } }, []);
  return (
    <Screen title="Your weekly letter" sub={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} back={back} credit="Written from your own starts and Mind entries. Patterns are links in your data, not proof of cause. Quiet weeks are treated as information, never as failure.">
      <Card className="space-y-3"><div className="text-xl font-semibold">{L.headline}</div>{L.paras.map(p => <p key={p} className="text-sm leading-relaxed">{p}</p>)}
        <div className="rounded-2xl bg-primary/10 p-3 text-sm"><b>For next week:</b> {L.next}</div></Card>
      <div className="flex flex-wrap gap-2">{L.driver && !made && <button onClick={() => { update(m => ({ ...m, trials: [...m.trials, trialFromDriver(L.driver!)] })); setMade(true); done("letter"); }} className={cls}>Start that experiment</button>}{made && <Saved text="Experiment started." />}<button onClick={() => go("insights")} className={ghost}>Open your patterns</button><button onClick={() => go("review")} className={ghost}>Do the weekly review</button></div>
      <Help>The weekly review asks you a few questions. The letter tells you what your data says.</Help>
    </Screen>
  );
}

/** Hardest task first: put your hardest task into your best window, as a planned block with a reminder. */
export function WindowTool({ mind, done, back, schedule, tasks }: MindProps) {
  const starts = loadLog().starts.map(s => s.ts); const win = bestWindow(mind, starts); const [title, setTitle] = useState(""); const [when, setWhen] = useState<"today" | "tomorrow">("tomorrow"); const [dur, setDur] = useState(25); const [saved, setSaved] = useState(false);
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes(); const startMin = win?.startMin ?? 9 * 60; const todayOk = startMin > nowMin + 15; const day = dkL(Date.now() + (when === "tomorrow" || !todayOk ? 864e5 : 0));
  const chosen = when === "today" && !todayOk ? "tomorrow" : when;
  return (
    <Screen title="Hardest task first" sub="Put the task you dread into the time of day when you have the most energy." back={back} credit="Uses your own energy taps (or your usual start hour) rather than a generic morning-person rule: chronotype quizzes show little main effect on performance in a 2025 systematic review, while personal data is specific to you. Planning with a time and place is an if-then plan.">
      <Card>{win ? <><div className="text-xs font-semibold uppercase tracking-wide text-primary">Your best window</div><div className="text-xl font-semibold">{win.phrase[0].toUpperCase() + win.phrase.slice(1)}, from {clock(win.startMin)}</div><Help>{win.why}</Help></> : <><div className="text-sm">No best window yet. Tap the 10-second pulse at different times for a week, or start a few tasks, and it appears. Meanwhile we use 9:00.</div></>}</Card>
      <Card className="space-y-3"><Field label="Your hardest task" value={title} onChange={t => { setSaved(false); setTitle(t); }} rows={1} ph="Write the methods section" />
        {(tasks ?? []).length > 0 && <div className="flex flex-wrap gap-2">{(tasks ?? []).slice(0, 5).map(t => <button key={t.id} onClick={() => { setSaved(false); setTitle(t.title); }} className="rounded-full border border-border px-3 py-1 text-xs">{t.title.slice(0, 30)}</button>)}</div>}
        <div className="text-sm font-medium">When</div><Pills value={chosen} onChange={setWhen} label="Day" options={[{ v: "today" as const, label: "Today" }, { v: "tomorrow" as const, label: "Tomorrow" }]} />{when === "today" && !todayOk && <Help>That window has passed today, so tomorrow is used.</Help>}
        <div className="text-sm font-medium">How long</div><Pills value={dur} onChange={setDur} label="Minutes" options={[{ v: 15, label: "15 min" }, { v: 25, label: "25 min" }, { v: 45, label: "45 min" }]} /></Card>
      {!saved ? <Primary disabled={title.trim().length < 3 || !schedule} onClick={() => { schedule!(title.trim().slice(0, 60), day, startMin, dur); try { localStorage.setItem("lagomo.window.day", new Date().toDateString()); } catch { /* ignore */ } setSaved(true); done("window"); }}>Schedule it with a reminder</Primary> : <Saved text={`Planned for ${chosen} at ${clock(startMin)}. It is in your Plan tab, with a reminder.`} />}
      {!schedule && <Help>Scheduling needs the full app.</Help>}
    </Screen>
  );
}
