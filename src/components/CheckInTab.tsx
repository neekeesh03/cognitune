import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { assessmentQuestions } from "@/data/questions";
import { Inputs, VAR_KEYS, VarKey, coreDrive, uncertainty, diagnose, levers, verdictOf, withDeadline, stability, DEFAULT_THRESHOLDS } from "@/engine/model";
import { LEVER_MOVES, MODE_MOVES } from "@/engine/interventions";
import { CheckIn, calibrate } from "@/engine/analytics";
import { Profile, blendInputs } from "@/engine/profile";
import { FORCE, VERDICT_STYLE, fc } from "@/engine/forces";
import { Orb } from "@/components/Orb";
import { FocusTimer } from "@/components/FocusTimer";

type Phase = "intro" | "asking" | "result";
interface Props { history: CheckIn[]; profile: Profile; onSave: (c: CheckIn) => string | void; onStarted: (id: string) => void; onDone?: () => void }

export function CheckInTab({ history, profile, onSave, onStarted, onDone }: Props) {
  const [useJournalData, setUseJournalData] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [task, setTask] = useState("");
  const [hours, setHours] = useState("");
  const [vals, setVals] = useState<Inputs>({ Primode: 0.5, CAP: 0.5, Flexion: 0.5, Anchory: 0.5, Grain: 0.5, Slip: 0.5 });
  const [savedId, setSavedId] = useState<string | null>(null);
  const [timer, setTimer] = useState(false);
  const [tune, setTune] = useState(false);
  const busy = useRef(false);

  const hoursNum = hours.trim() === "" || isNaN(Number(hours)) ? null : Number(hours);
  const { blended, shifts } = useMemo(() => blendInputs(vals, profile), [vals, profile]);
  const active = useJournalData && profile.blendWeight > 0.02;
  const selfOnlyDrive = useMemo(() => coreDrive(withDeadline(vals, hoursNum)).drive, [vals, hoursNum]);
  const eff = useMemo(() => withDeadline(active ? blended : vals, hoursNum), [vals, blended, active, hoursNum]);
  const core = coreDrive(eff);
  const cal = useMemo(() => calibrate(history), [history]);
  const thr = cal.ready && cal.threshold != null ? { ready: cal.threshold + 0.2, borderline: cal.threshold - 0.2 } : DEFAULT_THRESHOLDS;
  const u = useMemo(() => uncertainty(eff, 0.1, 600, thr.ready, thr.borderline), [eff, thr.ready, thr.borderline]);
  const v = verdictOf(u.median, thr);
  const vs = VERDICT_STYLE[v];
  const modes = diagnose(eff, core);
  const lv = levers(eff);
  const top = lv.find(l => l.gain > 0) ?? lv[0];
  const move = modes[0] ? MODE_MOVES[modes[0].id] : LEVER_MOVES[top.key][0];

  useEffect(() => { if (phase === "result" && !savedId) {
    const id = crypto.randomUUID();
    onSave({ id, ts: Date.now(), task: task || "Untitled", context: "", hoursToDeadline: hoursNum, inputs: vals, drive: coreDrive(vals).drive, effectiveDrive: core.drive, pReady: u.pReady });
    setSavedId(id);
  } }, [phase]); // eslint-disable-line

  const key = VAR_KEYS[step] as VarKey;
  const opts = [...assessmentQuestions[key].options].sort((a, b) => b.value - a.value);
  const choose = (value: number) => {
    if (busy.current) return; busy.current = true;
    setVals(p => ({ ...p, [key]: value }));
    setTimeout(() => { busy.current = false; step < VAR_KEYS.length - 1 ? setStep(step + 1) : setPhase("result"); }, 380);
  };
  const reset = () => { setPhase("intro"); setStep(0); setSavedId(null); setTune(false); setTask(""); setHours(""); };

  if (phase === "intro") return (
    <div className="animate-rise mx-auto max-w-xl text-center">
      <Orb drive={0.55} color="var(--primary)" size={260} idle />
      <h1 className="mt-6 text-5xl leading-tight">How ready are you,<br /><em className="text-primary">really?</em></h1>
      <p className="mx-auto mt-4 max-w-md text-muted-foreground">Six quick taps. I will tell you how ready you are to start, what is in the way, and one small thing to try.</p>
      <div className="glass mx-auto mt-8 max-w-md space-y-3 rounded-3xl p-4 text-left">
        <Input className="h-12 rounded-2xl bg-secondary/60 text-base" placeholder="What are you about to do?" value={task} onChange={e => setTask(e.target.value)} />
        <Input className="h-12 rounded-2xl bg-secondary/60" placeholder="Hours until deadline (optional)" inputMode="decimal" value={hours} onChange={e => setHours(e.target.value)} />
        <Button variant="hero" size="lg" className="h-12 w-full rounded-2xl text-base" onClick={() => setPhase("asking")}><Sparkles className="mr-2 h-4 w-4" />Start check-in</Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Private by design. Everything stays in your browser.</p>
    </div>
  );

  if (phase === "asking") {
    const F = FORCE[key], Icon = F.icon;
    return (
      <div key={key} className="animate-rise mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <button aria-label="Back" onClick={() => (step === 0 ? setPhase("intro") : setStep(step - 1))} className="rounded-full p-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
          <div className="flex flex-1 gap-1.5">{VAR_KEYS.map((k, i) => <div key={k} className="h-1.5 flex-1 rounded-full transition-all" style={{ background: i <= step ? fc(FORCE[k].color) : "hsl(var(--foreground) / .1)" }} />)}</div>
        </div>
        <div className="mb-3 flex items-center gap-2 text-sm uppercase tracking-[0.2em]" style={{ color: fc(F.color) }}><Icon className="h-4 w-4" />{F.title} </div>
        <h2 className="mb-3 text-4xl leading-tight">{assessmentQuestions[key].text}</h2>
        <p className="mb-6 h-5 text-sm text-muted-foreground">{profile.levels[key] && profile.levels[key]!.n >= 3 ? `From your writing: this has felt ${profile.levels[key]!.value > 0.6 ? "high" : profile.levels[key]!.value < 0.4 ? "low" : "middling"} lately.` : ""}</p>
        <div className="grid gap-3">
          {opts.map(o => {
            const sel = Math.abs(vals[key] - o.value) < 1e-6 && busy.current;
            return (
              <button key={o.key} onClick={() => choose(o.value)} className="glass group flex items-center justify-between rounded-2xl px-5 py-4 text-left text-lg transition hover:scale-[1.015] hover:border-primary/60 active:scale-[.99]" style={sel ? { borderColor: fc(F.color) } : undefined}>
                <span>{o.label}</span>
                <span className="h-2 w-16 overflow-hidden rounded-full bg-foreground/10"><span className="block h-full rounded-full" style={{ width: `${o.value * 100}%`, background: fc(F.color) }} /></span>
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{step + 1} of {VAR_KEYS.length}</p>
      </div>
    );
  }

  return (
    <div className="animate-rise mx-auto max-w-3xl space-y-6">
      {timer && <FocusTimer color={vs.color} task={task} onStarted={() => savedId && onStarted(savedId)} onDone={onDone} onClose={() => setTimer(false)} />}
      <div className="text-center">
        <Orb drive={core.drive} color={vs.color} size={300} thresholds={thr} label={core.drive.toFixed(2)} sub="Start power" />
        <h1 className="mt-4 text-5xl" style={{ color: `hsl(${vs.color})` }}>{vs.headline}</h1>
        <p className="mt-2 text-muted-foreground">{vs.sub}</p>
        <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">{Math.round(u.pReady * 100)}% sure you are ready. Your start power is probably between {u.lo.toFixed(2)} and {u.hi.toFixed(2)}. Steadiness {Math.round(stability(eff) * 100)} out of 100.{hoursNum != null && " The deadline is giving you a push."}</p>
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Do this now</div>
        <h3 className="font-display text-3xl">{move.title}</h3>
        <p className="mt-1 text-muted-foreground">{move.how}</p>
        <Button variant="hero" size="lg" className="mt-4 h-12 w-full rounded-2xl text-base" onClick={() => setTimer(true)}><Play className="mr-2 h-4 w-4" />Start a 2-minute warm-up</Button>
      </div>

      {profile.blendWeight > 0.02 && (
        <div className="glass rounded-3xl p-5">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tuned to you</span>
            <button onClick={() => setUseJournalData(!useJournalData)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{useJournalData ? "Use taps only" : "Use journal too"}</button></div>
          <p className="text-sm text-muted-foreground">From your taps alone, your start power is {selfOnlyDrive.toFixed(2)}. Adding what you have written (it counts for up to {Math.round(profile.blendWeight * 100)}%, and grows as I get to know you) makes it {coreDrive(withDeadline(blended, hoursNum)).drive.toFixed(2)}. {useJournalData ? "The tuned number is shown above." : "Only your taps are used above."}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{VAR_KEYS.filter(k => Math.abs(shifts[k] ?? 0) >= 0.02).map(k => <span key={k} className="rounded-full px-2.5 py-0.5 text-xs" style={{ background: fc(FORCE[k].color, 0.18), color: fc(FORCE[k].color) }}>{FORCE[k].title} {shifts[k]! > 0 ? "+" : ""}{shifts[k]!.toFixed(2)}</span>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Experimental: this reads word patterns in your writing, and it never counts for more than 30%.</p>
        </div>
      )}

      <div className="glass rounded-3xl p-5">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">What is shaping your start</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {VAR_KEYS.map(k => { const F = FORCE[k], I = F.icon, c = fc(F.color); return (
            <div key={k} className="flex items-center gap-3 rounded-2xl bg-foreground/[.05] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: fc(F.color, 0.18), color: c }}><I className="h-5 w-5" /></div>
              <div className="flex-1"><div className="flex justify-between text-sm"><span className="font-medium">{F.title}</span><span className="tabular-nums text-muted-foreground">{vals[k].toFixed(2)}</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-foreground/10"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${vals[k] * 100}%`, background: c }} /></div></div>
            </div>); })}
        </div>
      </div>

      {modes.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">What is going on</div>
          <div className="space-y-3">{modes.map(m => <div key={m.id}><div className="font-display text-2xl">{m.name}</div><p className="text-sm text-muted-foreground">{m.why}</p></div>)}</div>
        </div>
      )}

      <div className="glass rounded-3xl p-5">
        <div className="mb-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">What would help most</div>
        <div className="space-y-3">{lv.map(l => { const c = fc(FORCE[l.key].color); return (
          <div key={l.key} className="flex items-center gap-3 text-sm"><span className="w-16">{FORCE[l.key].title}</span>
            <div className="h-2 flex-1 rounded-full bg-foreground/10"><div className="h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, (Math.max(l.gain, 0) / Math.max(lv[0].gain, 0.01)) * 100))}%`, background: c }} /></div>
            <span className="w-24 text-right tabular-nums text-muted-foreground">{l.gain >= 0 ? "+" : ""}{l.gain.toFixed(2)}</span></div>); })}</div>
        <p className="mt-3 text-xs text-muted-foreground">These are estimates, not promises. A number below zero just means that changing that one thing will not help much right now.</p>
      </div>

      <div className="glass rounded-3xl p-5">
        <button className="flex w-full items-center justify-between text-left" onClick={() => setTune(!tune)}><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Adjust my answers</span><ChevronDown className={`h-4 w-4 transition ${tune ? "rotate-180" : ""}`} /></button>
        {tune && <div className="mt-4 space-y-4">{VAR_KEYS.map(k => <div key={k}><div className="flex justify-between text-sm"><span>{FORCE[k].title} <span className="text-muted-foreground">({k})</span></span><span className="tabular-nums text-muted-foreground">{vals[k].toFixed(2)}</span></div><Slider min={0} max={1} step={0.05} value={[vals[k]]} onValueChange={([x]) => setVals({ ...vals, [k]: x })} /></div>)}<p className="text-xs text-muted-foreground">The saved entry keeps your original answers.</p></div>}
      </div>

      <div className="text-center"><Button variant="ghost" className="rounded-full" onClick={reset}>New check-in</Button></div>
    </div>
  );
}
