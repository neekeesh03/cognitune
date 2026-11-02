import { useMemo, useState } from "react";
import { Card, Help, Saved, Screen, type MindProps } from "@/components/mind/MindParts";
import { currentReading, snapshot, loadRecs, researchOn, setResearchOn, shareOn, setShareOn, deleteResearch, shareNow } from "@/engine/researchStore";
import { analyse, toCsv, PROTOCOL } from "@/engine/lagun";
import { FORCE, fc } from "@/engine/forces";
import { VAR_KEYS, DEFAULT_THRESHOLDS, type VarKey } from "@/engine/model";
import type { MindView } from "@/engine/mind";

const ghost = "rounded-full border border-border px-4 py-2 text-sm"; const prim = "rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground";
const HOW: Record<VarKey, { tools: { view: MindView; label: string }[]; from: string }> = {
  Primode: { tools: [{ view: "typeflow", label: "Type flow" }, { view: "focustap", label: "Focus tap" }], from: "Delay before the first key, reaction speed, and how long you wait before you begin (initiation latency), against your usual." },
  CAP: { tools: [{ view: "moodmap", label: "Mood map" }, { view: "heart", label: "Heart check" }, { view: "stroop", label: "Colour clash" }], from: "Deadline pressure, energy on the mood map, heart rate, typing burst speed, and slower answers on your own task words (emotional Stroop)." },
  Flexion: { tools: [{ view: "switch", label: "Rule switch" }, { view: "trace", label: "Trace" }, { view: "typeflow", label: "Type flow" }], from: "Rule-switch cost, movement smoothness, typing rhythm fluency, energy at this time of day, and how often you finish what you start." },
  Anchory: { tools: [{ view: "stroop", label: "Colour clash" }, { view: "recall", label: "Pattern recall" }, { view: "holdback", label: "Hold back" }, { view: "eyes", label: "Eye check" }, { view: "trace", label: "Trace" }], from: "Stroop clash cost, memory span, holding back, eyes open, staying on the dot, long typing pauses, and tab switching." },
  Grain: { tools: [{ view: "typeflow", label: "Type flow" }, { view: "heart", label: "Heart check" }, { view: "hand", label: "Steady hand" }], from: "Typing hesitation, corrections and the delay to resume after a pause, low heart variability, hand shake, low mood, latent load, and slow starts." },
  Slip: { tools: [{ view: "typeflow", label: "Type flow" }, { view: "focustap", label: "Focus tap" }, { view: "trace", label: "Trace" }], from: "The slow tail and wobble of key gaps and reaction times (ex-Gaussian tau, variability, entropy), movement wobble, missed greens, mood swings, and irregular start times." },
};
const HYP = [
  "H1. Once your usual start hour is accounted for, a higher measured Drive goes with a higher chance of starting in the next 3 hours (the Drive adds predictive value).",
  "H2. Direction: higher Grain and Slip go with fewer starts; higher Anchory, Primode and CAP go with more. Exploratory, no single force is tested alone.",
  "H3. The measured Drive is stable enough, within a person, to compare day to day (at least 3 of the 6 forces measured).",
  "H4. Convergence: signals assigned to the same force agree with each other more than with signals assigned to other forces (to be checked across people once enough data exists).",
];
const DICT: [string, string][] = [
  ["primode, cap, flexion, anchory, grain, slip", "The six Drive inputs from 0 to 1. 0.5 means your usual or not measured. Built from your own readings (see the mapping)."],
  ["protocol", "Method version. v2 adds typing, rule switching, Stroop, tracing, reaction-time distribution (ex-Gaussian), tab switching, latent load and finishing rate. Each signal carries a reliability weight when combined."],
  ["coverage", "Share of the six forces that had at least one measurement (0 to 1). Readings under 0.5 are left out of the analysis."],
  ["drive_paper", "Lagun's Law in the published form: Primode^CAP x Flexion / (Anchory + Grain) + Slip, with Primode and Flexion lifted off zero."],
  ["drive_core", "The app's LTA v1 form with latent load: Primode x CAP x Flexion / (Anchory + Grain) + Slip."],
  ["p_usual_hour", "Chance of starting in a 3-hour window from your own start pattern only. The comparison to beat."],
  ["p_lagun", "That chance nudged by the Drive reading. Saved before the outcome is known."],
  ["started_within_3h", "1 if a real start was logged in the 3 hours after the reading, otherwise 0. Filled in once 3 hours have passed."],
  ["raw_*", "The measurements behind the forces, such as reaction_ms, reaction_tau_ms, reaction_cv, lapses, holdback_errors_pct, recall_span, eyes_closed_pct, heart_rate, hrv_ms, hand_shake, type_wpm, type_first_key_ms, type_cv, type_tau_ms, type_entropy, type_pauses, type_hesitation, type_resume_ms, switch_cost_ms, stroop_clash_ms, stroop_task_words_ms, trace_error, trace_noise_px, trace_smoothness, tab_switches_30m, tab_entropy, latent_load, dropout_rate, energy, mood, mood_sd_7d, start_wait_min, start_hour_spread, start_hour_rate, deadline, load."],
];
const download = (name: string, text: string, type: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

export function LagunLab({ back, go, done }: MindProps) {
  const [tick, setTick] = useState(0); const [msg, setMsg] = useState(""); const [confirmDel, setConfirmDel] = useState(false);
  const reading = useMemo(() => currentReading(), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = researchOn(), share = shareOn(); const recs = useMemo(() => loadRecs(), [tick, on]); // eslint-disable-line react-hooks/exhaustive-deps
  const an = useMemo(() => analyse(recs), [recs]); const m = reading?.measured;
  const drive = reading ? reading.driveCore : null; const verdict = drive == null ? null : drive > DEFAULT_THRESHOLDS.ready ? "Ready" : drive > DEFAULT_THRESHOLDS.borderline ? "Almost there" : "Not yet";
  const missing = m ? VAR_KEYS.filter(k => !m.parts.some(p => p.v === k)) : [...VAR_KEYS];
  const inc = an.inc; const ci = inc.beta != null && inc.se != null ? [inc.beta - 1.96 * inc.se, inc.beta + 1.96 * inc.se] : null;
  return (
    <Screen title="Lagun's Law, measured" sub="The six forces behind starting, read from your typing, games, camera and sensors. No sliders, no questions." back={back} credit={"Experimental research tool, not a diagnosis. Method version " + PROTOCOL + ". Each signal is compared with your own earlier readings, so a number means better or worse than your usual. All data stays on this device unless you choose to share it."}>
      <Card className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your six forces right now</div>
        {!m ? <p className="text-sm">Not enough has been measured yet. Play a game or two and tap the mood map, then come back. Three of the six forces are enough to start.</p> : null}
        {VAR_KEYS.map(k => { const ps = m ? m.parts.filter(p => p.v === k) : []; const val = m ? m.inputs[k] : 0.5; return (
          <div key={k} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm"><span><b>{FORCE[k].title}</b> <span className="text-xs text-muted-foreground">({k})</span></span><span className="text-xs text-muted-foreground">{ps.length ? Math.round(val * 100) + " of 100" : "not measured yet"}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full transition-all" style={{ width: (ps.length ? val * 100 : 0) + "%", background: fc(FORCE[k].color) }} /></div>
            <div className="text-[11px] text-muted-foreground">{ps.length ? "From: " + ps.map(p => p.label).join(", ") : HOW[k].from}</div>
          </div>); })}
        <Help>Around 50 means about your usual. For Heaviness and Mind wandering, lower is lighter. For the others, higher is better. Readings older than a day and a half are not used.</Help>
        {missing.length > 0 && m && <div className="space-y-1"><div className="text-xs font-medium">To measure the rest:</div><div className="flex flex-wrap gap-2">{Array.from(new Map(missing.flatMap(k => HOW[k].tools).map(t => [t.view, t])).values()).slice(0, 5).map(t => <button key={t.view} onClick={() => go(t.view)} className={ghost}>{t.label}</button>)}</div></div>}
      </Card>

      {reading && drive != null && <Card className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Drive reading (experimental)</div>
        <div className="flex items-baseline gap-3"><div className="text-3xl font-semibold tabular-nums">{drive.toFixed(2)}</div><div className="text-lg">{verdict}</div></div>
        <p className="text-sm text-muted-foreground">Likely range {reading.band.lo.toFixed(2)} to {reading.band.hi.toFixed(2)} · {Math.round(reading.band.pReady * 100)}% chance this is in the ready zone, allowing for measurement error. {m && m.coverage < 0.67 ? "Only " + Math.round(m.coverage * 6) + " of 6 forces are measured, so treat it loosely." : ""}</p>
        <Help>Published form of the equation gives {reading.drivePaper.toFixed(2)}. Both use the same six inputs. Cut-offs are the app's defaults, not diagnoses.</Help>
      </Card>}

      <Card className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Research mode</div>
        <p className="text-sm">Turn this on to build a real dataset about you: every 3 hours you open the app, it saves the six forces and the measurements behind them, and later whether you started. Nothing is typed, and no task names or text are saved. This is how the equation gets tested honestly, by predicting first and checking after.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} onChange={e => { setResearchOn(e.target.checked); if (e.target.checked) { snapshot(); done("lagun"); } setTick(t => t + 1); }} />Save my readings on this device</label>
        {on && <>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={share} onChange={e => { setShareOn(e.target.checked); setTick(t => t + 1); if (e.target.checked) shareNow().then(n => setMsg(n ? n + " readings shared. Thank you." : "")).catch(() => setMsg("Could not reach the server. I will try again later.")); }} /><span>Also share them anonymously for research. Only numbers go, under a random code that is not linked to your account. You must be 16 or older. You can stop any time, but because the code is not linked to you, shared rows cannot be found and removed later.</span></label>
          {msg && <Saved text={msg} />}
          <div className="text-sm"><b>{recs.length}</b> readings saved · <b>{an.withOutcome}</b> checked against what you did{recs.length ? " · last saved " + new Date(recs[recs.length - 1].t).toLocaleString() : ""}</div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: Math.min(100, (an.withOutcome / an.need) * 100) + "%" }} /></div>
          <Help>About {an.need} checked readings are needed before the test below means anything. Play the games on most days and use the app in different parts of the day.</Help>
        </>}
      </Card>

      {on && <Card className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Does the equation add anything?</div>
        {an.verdict === "collecting" ? <p className="text-sm">Still collecting. No claim yet.</p> : <>
          <div className="text-lg font-semibold">{an.verdict === "ahead" ? "Yes, so far: it adds to your usual-hour chance" : an.verdict === "behind" ? "So far it points the wrong way" : "No clear difference yet"}</div>
          <p className="text-sm">Strength of the extra effect: {inc.beta!.toFixed(2)}{ci ? " (95% range " + ci[0].toFixed(2) + " to " + ci[1].toFixed(2) + ")" : ""}. Test statistic {inc.lr!.toFixed(1)} (above 3.84 is unlikely by chance). Readings from the same day are not independent, so treat this as approximate.</p>
          <p className="text-sm text-muted-foreground">Comparison on the same readings: error of the Drive-based chance {an.brierL!.toFixed(3)}, usual hour only {an.brierB!.toFixed(3)}, plain average {an.brierC!.toFixed(3)} (lower is better).</p></>}
        {an.withOutcome >= 15 && <div className="space-y-0.5"><div className="text-xs font-medium">Each force against starting (rank correlation, exploratory)</div>{an.perVar.map(p => <div key={p.v} className="flex items-center gap-2 text-xs"><span className="w-24 shrink-0">{FORCE[p.v].title}</span><div className="relative h-1.5 flex-1 rounded-full bg-secondary"><div className="absolute top-0 h-full rounded-full bg-primary" style={{ left: p.rho == null ? "50%" : p.rho >= 0 ? "50%" : 50 + p.rho * 50 + "%", width: p.rho == null ? 0 : Math.abs(p.rho) * 50 + "%" }} /></div><span className="w-10 text-end tabular-nums text-muted-foreground">{p.rho == null ? "-" : p.rho.toFixed(2)}</span></div>)}</div>}
        <Help>Honest limit: this is one person, so it can show a pattern for you, not a law for everyone. A real test needs many people, which is what sharing is for.</Help>
      </Card>}

      {on && recs.length > 0 && <Card className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your data</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => download("lagomo-research.csv", toCsv(recs), "text/csv")} className={ghost}>Download CSV</button>
          <button onClick={() => download("lagomo-research.json", JSON.stringify({ protocol: PROTOCOL, exported: new Date().toISOString(), hypotheses: HYP, dictionary: Object.fromEntries(DICT), records: recs }, null, 1), "application/json")} className={ghost}>Download JSON</button>
          {!confirmDel ? <button onClick={() => setConfirmDel(true)} className={ghost}>Delete research data</button> : <button onClick={() => { deleteResearch(); setConfirmDel(false); setTick(t => t + 1); }} className={prim}>Yes, delete it from this device</button>}
        </div>
        <Help>Deleting removes everything saved here and turns research mode off. Anything you already shared anonymously cannot be linked back to you, so it stays.</Help>
      </Card>}

      <Card>
        <details><summary className="cursor-pointer text-sm font-semibold">Protocol: what was decided before any data</summary>
          <div className="mt-2 space-y-3 text-sm">
            <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hypotheses</div><ul className="mt-1 list-disc space-y-1 ps-5">{HYP.map(h => <li key={h}>{h}</li>)}</ul></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How each force is measured</div><ul className="mt-1 space-y-1">{VAR_KEYS.map(k => <li key={k}><b>{k}</b>: {HOW[k].from}</li>)}</ul></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outcome and test</div><p className="mt-1">A start counts when you press Start and begin a real two-minute step in the 3 hours after the reading. The test asks whether the Drive adds to the chance predicted by your own start hours alone, using a logistic model with your usual-hour chance as a fixed offset and the Drive, minus your own median, as the predictor. The Drive never includes the usual-hour chance, so it cannot look predictive for that reason. Readings with fewer than 3 forces measured are left out.</p></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where the measures come from</div><p className="mt-1">The proxies follow the Lagun papers: initiation latency, arousal, task fluidity, continuous attention, resistance and performance variability (IJSRA Table 7); typing dynamics, cursor smoothness, RT deviation and trajectory noise from the VIRELICH matrix (Table 8); tab-switch entropy and latent load, the emotional Stroop and interrupt-resumption paradigms (LTA Tables 12 and 14); and RT entropy, task-switching and hesitation from the CTT table. Those needing lab equipment (EEG, skin conductance, pupillometry, eye tracking) are not used. Each signal is converted to a personal score (0.5 is your usual) and combined with a reliability weight. These choices are a pre-specified protocol, not a validated instrument.</p></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Checked on simulated people</div><p className="mt-1">On 60 simulated people over 45 days where the equation truly drove starting, the pipeline recovered the effect (it estimated 1.17 where the truth was 1.5, as measurement noise weakens it). With no true effect it found none in 20 of 20 repeat runs. This tests the plumbing, not the theory.</p></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data dictionary</div><dl className="mt-1 space-y-1">{DICT.map(([k, v]) => <div key={k}><dt className="font-mono text-xs">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>)}</dl></div>
          </div>
        </details>
      </Card>
    </Screen>
  );
}
