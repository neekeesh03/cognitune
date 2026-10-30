import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr } from "@/i18n";

export const cameraAvailable = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** An in-app camera. It only takes a new picture; it never opens your photo library. The picture is shrunk before it leaves the device. */
export function PinkyCamera({ onShot, onClose }: { onShot: (b: Blob) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const [err, setErr] = useState(""); const [still, setStill] = useState<{ blob: Blob; url: string } | null>(null);
  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
        if (dead) { s.getTracks().forEach(t => t.stop()); return; }
        stream.current = s; if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      } catch { setErr(tr("The camera is not available. You can tap Done instead.")); }
    })();
    return () => { dead = true; stop(); };
  }, []);
  useEffect(() => () => { if (still) URL.revokeObjectURL(still.url); }, [still]);
  const shoot = () => {
    const v = video.current; if (!v || !v.videoWidth) return;
    const s = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight)); const c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => { if (b) setStill({ blob: b, url: URL.createObjectURL(b) }); }, "image/jpeg", 0.72);
  };
  const close = () => { stop(); onClose(); };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={tr("Photo receipt")} className="fixed inset-0 z-[95] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-4"><div className="text-sm opacity-80">{tr("Photo receipt")}</div><button aria-label={tr("Close")} onClick={close} className="rounded-full bg-white/15 p-3"><X className="h-5 w-5" /></button></div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {err ? <p className="max-w-xs px-6 text-center text-sm" role="alert">{err}</p> : <>
          <video ref={video} playsInline muted autoPlay className={`h-full w-full object-cover ${still ? "hidden" : ""}`} />
          {still && <img src={still.url} alt={tr("Your photo")} className="h-full w-full object-cover" />}</>}
      </div>
      <div className="space-y-2 p-4 text-center">
        <p className="text-xs opacity-70">{tr("Only your friend can see this. It is deleted after 48 hours.")}</p>
        {!err && !still && <Button variant="hero" className="h-14 w-14 rounded-full p-0" aria-label={tr("Take photo")} onClick={shoot}><Camera className="h-6 w-6" /></Button>}
        {still && <div className="flex justify-center gap-2"><Button variant="outline" className="rounded-full bg-transparent text-white" onClick={() => setStill(null)}><RotateCcw className="mr-1 h-4 w-4" />{tr("Retake")}</Button><Button variant="hero" className="rounded-full" onClick={() => { stop(); onShot(still.blob); }}>{tr("Send photo")}</Button></div>}
      </div>
    </div>, document.body);
}
