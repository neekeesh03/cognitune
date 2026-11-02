import { useEffect, useRef, useState } from "react";
import { Card, Help, Screen, type MindProps } from "@/components/mind/MindParts";
import { analysePpg, type PpgResult } from "@/engine/ppg";
import { gameStore, saveGame } from "@/engine/games";

const ghost = "rounded-full border border-border px-4 py-2 text-sm"; const DUR = 45;
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Heart check: fingertip over the camera. Video never leaves the phone and is never saved. */
export function HeartCheck({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "ask" | "run" | "end">("idle"); const [secs, setSecs] = useState(0); const [covered, setCovered] = useState(false); const [err, setErr] = useState(""); const [res, setRes] = useState<PpgResult | null>(null);
  const vid = useRef<HTMLVideoElement>(null); const wave = useRef<HTMLCanvasElement>(null); const stream = useRef<MediaStream | null>(null); const loop = useRef<number>(); const prior = useRef(gameStore("heart"));
  const stop = () => { if (loop.current) window.clearInterval(loop.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => stop, []);
  const begin = async () => {
    setErr(""); setPhase("ask");
    if (!navigator.mediaDevices?.getUserMedia) { setErr("This browser cannot use the camera here."); setPhase("idle"); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }, audio: false }); stream.current = s;
      const tr = s.getVideoTracks()[0]; try { await tr.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] }); } catch { /* no torch: bright room light also works */ }
      const v = vid.current!; v.srcObject = s; await v.play();
      const c = document.createElement("canvas"); c.width = 24; c.height = 24; const g = c.getContext("2d", { willReadFrequently: true })!;
      const T: number[] = [], V: number[] = [], disp: number[] = []; const t0 = performance.now(); setPhase("run");
      loop.current = window.setInterval(() => {
        const now = performance.now() - t0; g.drawImage(v, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data; let r = 0, gr = 0, bl = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; bl += d[i + 2]; } const n = d.length / 4; r /= n; gr /= n; bl /= n;
        const cov = r > 90 && r > 1.6 * (gr + bl) / 2; setCovered(cov);
        if (cov && now > 4000) { T.push(now); V.push(r); disp.push(r); if (disp.length > 150) disp.shift(); }
        const cv = wave.current; if (cv && disp.length > 5) { const x = cv.getContext("2d")!; x.clearRect(0, 0, cv.width, cv.height); const mn = Math.min(...disp), mx = Math.max(...disp) || 1; x.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary") ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()})` : "#447d58"; x.lineWidth = 2; x.beginPath(); disp.forEach((p, i) => { const px = (i / 150) * cv.width, py = cv.height - ((p - mn) / (mx - mn || 1)) * (cv.height - 8) - 4; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); }
        setSecs(Math.min(DUR, Math.round(now / 1000)));
        if (now >= DUR * 1000) { stop(); const out = analysePpg(T, V); setRes(out); setPhase("end"); if (out.ok) { saveGame("heart", { ts: Date.now(), a: out.hr, b: out.rmssd, c: out.quality }); done("heart"); } }
      }, 33);
    } catch { stop(); setErr("I could not open the camera. Allow camera access in your browser, or skip this one. Nothing else in the app needs it."); setPhase("idle"); }
  };
  const base = prior.current.length >= 3 ? median(prior.current.slice(-15).map(g => g.b)) : null; const bhr = prior.current.length >= 3 ? median(prior.current.slice(-15).map(g => g.a)) : null;
  const verdict = res?.ok && base ? (res.rmssd < base * 0.75 ? "low" : res.rmssd > base * 1.25 ? "high" : "usual") : null;
  return (
    <Screen title="Heart check" sub="Rest a fingertip on the back camera for 45 seconds. Your pulse shows how wound up or settled your body is." back={back} credit="Method: photoplethysmography (the camera sees blood move in your fingertip). Heart rate variability (RMSSD) tends to be lower when the body is under strain and higher when settled. Phone cameras are good for heart rate and rougher for variability, so the numbers are only meaningful against your own usual, taken at the same time and posture. This is not a medical device. The camera feed stays on your phone and is never saved or sent.">
      <Card className="flex flex-col items-center gap-3">
        <video ref={vid} playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />
        {phase === "idle" && <><p className="text-sm">Sit still, rest your hand on a table. Cover the back camera (and the flash, if there is one) fully with your fingertip. Press lightly.</p><button onClick={begin} className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Start (allow camera)</button></>}
        {phase === "ask" && <p className="text-sm text-muted-foreground">Opening the camera...</p>}
        {phase === "run" && <><div className="text-3xl font-semibold tabular-nums">{Math.max(0, DUR - secs)}s</div>
          <canvas ref={wave} width={300} height={70} className="w-full max-w-sm rounded-2xl bg-secondary/40" aria-label="Your pulse wave" />
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(secs / DUR) * 100}%` }} /></div>
          <p className="text-sm text-muted-foreground" role="status">{!covered ? "Cover the camera fully with your fingertip." : secs < 4 ? "Settling..." : "Good. Keep still and breathe normally."}</p></>}
        {err && <p className="text-sm text-[hsl(var(--v-notready))]" role="alert">{err}</p>}
      </Card>
      {res && (res.ok ? <Card className="space-y-2"><div className="flex flex-wrap gap-6"><div><div className="text-3xl font-semibold">{res.hr}</div><div className="text-xs text-muted-foreground">beats per minute</div></div><div><div className="text-3xl font-semibold">{res.rmssd}</div><div className="text-xs text-muted-foreground">variability (ms)</div></div></div>
        {verdict === "low" && <p className="text-sm">Your variability is lower than your usual ({Math.round(base!)}). Your body looks a bit more strained than normal. It is information, not a verdict. Slow breathing is a quick way to nudge it back.</p>}
        {verdict === "high" && <p className="text-sm">Higher than your usual ({Math.round(base!)}): your body looks settled and ready.</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({Math.round(base!)} ms, resting rate near {Math.round(bhr!)}).</p>}
        {!base && <Help>After 3 checks on different days it compares you with your own usual. Try to take it at the same time of day.</Help>}
        <Help>Clean beats used: {res.beats}. Signal quality: {res.quality}%. If you just walked, drank coffee or are anxious, expect a higher rate.</Help>
        <div className="flex flex-wrap gap-2"><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Again</button>{verdict === "low" && <button onClick={() => go("breathe")} className={ghost}>Slow breathing</button>}</div></Card>
        : <Card className="space-y-2"><p className="text-sm">{res.reason}</p><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Try again</button></Card>)}
    </Screen>
  );
}
