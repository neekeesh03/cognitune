import { useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { loadLog } from "@/lib/startlog";
import { activeDays, dayTable, driverLine, drivers, loadState, profile, toolEfficacy, trends, trialFromDriver } from "@/engine/insights";
import { loadPickFb, pickSummary } from "@/engine/pickfb";
import { energyMap } from "@/engine/mind";
import { Card, Help, Saved, Screen, type MindProps } from "@/components/mind/MindParts";

const cls = "rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"; const ghost = "rounded-full border border-border px-4 py-2 text-sm";
const hourText = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

/** Draws the start profile as an image you can save or share. Colours come from the app theme. */
function drawProfile(p: ReturnType<typeof profile>, name: string): string {
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350; const g = c.getContext("2d")!;
  const css = (v: string, fb: string) => { const x = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return x ? `hsl(${x})` : fb; };
  g.fillStyle = css("--background", "#f2f7f3"); g.fillRect(0, 0, 1080, 1350); g.fillStyle = css("--primary", "#447d58"); g.fillRect(0, 0, 1080, 18);
  g.fillStyle = css("--foreground", "#101e17"); g.font = "700 64px Inter Tight, system-ui, sans-serif"; g.fillText("My start profile", 70, 150);
  g.fillStyle = css("--muted-foreground", "#696866"); g.font = "400 34px Inter Tight, system-ui, sans-serif"; g.fillText(name ? `${name} · Lagomo` : "Lagomo", 70, 205);
  const rows: [string, string | null][] = [["Style", p.style ? `${p.style}` : null], ["What holds me back most", p.lever], ["My best time of day", p.window], ["I usually start around", p.startHour != null ? hourText(p.startHour) : null], ["What calms me best", p.tool], ["Starts so far", String(p.starts)]];
  let y = 330; for (const [k, v] of rows) { g.fillStyle = css("--muted-foreground", "#696866"); g.font = "400 30px Inter Tight, system-ui, sans-serif"; g.fillText(k, 70, y); g.fillStyle = css("--foreground", "#101e17"); g.font = "600 50px Inter Tight, system-ui, sans-serif"; g.fillText(v ?? "Not enough data yet", 70, y + 62); y += 170; }
  g.fillStyle = css("--muted-foreground", "#696866"); g.font = "400 26px Inter Tight, system-ui, sans-serif"; g.fillText("Built from my own data. A snapshot, not a label.", 70, 1290);
  return c.toDataURL("image/png");
}

/** Your patterns: what your own data says, what is changing, and what to try next. */
export function Insights({ mind, update, done, back, go }: MindProps) {
  const starts = loadLog().starts.map(s => s.ts); const now = Date.now(); const rows = dayTable(mind, starts, now); const active = activeDays(rows);
  const load = loadState(mind, starts, now); const drv = drivers(rows); const tr = trends(mind, starts, now); const eff = toolEfficacy(mind); const prof = profile(mind, starts);
  const em = energyMap(mind.pulse).filter(b => b.e != null && b.count >= 2); const [made, setMade] = useState<string | null>(null); const [light, setLight] = useState(() => { try { return localStorage.getItem("lagomo.lightday") === new Date().toDateString(); } catch { return false; } });
  const name = useRef(""); void name;
  const share = async () => { const url = drawProfile(prof, ""); const blob = await (await fetch(url)).blob(); const file = new File([blob], "my-start-profile.png", { type: "image/png" }); const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }; if (nav.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: "My start profile" }); return; } catch { /* fall through to download */ } } const a = document.createElement("a"); a.href = url; a.download = "my-start-profile.png"; a.click(); };
  const need = Math.max(0, 14 - active);
  return (
    <Screen title="Your patterns" sub="What your own data says, what is shifting, and what to try next. These are patterns in your days, not causes." back={back} credit="Method: day-by-day table of your starts and Mind entries. Habit links use a bootstrap 99% interval on the difference in how often you start (strict, because several habits are compared); trends use the Mann-Kendall test; tool rankings shrink small samples toward a modest prior. On simulated users this flagged a real +40-point effect in about 6 of 10 datasets and a false pattern in under 2 of 100.">
      {need > 0 && <Card><div className="text-sm font-semibold">Unlocking your patterns</div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (active / 14) * 100)}%` }} /></div>
        <Help>{active} of 14 active days. A day counts when you start something or log anything in Mind. Habit links need about two weeks. Sleep diary, 10-second pulse and WOOP give the most to analyse.</Help><div className="mt-2 flex flex-wrap gap-2"><button onClick={() => go("pulse")} className={ghost}>10-second pulse</button><button onClick={() => go("sleep")} className={ghost}>Sleep diary</button></div></Card>}

      <Card className={load.state === "low" ? "border border-destructive/40" : ""}><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How stretched are you?</div>
        <div className="text-2xl font-semibold">{load.state === "steady" ? "Steady" : load.state === "stretched" ? "A bit stretched" : "Running low"}</div>
        {load.signals.length > 0 ? <ul className="mt-2 space-y-1 text-sm">{load.signals.map(s => <li key={s}>• {s}</li>)}</ul> : <Help>No warning signs in your recent data.</Help>}
        {load.state !== "steady" && <div className="mt-3 space-y-2 text-sm"><p>A lighter day can protect you: only 2-minute starts, one task, and one gentle thing for yourself.</p>
          {!light ? <button onClick={() => { try { localStorage.setItem("lagomo.lightday", new Date().toDateString()); } catch { /* ignore */ } setLight(true); }} className={cls}>Make today a light day</button> : <Saved text="Light day on. Today will suggest gentle things first." />}
          {load.state === "low" && <p className="text-xs text-muted-foreground">If this has lasted a couple of weeks, please talk to someone you trust or a doctor or counsellor.</p>}</div>}</Card>

      {drv.length > 0 && <Card className="space-y-3"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Habits that go with starting</div>
        {drv.slice(0, 4).map(d => <div key={d.id} className="rounded-2xl bg-secondary/40 p-3 text-sm"><div className="flex items-center justify-between gap-2"><b>{d.label}</b><span className={`rounded-full px-2 py-0.5 text-[10px] ${d.strength === "probable" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{d.strength === "probable" ? "likely real" : "a hint"}</span></div>
          <p className="mt-1">{driverLine(d)}</p><Help>{d.nYes} days vs {d.nNo} days. 99% range for the difference: {Math.round(d.lo * 100)} to {Math.round(d.hi * 100)} points.</Help>
          <div className="mt-2">{made === d.id ? <Saved text="Experiment started. Find it in Test what works for me." /> : <button onClick={() => { update(m => ({ ...m, trials: [...m.trials, trialFromDriver(d)] })); setMade(d.id); done("insight"); }} className={ghost}>Test this for 14 days</button>}</div></div>)}
        <Help>A link is not a cause: busy days can change both. The experiment is how to find out.</Help></Card>}
      {drv.length === 0 && need === 0 && <Card><p className="text-sm">No habit stands out yet. That is an answer too: nothing you track clearly changes how often you start. Keep logging, or try the experiments to test ideas directly.</p></Card>}

      {tr.length > 0 && <Card className="space-y-2"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What is changing</div>{tr.slice(0, 4).map(t => <p key={t.label} className="text-sm"><span className={`me-2 inline-block h-2 w-2 rounded-full ${t.good ? "bg-[hsl(var(--v-ready))]" : "bg-[hsl(var(--v-notready))]"}`} />{t.text}</p>)}<Help>Trends need at least 5 data points and a clear direction.</Help></Card>}

      {eff.length > 0 && <Card className="space-y-2"><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What works for you</div><Help>Average relief after each tool, from your own before-and-after ratings. Small samples are pulled toward the middle so one lucky try does not top the list.</Help>
        {eff.slice(0, 6).map(e => <div key={e.name} className="space-y-0.5"><div className="flex items-center justify-between gap-2 text-sm"><button onClick={() => go(e.view)} className="text-start underline-offset-2 hover:underline">{e.name}</button><span className="text-xs text-muted-foreground">{e.n}x</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full ${e.shrunk >= 0 ? "bg-primary" : "bg-[hsl(var(--v-notready))]"}`} style={{ width: `${Math.max(4, Math.min(100, Math.abs(e.shrunk) * 200))}%` }} /></div></div>)}</Card>}

      {(em.length > 0 || prof.startHour != null) && <Card><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your time of day</div>
        {em.length > 0 && <p className="mt-1 text-sm">Highest energy: <b>{em.sort((a, b) => b.e! - a.e!)[0].n.split(" (")[0].toLowerCase()}</b>.</p>}{prof.startHour != null && <p className="text-sm">You most often start around <b>{hourText(prof.startHour)}</b>.</p>}<Help>Put the hardest task in your high-energy window, and your most common start hour is a good anchor for a tiny habit.</Help></Card>}

      {(() => { const ps = pickSummary(loadPickFb()); return <Card><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How Today learns from you</div>
        {ps.length === 0 ? <Help>Each time you open a suggestion on Today, or tap "Another idea" or "Not today", Lagomo notes it on this device only. After 3 answers on one kind of suggestion, the ones you take move up and the ones you skip move down. Nothing is ever hidden for good.</Help>
          : <ul className="mt-2 space-y-1 text-sm">{ps.map(x => <li key={x.view} className="flex items-center justify-between gap-2"><span>{x.title}</span><span className="text-xs text-muted-foreground">{x.acc} taken, {x.skip} skipped · {x.score > 0.15 ? "shown earlier" : x.score < -0.15 ? "shown later" : "neutral"}</span></li>)}</ul>}</Card>; })()}

      <Card><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your start profile</div>
        <ul className="mt-2 space-y-1 text-sm"><li><b>Style:</b> {prof.style ?? "take the Start style check"}</li><li><b>Holds you back most:</b> {prof.lever ?? "run Why am I avoiding it? twice"}</li><li><b>Best time:</b> {prof.window ?? "tap the 10-second pulse at different times"}</li><li><b>Calms you best:</b> {prof.tool ?? "use a few tools and rate them"}</li></ul>
        <button onClick={share} className={cls + " mt-3 inline-flex items-center gap-2"}><Share2 className="h-4 w-4" />Save or share as an image</button></Card>
    </Screen>
  );
}
