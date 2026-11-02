import { TLX_DIMS, WHEEL, avg, energyMap, sleepAdvice, sleepSummary, TMT_LEVERS, pmRank, tlxLoads } from "@/engine/mind";
import { loadLog } from "@/lib/startlog";
import { dayKeyOf } from "@/engine/pattern";
import { Card, Help, Screen, Spark, type MindProps } from "@/components/mind/MindParts";

const W = 7 * 864e5;
/** Everything Mind has recorded, joined with your real starts. Plain statements; correlations are labelled as such. */
export function Report({ mind, back, go }: MindProps) {
  const now = Date.now(); const wk = <T extends { ts: number }>(a: T[]) => a.filter(x => now - x.ts < W);
  const who = mind.checks.filter(c => c.id === "who5"); const phq = mind.checks.filter(c => c.id === "phq9"); const gad = mind.checks.filter(c => c.id === "gad7");
  const tl = wk(mind.tlx); const th = mind.thoughts.filter(t => now - t.ts < 28 * 864e5); const calm = mind.calm.filter(c => c.before != null && c.after != null);
  const starts = loadLog().starts; const startDays = new Map<string, number>(); starts.forEach(s => startDays.set(dayKeyOf(s.ts), (startDays.get(dayKeyOf(s.ts)) ?? 0) + 1));
  const days28 = Array.from({ length: 28 }, (_, i) => dayKeyOf(now - i * 864e5));
  const relate = (has: (k: string) => boolean) => { const a = days28.filter(has), b = days28.filter(k => !has(k)); return a.length >= 3 && b.length >= 3 ? { a: avg(a.map(k => startDays.get(k) ?? 0)), b: avg(b.map(k => startDays.get(k) ?? 0)), n: a.length } : null; };
  const woopDays = new Set(mind.woop.map(w => dayKeyOf(w.ts))), windDays = new Set(mind.wind.map(w => dayKeyOf(w.ts)));
  const prevDay = (k: string) => dayKeyOf(new Date(k + "T12:00:00").getTime() - 864e5);
  const woopLink = relate(k => woopDays.has(k)); const windLink = relate(k => windDays.has(prevDay(k)));
  const rows: { t: string; body: React.ReactNode }[] = [];
  if (who.length) { const l = who[who.length - 1].score * 4, f = who[0].score * 4; rows.push({ t: "Wellbeing (WHO-5)", body: <div className="flex items-center justify-between gap-2"><span className="text-sm">{l}%{who.length > 1 && <span className="text-muted-foreground"> · {l - f >= 0 ? "+" : ""}{l - f} since your first</span>}</span><Spark values={who.slice(-8).map(c => c.score * 4)} min={0} max={100} /></div> }); }
  if (phq.length > 1) rows.push({ t: "Mood (PHQ-9)", body: <div className="flex items-center justify-between"><span className="text-sm">{phq[phq.length - 1].score} of 27</span><Spark values={phq.slice(-8).map(c => c.score)} min={0} max={27} good="low" /></div> });
  if (gad.length > 1) rows.push({ t: "Worry (GAD-7)", body: <div className="flex items-center justify-between"><span className="text-sm">{gad[gad.length - 1].score} of 21</span><Spark values={gad.slice(-8).map(c => c.score)} min={0} max={21} good="low" /></div> });
  if (tl.length) { const sums = TLX_DIMS.map((_, i) => avg(tl.map(t => tlxLoads(t.v)[i]))); const i = sums.indexOf(Math.max(...sums)); rows.push({ t: "Task load this week", body: <p className="text-sm">{tl.length} check{tl.length > 1 ? "s" : ""}, average {avg(tl.map(t => t.raw))}/100. The heaviest part was <b>{TLX_DIMS[i].label.toLowerCase()}</b> ({sums[i]}/100).</p> }); }
  if (th.length) rows.push({ t: "Thoughts", body: <p className="text-sm">{th.length} worked on in 4 weeks. Belief in them dropped by <b>{avg(th.map(t => t.before - t.after))}</b> points on average.</p> });
  if (calm.length) rows.push({ t: "Calming", body: <p className="text-sm">{calm.length} practice{calm.length > 1 ? "s" : ""} with a before and after rating. You felt better afterwards in {calm.filter(c => (c.kind === "kind" ? c.after! < c.before! : c.after! > c.before!)).length} of them.</p> });
  const sl = sleepSummary(mind.sleep); if (sl) rows.push({ t: "Sleep (last 7 nights)", body: <p className="text-sm">{sl.tst} h average, efficiency {sl.se}%, wake-up varies about {sl.wakeSd} min. {sleepAdvice(sl)[0]}</p> });
  const em = energyMap(mind.pulse).filter(b => b.e != null && b.count >= 2).sort((a, z) => z.e! - a.e!)[0]; if (em) rows.push({ t: "Your best time of day", body: <p className="text-sm">Highest energy in the <b>{em.n.split(" (")[0].toLowerCase()}</b> ({em.e}/5 over {em.count} taps). Put hard tasks there.</p> });
  const tm = mind.tmt.slice(-5); if (tm.length >= 2) { const s = { e: avg(tm.map(h => h.e)), v: avg(tm.map(h => h.v)), d: 10 - avg(tm.map(h => h.d)), i: 10 - avg(tm.map(h => h.i)) }; const k = (Object.keys(s) as (keyof typeof s)[]).sort((a, b) => s[a] - s[b])[0]; rows.push({ t: "Why you avoid", body: <p className="text-sm">Across your last {tm.length} checks, the usual weak spot is <b>{TMT_LEVERS[k].name.toLowerCase()}</b>. {TMT_LEVERS[k].fix}</p> }); }
  const xs = mind.exps.filter(e => e.after != null); if (xs.length) rows.push({ t: "Worries you tested", body: <p className="text-sm">{xs.length} tested. Certainty fell by {avg(xs.map(e => e.before - e.after!))} points on average.</p> });
  const ur = mind.urges; if (ur.length >= 2) rows.push({ t: "Urges", body: <p className="text-sm">{ur.length} ridden. The pull fell by {avg(ur.map(u => u.start - u.end))} points on average.</p> });
  const best = pmRank(mind.pm).slice(0, 2); if (best.length) rows.push({ t: "What lifts you", body: <p className="text-sm">{best.map(b => `${b.what} (pleasure ${b.p}, mastery ${b.m})`).join(" and ")}</p> });
  const wheel = mind.wheel; if (wheel.length > 1) { const a = wheel[wheel.length - 1].v, b = wheel[wheel.length - 2].v; const d = a.map((x, i) => x - b[i]); const up = d.indexOf(Math.max(...d)), dn = d.indexOf(Math.min(...d)); rows.push({ t: "Wheel since last time", body: <p className="text-sm">{d[up] > 0 ? `Up most: ${WHEEL[up].label} (+${d[up]}). ` : ""}{d[dn] < 0 ? `Down most: ${WHEEL[dn].label} (${d[dn]}).` : ""}{d[up] <= 0 && d[dn] >= 0 ? "Steady." : ""}</p> }); }
  return (
    <Screen title="Mind report" sub="What your own data says. Links below are correlations, not proof of cause." back={back}>
      {rows.length === 0 ? <Card><p className="text-sm">Nothing here yet. Try one check or exercise and this page fills in.</p><div className="mt-2 flex gap-2"><button onClick={() => go("checks")} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Wellbeing check</button><button onClick={() => go("tlx")} className="rounded-full border border-border px-4 py-2 text-sm">Task load</button></div></Card> :
        rows.map(r => <Card key={r.t}><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{r.t}</div>{r.body}</Card>)}
      {(woopLink || windLink) && <Card><div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Connections to your starts (last 28 days)</div>
        {woopLink && <p className="text-sm">On days you made a WOOP plan you started <b>{woopLink.a}</b> times, against <b>{woopLink.b}</b> on other days.</p>}
        {windLink && <p className="mt-1 text-sm">After a night you did Wind-down, the next day had <b>{windLink.a}</b> starts, against <b>{windLink.b}</b> otherwise.</p>}
        <Help>Small samples and many things change from day to day. Treat these as hints to test, not conclusions.</Help></Card>}
    </Screen>
  );
}
