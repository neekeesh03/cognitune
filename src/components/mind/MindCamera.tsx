import { useEffect, useRef, useState } from "react";
import { Card, Help, Screen, type MindProps } from "@/components/mind/MindParts";
import { analysePpg, type PpgResult } from "@/engine/ppg";
import { gameStore, saveGame } from "@/engine/games";
import { loadLandmarker, type Landmarker } from "@/lib/faceModel";

const ghost = "rounded-full border border-border px-4 py-2 text-sm"; const DUR = 45;
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/** Heart check: fingertip over the camera. Video never leaves the phone and is never saved. */
export function HeartCheck({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "ask" | "run" | "end">("idle"); const [secs, setSecs] = useState(0); const [covered, setCovered] = useState(false); const [err, setErr] = useState(""); const [res, setRes] = useState<PpgResult | null>(null); const [mode, setMode] = useState<"finger" | "face">(() => (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 ? "finger" : "face")); const modeRef = useRef(mode); modeRef.current = mode; const lmRef = useRef<Landmarker | null>(null); const [pace, setPace] = useState(false); const paceRef = useRef(false); paceRef.current = pace;
  const vid = useRef<HTMLVideoElement>(null); const wave = useRef<HTMLCanvasElement>(null); const stream = useRef<MediaStream | null>(null); const loop = useRef<number>(); const rafId = useRef(0); const prior = useRef(gameStore("heart")); const priorP = useRef(gameStore("heartp")); const priorF = useRef(gameStore("heartf"));
  const stop = () => { if (loop.current) window.clearInterval(loop.current); cancelAnimationFrame(rafId.current); lmRef.current?.close(); lmRef.current = null; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => stop, []);
  const drawWave = (disp: number[]) => { const cv = wave.current; if (!cv || disp.length < 6) return; const x = cv.getContext("2d")!; x.clearRect(0, 0, cv.width, cv.height); const mn = Math.min(...disp), mx = Math.max(...disp); x.strokeStyle = "hsl(" + getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() + ")"; x.lineWidth = 2; x.beginPath(); disp.forEach((p, i) => { const px = (i / 150) * cv.width, py = cv.height - ((p - mn) / (mx - mn || 1)) * (cv.height - 8) - 4; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.stroke(); };
  const faceRun = async () => {
    try {
      lmRef.current = await loadLandmarker();
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
      const v = vid.current!; v.srcObject = stream.current; await v.play();
      const W = v.videoWidth || 640, H = v.videoHeight || 480; const cn = document.createElement("canvas"); cn.width = W; cn.height = H; const g = cn.getContext("2d", { willReadFrequently: true })!;
      const T: number[] = [], V: number[] = [], disp: number[] = []; const t0 = performance.now(); let roi: { x: number; y: number; w: number; h: number } | null = null, n = 0, lastT = -1; setPhase("run");
      type Meta = { mediaTime: number; captureTime?: number }; const vv = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (n: number, m: Meta) => void) => number };
      const step = (_n?: number, meta?: Meta) => {
        if (!lmRef.current) return; const now = (meta?.captureTime ?? performance.now()) - t0;
        if (v.currentTime !== lastT && v.readyState >= 2) {
          lastT = v.currentTime; g.drawImage(v, 0, 0, W, H);
          if (n++ % 6 === 0) { const pts = lmRef.current.detectForVideo(v, performance.now()).faceLandmarks?.[0];
            if (pts) { const P = [108, 337, 9, 10].map(i => pts[i]); const x0 = Math.min(...P.map(p => p.x)) * W, x1 = Math.max(...P.map(p => p.x)) * W, y0 = Math.min(...P.map(p => p.y)) * H, y1 = Math.max(...P.map(p => p.y)) * H; const w = Math.max(8, Math.floor(x1 - x0)), h = Math.max(8, Math.floor(y1 - y0)); roi = { x: Math.max(0, Math.min(W - w, Math.floor(x0))), y: Math.max(0, Math.min(H - h, Math.floor(y0))), w, h }; } else roi = null; }
          if (roi) { const d = g.getImageData(roi.x, roi.y, roi.w, roi.h).data; let gr = 0; for (let i = 1; i < d.length; i += 4) gr += d[i]; gr /= d.length / 4; setCovered(true); if (now > 4000) { T.push(now); V.push(gr); disp.push(-gr); if (disp.length > 150) disp.shift(); } } else setCovered(false);
          drawWave(disp);
        }
        setSecs(Math.min(DUR, Math.round(now / 1000)));
        if (now >= DUR * 1000) { stop(); const out = analysePpg(T, V); setRes(out); setPhase("end"); if (out.ok && out.rmssd > 0) { saveGame("heartf", { ts: Date.now(), a: out.hr, b: out.rmssd, c: out.quality }); done("heart"); } return; }
        if (vv.requestVideoFrameCallback) vv.requestVideoFrameCallback(step); else rafId.current = requestAnimationFrame(step);
      };
      if (vv.requestVideoFrameCallback) vv.requestVideoFrameCallback(step); else rafId.current = requestAnimationFrame(step);
    } catch { stop(); setErr("I could not start the face version. It needs the camera and a one-time download of a small model (about 13 MB). Check your connection and camera permission, or skip this one."); setPhase("idle"); }
  };
  const begin = async () => {
    setErr(""); setPhase("ask");
    if (modeRef.current === "face") { await faceRun(); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setErr("This browser cannot use the camera here."); setPhase("idle"); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }, audio: false }); stream.current = s;
      const tr = s.getVideoTracks()[0]; try { await tr.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] }); } catch { /* no torch: bright room light also works */ }
      const v = vid.current!; v.srcObject = s; await v.play();
      const c = document.createElement("canvas"); c.width = 24; c.height = 24; const g = c.getContext("2d", { willReadFrequently: true })!;
      const T: number[] = [], V: number[] = [], disp: number[] = []; const t0 = performance.now(); setPhase("run");
      const tick = (tsMs: number) => {
        const now = tsMs - t0; g.drawImage(v, 0, 0, 24, 24); const d = g.getImageData(0, 0, 24, 24).data; let r = 0, gr = 0, bl = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; bl += d[i + 2]; } const n = d.length / 4; r /= n; gr /= n; bl /= n;
        const cov = r > 90 && r > 1.6 * (gr + bl) / 2; setCovered(cov);
        if (cov && now > 4000) { T.push(now); V.push(r); disp.push(r); if (disp.length > 150) disp.shift(); }
        const cv = wave.current; if (cv && disp.length > 5) { const x = cv.getContext("2d")!; x.clearRect(0, 0, cv.width, cv.height); const mn = Math.min(...disp), mx = Math.max(...disp) || 1; x.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--primary") ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()})` : "#447d58"; x.lineWidth = 2; x.beginPath(); disp.forEach((p, i) => { const px = (i / 150) * cv.width, py = cv.height - ((p - mn) / (mx - mn || 1)) * (cv.height - 8) - 4; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke(); }
        setSecs(Math.min(DUR, Math.round(now / 1000)));
        if (now >= DUR * 1000) { stop(); const out = analysePpg(T, V); setRes(out); setPhase("end"); if (out.ok && out.rmssd > 0) { saveGame(paceRef.current ? "heartp" : "heart", { ts: Date.now(), a: out.hr, b: out.rmssd, c: out.quality }); done("heart"); } }
      };
      type Meta = { mediaTime: number; captureTime?: number }; const vv = v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (n: number, m: Meta) => void) => number };
      if (vv.requestVideoFrameCallback) { let m0 = -1; const cbk = (_n: number, m: Meta) => { if (m0 < 0) m0 = m.mediaTime; tick(m.captureTime ?? t0 + (m.mediaTime - m0) * 1000); if (stream.current) vv.requestVideoFrameCallback!(cbk); }; vv.requestVideoFrameCallback(cbk); } else loop.current = window.setInterval(() => tick(performance.now()), 33);
    } catch { stop(); setErr("I could not open the camera. Allow camera access in your browser, or skip this one. Nothing else in the app needs it."); setPhase("idle"); }
  };
  const used = mode === "face" ? priorF : pace ? priorP : prior; const base = used.current.length >= 3 ? median(used.current.slice(-15).map(g => g.b)) : null; const bhr = used.current.length >= 3 ? median(used.current.slice(-15).map(g => g.a)) : null;
  const verdict = res?.ok && res.rmssd > 0 && base ? (res.rmssd < base * 0.75 ? "low" : res.rmssd > base * 1.25 ? "high" : "usual") : null;
  return (
    <Screen title="Heart check" sub="45 seconds with the camera on your fingertip or your face. Your pulse shows how wound up or settled your body is." back={back} credit="Method: photoplethysmography (the camera sees blood move in your fingertip). Heart rate variability (RMSSD) tends to be lower when the body is under strain and higher when settled. Face mode (remote photoplethysmography from the forehead) works best when you sit very still in even light and is the roughest of the two. Phone cameras are good for heart rate and rougher for variability, so the numbers are only meaningful against your own usual, taken at the same time and posture. This is not a medical device. The camera feed stays on your phone and is never saved or sent.">
      <Card className="flex flex-col items-center gap-3">
        <video ref={vid} playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />
        {phase === "idle" && <><div role="radiogroup" aria-label="How to measure" className="flex flex-wrap gap-2"><button role="radio" aria-checked={mode === "face"} onClick={() => setMode("face")} className={"rounded-full border px-3 py-1.5 text-sm " + (mode === "face" ? "border-primary bg-primary/10" : "border-border")}>My face (laptop)</button><button role="radio" aria-checked={mode === "finger"} onClick={() => setMode("finger")} className={"rounded-full border px-3 py-1.5 text-sm " + (mode === "finger" ? "border-primary bg-primary/10" : "border-border")}>Fingertip (phone, best)</button></div>{mode === "face" ? <p className="text-sm">Sit still facing the screen in good, even light (no strong lamp behind you). Keep your forehead visible, do not talk, and breathe normally. The camera reads tiny colour changes in your forehead skin as blood pulses. This is rougher than the fingertip version, and a first-time download of a small model (about 13 MB) happens.</p> : <p className="text-sm">Sit still, rest your hand on a table. Cover the back camera (and the flash, if there is one) fully with your fingertip. Press lightly.</p>}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pace} onChange={e => setPace(e.target.checked)} />Pace my breathing (6 breaths a minute)</label><Help>With pacing on, a circle guides slow breathing during the check. Slow breathing raises variability, so paced checks are compared with your other paced checks.</Help><button onClick={begin} className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Start (allow camera)</button></>}
        {phase === "ask" && <p className="text-sm text-muted-foreground">Opening the camera...</p>}
        {phase === "run" && <><div className="text-3xl font-semibold tabular-nums">{Math.max(0, DUR - secs)}s</div>
          {pace && <div className="flex h-28 w-28 items-center justify-center" aria-label="Breathe in as it grows, out as it shrinks"><div className="h-14 w-14 rounded-full bg-primary/40" style={{ animation: "lagomo-pace 10s ease-in-out infinite" }} /><style>{"@keyframes lagomo-pace{0%,100%{transform:scale(0.7)}50%{transform:scale(1.7)}}"}</style></div>}
          {pace && <p className="text-xs text-muted-foreground">In as it grows, out as it shrinks.</p>}
          <canvas ref={wave} width={300} height={70} className="w-full max-w-sm rounded-2xl bg-secondary/40" aria-label="Your pulse wave" />
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(secs / DUR) * 100}%` }} /></div>
          <p className="text-sm text-muted-foreground" role="status">{!covered ? (mode === "face" ? "I cannot see your forehead. Face the screen in good light." : "Cover the camera fully with your fingertip.") : secs < 4 ? "Settling..." : "Good. Keep still and breathe normally."}</p></>}
        {err && <p className="text-sm text-[hsl(var(--v-notready))]" role="alert">{err}</p>}
      </Card>
      {res && (res.ok ? <Card className="space-y-2"><div className="flex flex-wrap gap-6"><div><div className="text-3xl font-semibold">{res.hr}</div><div className="text-xs text-muted-foreground">beats per minute</div></div><div><div className="text-3xl font-semibold">{res.rmssd > 0 ? res.rmssd : "-"}</div><div className="text-xs text-muted-foreground">{res.rmssd > 0 ? "variability (ms)" : "variability not reliable this time"}</div></div></div>
        {verdict === "low" && <p className="text-sm">Your variability is lower than your usual ({Math.round(base!)}). Your body looks a bit more strained than normal. It is information, not a verdict. Slow breathing is a quick way to nudge it back.</p>}
        {verdict === "high" && <p className="text-sm">Higher than your usual ({Math.round(base!)}): your body looks settled and ready.</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({Math.round(base!)} ms, resting rate near {Math.round(bhr!)}).</p>}
        {res.rmssd === 0 && <Help>The signal was a little too noisy to trust the beat-to-beat variability, so I only kept your heart rate and did not save this run. Sit stiller, in steadier light, and try again.</Help>}
        {!base && res.rmssd > 0 && <Help>After 3 checks on different days it compares you with your own usual. Try to take it at the same time of day.</Help>}
        <Help>Clean beats used: {res.beats}. Signal quality: {res.quality}%. If you just walked, drank coffee or are anxious, expect a higher rate.</Help>
        <div className="flex flex-wrap gap-2"><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Again</button>{verdict === "low" && <button onClick={() => go("breathe")} className={ghost}>Slow breathing</button>}</div></Card>
        : <Card className="space-y-2"><p className="text-sm">{res.reason}</p><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Try again</button></Card>)}
    </Screen>
  );
}
