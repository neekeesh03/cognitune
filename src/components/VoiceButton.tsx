import { useRef, useState } from "react";
import { Mic, Square, Undo2 } from "lucide-react";
import { useDictation } from "@/lib/dictation";

/** Speak into any text box. Shows words as you talk, tidies them when you stop, and lets you undo the tidy. */
export function VoiceButton({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [undo, setUndo] = useState<{ raw: string; tidy: string } | null>(null); const base = useRef(value); base.current = value;
  const d = useDictation((raw, tidy) => { const sep = base.current && !/\s$/.test(base.current) ? (tidy.startsWith("\n") ? "" : " ") : ""; onChange(base.current + sep + tidy); setUndo({ raw, tidy }); });
  if (!d.supported) return <p className="text-xs text-muted-foreground">Voice is not available in this browser. Typing works everywhere, and Chrome, Edge and Safari can also listen.</p>;
  const undoTidy = () => { if (undo && base.current.endsWith(undo.tidy)) onChange(base.current.slice(0, base.current.length - undo.tidy.length) + undo.raw); setUndo(null); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => (d.listening ? d.stop() : (setUndo(null), d.start()))} aria-pressed={d.listening} aria-label={d.listening ? "Stop and add what I said" : "Speak your entry"}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${d.listening ? "bg-destructive text-destructive-foreground" : "border border-border bg-secondary/60 hover:border-primary hover:text-primary"}`}>
          {d.listening ? <><Square className="h-4 w-4" />Done speaking</> : <><Mic className="h-4 w-4" />Speak instead</>}
          {d.listening && <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" />}
        </button>
        {undo && !d.listening && <button type="button" onClick={undoTidy} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"><Undo2 className="h-3.5 w-3.5" />Undo tidy-up</button>}
      </div>
      {d.listening && <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-3 text-sm text-muted-foreground" role="status" aria-live="polite">{d.live || "Listening. Say it however it comes out."}</div>}
      {d.error && <p className="text-xs text-destructive" role="alert">{d.error}</p>}
      {!d.listening && !undo && <p className="text-xs text-muted-foreground">Tip: say "new line" or "full stop". Messy is fine, I tidy it when you stop. Lagomo never keeps your voice, only the words. Chrome and Safari turn speech into words on their own servers.</p>}
    </div>
  );
}
