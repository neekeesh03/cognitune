import { useMemo, useState } from "react";
import { tr } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from "recharts";
import { CheckIn, calibrate, historyFeatures, whatBlocksYou, timeOfDay, retestAgreement, toCSV } from "@/engine/analytics";
import { DEFAULT_THRESHOLDS, VAR_KEYS } from "@/engine/model";
import type { Profile } from "@/engine/profile";
import { FORCE, fc } from "@/engine/forces";
import { SimulatorTab } from "@/components/SimulatorTab";
import { EvidenceTab } from "@/components/EvidenceTab";

interface Props { profile: Profile; history: CheckIn[]; onFollowUp: (id: string, started: boolean) => void; onClear: () => void; onDelete: (id: string) => void }

export function InsightsTab({ profile, history, onFollowUp, onClear, onDelete }: Props) {
  const [view, setView] = useState<"you" | "sim" | "evidence">("you");
  const cal = useMemo(() => calibrate(history), [history]);
  const hf = historyFeatures(history);
  const block = whatBlocksYou(history);
  const tod = timeOfDay(history);
  const rt = retestAgreement(history);
  const data = history.map((x, i) => ({ i: i + 1, drive: +x.drive.toFixed(2) }));
  const pending = history.filter(x => x.started === undefined).slice(-5).reverse();

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toCSV(history)], { type: "text/csv" }));
    a.download = "lagomo-history.csv"; a.click();
  };

  const seg = (
    <div className="mb-6 flex w-fit gap-1 rounded-full bg-foreground/[.05] p-1">{([["you", "About me"], ["sim", "What-if"], ["evidence", "The science"]] as const).map(([id, l]) => <button key={id} onClick={() => setView(id)} className={`rounded-full px-4 py-1.5 text-sm ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>);
  if (view === "sim") return <div>{seg}<SimulatorTab /></div>;
  if (view === "evidence") return <div>{seg}<EvidenceTab /></div>;
  const profileCard = (
    <Card className="glass border-0 rounded-3xl lg:col-span-2">
      <CardHeader><CardTitle className="text-lg">What the app has learned about you</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        {profile.entries === 0 ? <p className="text-muted-foreground">Write in the journal. Patterns appear after a few entries.</p> : (<>
          <p className="text-muted-foreground">{tr("Entries: {n}, days: {d}, words: {w}. Readiness checks currently lean up to {p}% on this.").replace("{n}", String(profile.entries)).replace("{d}", String(profile.journalDays)).replace("{w}", String(profile.words)).replace("{p}", String(Math.round(profile.blendWeight * 100)))}</p>
          <div className="grid gap-2 sm:grid-cols-2">{VAR_KEYS.map(k => { const l = profile.levels[k]; return (
            <div key={k} className="flex items-center gap-3"><span className="w-16">{FORCE[k].title}</span>
              <div className="h-2 flex-1 rounded-full bg-foreground/10">{l && <div className="h-full rounded-full" style={{ width: `${l.value * 100}%`, background: fc(FORCE[k].color), opacity: 0.4 + 0.6 * l.conf }} />}</div>
              <span className="w-14 text-right text-xs text-muted-foreground">{l ? tr(l.n === 1 ? "{n} note" : "{n} notes").replace("{n}", String(l.n)) : tr("unknown")}</span></div>); })}</div>
          {profile.themes.length > 0 && <div><span className="text-muted-foreground">Recurring themes: </span>{profile.themes.join(", ")}</div>}
          {profile.sentiment7 != null && <div><span className="text-muted-foreground">Recent tone: </span>{profile.sentiment7 > 0.15 ? "mostly positive" : profile.sentiment7 < -0.15 ? "mostly heavy" : "mixed"}</div>}
          {profile.divergence.length > 0 && <div><span className="text-muted-foreground">Where your taps and your writing disagree: </span>{profile.divergence.slice(0, 2).map(d => `${FORCE[d.key].title} (writing says ${d.diff > 0 ? "higher" : "lower"})`).join(", ")}</div>}
          {profile.wins.length > 0 && <div><span className="text-muted-foreground">Recent wins: </span>{profile.wins.slice(0, 2).map(w => `"${w.text}"`).join(" ")}</div>}
          <p className="text-xs text-muted-foreground">Based on word patterns in what you write. It is a rough signal and improves with more entries.</p></>)}
      </CardContent>
    </Card>);
  if (!history.length) return <div>{seg}<div className="grid gap-6">{profileCard}<Card className="glass border-0 rounded-3xl"><CardContent className="py-12 text-center text-muted-foreground">No check-ins yet. Run a readiness check and come back.</CardContent></Card></div></div>;

  const starts = history.filter(x => x.started).length;
  const days = new Set(history.filter(x => x.started).map(x => new Date(x.ts).toDateString()));
  const avg = history.reduce((a, x) => a + x.drive, 0) / history.length;
  return (
    <div>{seg}<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      {profileCard}
      <div className="lg:col-span-2 grid grid-cols-3 gap-3 text-center">
        {[["Starts", starts, "times you got going"], ["Start days", days.size, "days with at least one start"], ["Average start power", avg.toFixed(2), tr(history.length === 1 ? "across 1 check-in" : "across {n} check-ins").replace("{n}", String(history.length))]].map(([a, b, c]) => (
          <div key={a as string} className="glass rounded-3xl p-4"><div className="font-display text-4xl sm:text-5xl">{b}</div><div className="text-sm">{a}</div><div className="text-xs text-muted-foreground">{c}</div></div>))}
        <p className="col-span-3 text-xs text-muted-foreground">Missed days are never penalised. Only starts count.</p>
      </div>
      <Card className="glass border-0 rounded-3xl lg:col-span-2">
        <CardHeader><CardTitle className="text-lg">Start power over time</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer><LineChart data={data}>
            <XAxis dataKey="i" /><YAxis domain={[0, (m: number) => Math.max(1.2, Math.ceil(m * 10) / 10)]} /><Tooltip />
            <ReferenceLine y={DEFAULT_THRESHOLDS.ready} strokeDasharray="4 4" /><ReferenceLine y={DEFAULT_THRESHOLDS.borderline} strokeDasharray="4 4" />
            <Line dataKey="drive" stroke="hsl(var(--primary))" strokeWidth={2} dot />
          </LineChart></ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-3xl">
        <CardHeader><CardTitle className="text-lg">Follow-ups: did you actually start?</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {pending.length === 0 && <p className="text-muted-foreground">All caught up.</p>}
          {pending.map(x => (
            <div key={x.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div><div className="font-medium">{x.task}</div><div className="text-xs text-muted-foreground">{new Date(x.ts).toLocaleString()} - Drive {x.drive.toFixed(2)}</div></div>
              <div className="flex gap-2"><Button size="sm" onClick={() => onFollowUp(x.id, true)}>Started</Button><Button size="sm" variant="outline" onClick={() => onFollowUp(x.id, false)}>Did not</Button></div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">These labels let Lagomo learn your own threshold instead of relying on population defaults.</p>
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-3xl">
        <CardHeader><CardTitle className="text-lg">Personal calibration</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!cal.ready ? <p className="text-muted-foreground">{tr("Tell me whether you started after a few more check-ins ({n} so far) and I will learn your own pattern.").replace("{n}", String(cal.n))}</p> : (
            <>
              <p>You usually start when your start power is above <b>{cal.threshold?.toFixed(2) ?? "n/a"}</b>.</p>
              <p>{cal.brier.personal < cal.brier.fixed ? "Your personal pattern predicts your starts better than the general rule." : "It does not beat the general rule yet. More follow-ups will help."}</p>
              <p className="text-xs text-muted-foreground">Based on only {cal.n} check-ins, so treat it as a hint until you have 30 or more.</p>
            </>
          )}
          {hf && <p>{`Your last ${Math.min(5, history.length)} check-ins averaged ${hf.level.toFixed(2)}, ${hf.drift >= 0.03 ? "and you are trending up" : hf.drift <= -0.03 ? "and you are trending down" : "and you are steady"}${hf.unstable ? ". Low and bumpy right now, so be gentle with yourself and keep tasks small." : "."}`}</p>}
          {rt && <p>Answering twice within 10 minutes gave results about {rt.mad.toFixed(2)} apart.</p>}
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-3xl">
        <CardHeader><CardTitle className="text-lg">What blocks you</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!block ? <p className="text-muted-foreground">Needs at least 3 started and 3 not-started outcomes.</p> :
            block.map(b => <div key={b.key} className="flex justify-between"><span>{b.key}</span><span className="tabular-nums text-muted-foreground">{b.diff >= 0 ? "+" : ""}{b.diff.toFixed(2)} on start days</span></div>)}
          <p className="text-xs text-muted-foreground">Descriptive differences, not causes.</p>
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-3xl">
        <CardHeader><CardTitle className="text-lg">Best time of day</CardTitle></CardHeader>
        <CardContent className="h-48">
          <ResponsiveContainer><BarChart data={tod}><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="drive" fill="hsl(var(--primary))" /></BarChart></ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="glass border-0 rounded-3xl lg:col-span-2">
        <CardHeader><CardTitle className="text-lg">Your data</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">Everything is stored only in this browser. Nothing is uploaded.</p>
          <div className="flex gap-2"><Button variant="outline" onClick={download}>Export CSV</Button><Button variant="outline" onClick={() => confirm("Delete all check-ins?") && onClear()}>Delete all</Button></div>
          <div className="max-h-40 overflow-auto">{history.slice().reverse().map(x => <div key={x.id} className="flex justify-between border-b py-1"><span>{x.task} - {x.drive.toFixed(2)}{x.started !== undefined && (x.started ? " - started" : " - did not start")}</span><button className="text-xs text-muted-foreground" onClick={() => onDelete(x.id)}>remove</button></div>)}</div>
        </CardContent>
      </Card>
    </div></div>
  );
}
