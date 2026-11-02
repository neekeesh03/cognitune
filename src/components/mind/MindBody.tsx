import { useEffect, useRef, useState } from "react";
import { Card, Help, Screen, type MindProps } from "@/components/mind/MindParts";
import { analyseTremor, type TremorResult } from "@/engine/tremor";
import { analyseBlinks, type BlinkResult, type Frame } from "@/engine/blink";
import { gameStore, saveGame } from "@/engine/games";
import { SteadyCursor } from "@/components/mind/MindCursor";

const ghost = "rounded-full border border-border px-4 py-2 text-sm"; const prim = "rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground";
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// ---- Steady hand: hold the phone still, the motion sensor reads the tiny shake ----
const HDUR = 20;
function SteadyPhone({ done, back, go, onNoSensor }: MindProps & { onNoSensor: () => void }) {
  const [phase, setPhase] = useState<"idle" | "count" | "run" | "end">("idle"); const [secs, setSecs] = useState(0); const [err, setErr] = useState(""); const [res, setRes] = useState<TremorResult | null>(null);
  const buf = useRef<{ t: number[]; x: number[]; y: number[]; z: number[] }>({ t: [], x: [], y: [], z: [] }); const timers = useRef<number[]>([]); const handler = useRef<((e: DeviceMotionEvent) => void) | null>(null); const prior = useRef(gameStore("hand"));
  const cleanup = () => { timers.current.forEach(t => window.clearTimeout(t)); timers.current = []; if (handler.current) window.removeEventListener("devicemotion", handler.current); handler.current = null; };
  useEffect(() => cleanup, []);
  const begin = async () => {
    setErr("");
    if (typeof DeviceMotionEvent === "undefined") { setErr("This device has no motion sensor."); onNoSensor(); return; }
    const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    try { if (D.requestPermission && (await D.requestPermission()) !== "granted") { setErr("Motion access was not allowed. You can allow it in your browser settings, or skip this one."); return; } } catch { setErr("Motion access was not allowed."); return; }
    let got = false; const probe = (e: DeviceMotionEvent) => { if (e.accelerationIncludingGravity?.x != null) got = true; }; window.addEventListener("devicemotion", probe);
    await new Promise(r => setTimeout(r, 600)); window.removeEventListener("devicemotion", probe); if (!got) { setErr("No motion readings came through. Phones have this sensor, most laptops do not."); onNoSensor(); return; }
    setPhase("count"); setSecs(3); [1, 2].forEach(i => timers.current.push(window.setTimeout(() => setSecs(3 - i), i * 1000)));
    timers.current.push(window.setTimeout(() => {
      buf.current = { t: [], x: [], y: [], z: [] }; const t0 = performance.now();
      handler.current = e => { const a = e.accelerationIncludingGravity; if (!a || a.x == null) return; const b = buf.current; b.t.push(performance.now() - t0); b.x.push(a.x); b.y.push(a.y ?? 0); b.z.push(a.z ?? 0); };
      window.addEventListener("devicemotion", handler.current); setPhase("run"); setSecs(0);
      const tick = window.setInterval(() => setSecs(s => s + 1), 1000);
      timers.current.push(window.setTimeout(() => { window.clearInterval(tick); cleanup(); const b = buf.current; const out = analyseTremor(b.t, b.x, b.y, b.z); setRes(out); setPhase("end"); if (out.ok) { saveGame("hand", { ts: Date.now(), a: out.rms, b: out.hz, c: out.rate }); done("hand"); } }, HDUR * 1000));
    }, 3000));
  };
  const base = prior.current.length >= 3 ? median(prior.current.slice(-15).map(g => g.a)) : null; const verdict = res?.ok && base ? (res.rms > base * 1.3 ? "shaky" : res.rms < base * 0.75 ? "still" : "usual") : null;
  return (
    <Screen title="Steady hand" sub="Hold your phone still in one hand for 20 seconds. Its motion sensor reads the tiny shake in your hand." back={back} credit="Method: the phone's accelerometer, filtered to the 4 to 14 Hz band where physiological hand tremor lives. Tremor size rises with stress, caffeine and tiredness, but it also depends on how you hold the phone, so only compare with your own earlier runs, held the same way. Not a medical test. Readings stay on this device.">
      <Card className="flex flex-col items-center gap-3">
        {phase === "idle" && <><p className="text-sm">Sit down, rest your elbow on a table or your side, hold the phone flat in front of you, and keep it as still as you can.</p><button onClick={begin} className={prim}>Start</button></>}
        {phase === "count" && <div className="text-5xl font-semibold tabular-nums" role="status">{secs}</div>}
        {phase === "run" && <><div className="text-3xl font-semibold tabular-nums">{Math.max(0, HDUR - secs)}s</div><div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(secs / HDUR) * 100}%` }} /></div><p className="text-sm text-muted-foreground">Hold still. Breathe normally.</p></>}
        {err && <p className="text-sm text-[hsl(var(--v-notready))]" role="alert">{err}</p>}
      </Card>
      {res && (res.ok ? <Card className="space-y-2"><div className="flex flex-wrap gap-6"><div><div className="text-3xl font-semibold">{Math.round(res.rms * 1000)}</div><div className="text-xs text-muted-foreground">shake size (lower is steadier)</div></div><div><div className="text-3xl font-semibold">{res.hz}</div><div className="text-xs text-muted-foreground">shake pitch (Hz)</div></div></div>
        {verdict === "shaky" && <p className="text-sm">Shakier than your usual ({Math.round(base! * 1000)}). That often goes with stress, caffeine or a short night. It is information, not a verdict. Slow breathing or a short break can help.</p>}
        {verdict === "still" && <p className="text-sm">Steadier than your usual ({Math.round(base! * 1000)}). Good state for careful work.</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({Math.round(base! * 1000)}).</p>}
        {!base && <Help>After 3 runs it compares you with your own usual. Hold the phone the same way each time.</Help>}
        <div className="flex flex-wrap gap-2"><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Again</button>{verdict === "shaky" && <button onClick={() => go("breathe")} className={ghost}>Slow breathing</button>}</div></Card>
        : <Card className="space-y-2"><p className="text-sm">{res.reason}</p><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Try again</button></Card>)}
    </Screen>
  );
}

// ---- Eye check: blink rate and eye closure from the front camera, read by a small model that runs on the phone ----
const EDUR = 60;
const VER = "0.10.14";
interface Landmarker { detectForVideo: (v: HTMLVideoElement, ts: number) => { faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[] }; close: () => void }
export function EyeCheck({ done, back, go }: MindProps) {
  const [phase, setPhase] = useState<"idle" | "load" | "run" | "end">("idle"); const [secs, setSecs] = useState(0); const [err, setErr] = useState(""); const [res, setRes] = useState<BlinkResult | null>(null); const [face, setFace] = useState(true);
  const vid = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const raf = useRef(0); const lm = useRef<Landmarker | null>(null); const prior = useRef(gameStore("eyes")); const alive = useRef(true);
  const stop = () => { alive.current = false; cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; lm.current?.close(); lm.current = null; };
  useEffect(() => { alive.current = true; return stop; }, []);
  const begin = async () => {
    setErr(""); setPhase("load"); alive.current = true;
    if (!navigator.mediaDevices?.getUserMedia) { setErr("This browser cannot use the camera here."); setPhase("idle"); return; }
    try {
      const mod = await import(/* @vite-ignore */ `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/vision_bundle.mjs`);
      const fileset = await mod.FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`);
      lm.current = await mod.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" }, runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true });
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 30 } }, audio: false });
      const v = vid.current!; v.srcObject = stream.current; await v.play();
    } catch { stop(); setErr("I could not start the eye check. It needs the camera and a one-time download of a small model (about 13 MB). Check your connection and camera permission, or skip this one."); setPhase("idle"); return; }
    const frames: Frame[] = []; const t0 = performance.now(); let lastT = -1; let missed = 0; setPhase("run");
    const step = () => {
      if (!alive.current || !lm.current) return; const v = vid.current!; const now = performance.now() - t0;
      if (v.currentTime !== lastT && v.readyState >= 2) {
        lastT = v.currentTime; const r = lm.current.detectForVideo(v, performance.now()); const bs = r.faceBlendshapes?.[0]?.categories;
        if (bs) { const g = (n: string) => bs.find(c => c.categoryName === n)?.score ?? 0; frames.push({ t: now, l: g("eyeBlinkLeft"), r: g("eyeBlinkRight") }); missed = 0; setFace(true); } else if (++missed > 15) setFace(false);
      }
      setSecs(Math.min(EDUR, Math.round(now / 1000)));
      if (now >= EDUR * 1000) { stop(); const out = analyseBlinks(frames, EDUR * 1000); setRes(out); setPhase("end"); if (out.ok) { saveGame("eyes", { ts: Date.now(), a: out.rate, b: out.perclos, c: out.slow }); done("eyes"); } return; }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };
  const base = prior.current.length >= 3 ? median(prior.current.slice(-15).map(g => g.b)) : null; const verdict = res?.ok && base != null ? (res.perclos > base * 1.5 && res.perclos - base > 1.5 ? "tired" : res.perclos < base * 0.7 ? "fresh" : "usual") : null;
  return (
    <Screen title="Eye check" sub="Look at the screen for one minute (reading something is fine). Your blinks and eye closure show how tired you are." back={back} credit="Method: a small face model that runs on your phone reads how closed each eye is, frame by frame. Time with eyes mostly shut (PERCLOS) and slow eyelid closures are standard measures of drowsiness in driving research. It only counts blinks. It does not read emotions, because facial expressions do not reliably show what someone feels (Barrett et al., 2019). Video is never saved or sent. The first time, a small model (about 13 MB) is downloaded from Google and jsDelivr; nothing about you is uploaded.">
      <Card className="flex flex-col items-center gap-3">
        <video ref={vid} playsInline muted className="pointer-events-none absolute h-px w-px opacity-0" />
        {phase === "idle" && <><p className="text-sm">Hold the phone at reading distance, face the screen in good light, and look at it naturally. Do not try to blink more or less.</p><button onClick={begin} className={prim}>Start (allow camera)</button></>}
        {phase === "load" && <p className="text-sm text-muted-foreground" role="status">Getting ready... the first time this takes a few seconds.</p>}
        {phase === "run" && <><div className="text-3xl font-semibold tabular-nums">{Math.max(0, EDUR - secs)}s</div><div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${(secs / EDUR) * 100}%` }} /></div><p className="text-sm text-muted-foreground" role="status">{face ? "Good. Just look at the screen." : "I cannot see your face. Move into the light and face the screen."}</p></>}
        {err && <p className="text-sm text-[hsl(var(--v-notready))]" role="alert">{err}</p>}
      </Card>
      {res && (res.ok ? <Card className="space-y-2"><div className="flex flex-wrap gap-6"><div><div className="text-3xl font-semibold">{res.rate}</div><div className="text-xs text-muted-foreground">blinks per minute</div></div><div><div className="text-3xl font-semibold">{res.perclos}%</div><div className="text-xs text-muted-foreground">time eyes mostly shut</div></div><div><div className="text-3xl font-semibold">{res.slow}</div><div className="text-xs text-muted-foreground">slow closures</div></div></div>
        {verdict === "tired" && <p className="text-sm">Your eyes are shut more than usual ({base!.toFixed(1)}%). That often means tiredness. It is information, not a verdict. A short break, some light or a glass of water can help. If you drive, do not rely on this.</p>}
        {verdict === "fresh" && <p className="text-sm">Your eyes look more awake than usual ({base!.toFixed(1)}%).</p>}
        {verdict === "usual" && <p className="text-sm">About your usual ({base!.toFixed(1)}%).</p>}
        {!base && <Help>After 3 checks on different days it compares you with your own usual. Screens, dry air and contact lenses change blinking, so compare like with like.</Help>}
        <div className="flex flex-wrap gap-2"><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Again</button>{verdict === "tired" && <><button onClick={() => go("brk")} className={ghost}>Take a short break</button><button onClick={() => go("sleep")} className={ghost}>Check my sleep</button></>}</div></Card>
        : <Card className="space-y-2"><p className="text-sm">{res.reason}</p><button onClick={() => { setRes(null); setPhase("idle"); }} className={ghost}>Try again</button></Card>)}
    </Screen>
  );
}

/** Phone: motion sensor. Laptop (no sensor): pointer steadiness instead. */
export function SteadyHand(p: MindProps) {
  const [cursor, setCursor] = useState(() => typeof DeviceMotionEvent === "undefined" || !(navigator.maxTouchPoints > 0)); const [offer, setOffer] = useState(false);
  if (cursor) return <SteadyCursor {...p} />;
  return <><SteadyPhone {...p} onNoSensor={() => setOffer(true)} />{offer && <div className="mx-auto mt-3 max-w-xl"><button onClick={() => setCursor(true)} className="rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">Use my mouse or trackpad instead</button></div>}</>;
}
