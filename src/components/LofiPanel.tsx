import { useEffect, useState, useSyncExternalStore } from "react";
import { Music, Pause, Play, Volume2 } from "lucide-react";
import { lofi, MOODS } from "@/lib/lofi";

export function useLofi() {
  useSyncExternalStore(f => lofi.subscribe(f), () => `${lofi.playing}|${lofi.moodId}|${lofi.volume}`);
  return lofi;
}

/** Mood chips + volume. Music is made live in the browser by Lagomo, lyric-free, and always optional. */
export function LofiPanel({ compact }: { compact?: boolean }) {
  const l = useLofi();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {MOODS.map(m => {
          const on = l.playing && l.moodId === m.id;
          return <button key={m.id} title={m.hint} aria-pressed={on} onClick={() => (on ? l.stop() : l.play(m.id))} className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>{on ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{m.name}</button>;
        })}
      </div>
      {!compact && <p className="text-center text-xs text-muted-foreground">{MOODS.find(m => m.id === l.moodId)?.hint}. Made live by Lagomo, no lyrics.</p>}
      <label className="mx-auto flex max-w-[220px] items-center gap-2 text-xs text-muted-foreground"><Volume2 className="h-4 w-4" /><input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={l.volume} onChange={e => l.setVolume(+e.target.value)} className="w-full accent-[hsl(var(--primary))]" /></label>
    </div>
  );
}

/** Header button that opens a small floating player on any tab. */
export function LofiButton() {
  const l = useLofi(); const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [open]);
  return (
    <div className="relative">
      <button aria-label="Lofi music" aria-expanded={open} onClick={() => setOpen(o => !o)} className={`glass rounded-full p-2.5 ${l.playing ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}><Music className={`h-4 w-4 ${l.playing ? "animate-pulse" : ""}`} /></button>
      {open && <div className="glass absolute right-0 top-12 z-50 w-[300px] rounded-3xl p-4 animate-rise"><div className="mb-3 text-center text-sm font-semibold">Lofi for starting</div><LofiPanel /></div>}
    </div>
  );
}
