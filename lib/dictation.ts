import { useCallback, useEffect, useRef, useState } from "react";

/** Turns messy dictation into readable writing. Rules only: no AI service, nothing leaves the device. */
export function tidy(raw: string): string {
  let t = " " + raw.replace(/\s+/g, " ").trim() + " ";
  // spoken commands
  const cmds: [RegExp, string][] = [
    [/\s+(new paragraph)\s+/gi, "\n\n"], [/\s+(new line|next line)\s+/gi, "\n"],
    [/\s+(full stop|period)\s+/gi, ". "], [/\s+comma\s+/gi, ", "], [/\s+question mark\s+/gi, "? "],
    [/\s+(exclamation mark|exclamation point)\s+/gi, "! "], [/\s+colon\s+/gi, ": "],
  ];
  for (const [re, to] of cmds) t = t.replace(re, to);
  // filler sounds and stutters ("the the" -> "the")
  t = t.replace(/\s+(um+|uh+|uhm+|erm+|er|ah+|hmm+|mm+)(?=[\s,.!?])/gi, " ").replace(/\b(\w+)(\s+\1\b)+/gi, "$1");
  t = t.replace(/\s+([,.!?:])/g, "$1").replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
  t = t.replace(/([^.!?:,\n])\n/g, "$1.\n");
  // I / I'm / I'll etc.
  t = t.replace(/\bi(?=\b|'(m|ll|ve|d)\b)/g, "I");
  // capital letters at the start and after . ! ?
  t = t.replace(/(^|[.!?]\s+|\n)([a-z])/g, (_m, a, b) => a + b.toUpperCase());
  if (t && !/[.!?…]$/.test(t) && !/\n$/.test(t)) t += ".";
  return t;
}

interface Rec { start(): void; stop(): void; abort(): void; lang: string; continuous: boolean; interimResults: boolean; onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null; }
const Ctor = (): (new () => Rec) | null => { const w = window as any; return w.SpeechRecognition || w.webkitSpeechRecognition || null; };

/** Tap to start, tap to stop. Words appear as a live preview, then are tidied and handed over on stop. */
export function useDictation(onDone: (raw: string, tidied: string) => void) {
  const supported = typeof window !== "undefined" && !!Ctor();
  const [listening, setListening] = useState(false); const [live, setLive] = useState(""); const [error, setError] = useState("");
  const rec = useRef<Rec | null>(null); const want = useRef(false); const buf = useRef(""); const done = useRef(onDone); done.current = onDone; const restarts = useRef(0);
  const finish = useCallback(() => { const raw = buf.current.trim(); buf.current = ""; setLive(""); setListening(false); if (raw) done.current(raw, tidy(raw)); }, []);
  const stop = useCallback(() => { want.current = false; try { rec.current?.stop(); } catch { /* already stopped */ } }, []);
  const start = useCallback(() => {
    const C = Ctor(); if (!C || want.current) return; setError(""); buf.current = ""; restarts.current = 0;
    const r = new C(); r.continuous = true; r.interimResults = true; r.lang = document.documentElement.lang || navigator.language || "en-US";
    r.onresult = e => { let interim = ""; for (let i = e.resultIndex; i < e.results.length; i++) { const res = e.results[i]; if (res.isFinal) buf.current += (buf.current ? " " : "") + res[0].transcript.trim(); else interim += res[0].transcript; } setLive((buf.current + " " + interim).trim()); };
    r.onerror = e => { if (e.error === "no-speech" || e.error === "aborted") return; want.current = false; setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "The microphone is blocked. Allow it in your browser settings, or type instead." : e.error === "network" ? "Voice needs an internet connection in this browser. You can type instead." : "Voice did not work this time. You can type instead."); };
    // browsers end a session after a quiet moment; quietly keep going until the person taps stop
    r.onend = () => { if (want.current && restarts.current < 20) { restarts.current++; try { r.start(); return; } catch { /* fall through */ } } want.current = false; finish(); };
    rec.current = r; want.current = true; try { r.start(); setListening(true); } catch { want.current = false; setError("Voice did not start. You can type instead."); }
  }, [finish]);
  useEffect(() => () => { want.current = false; try { rec.current?.abort(); } catch { /* ignore */ } }, []);
  return { supported, listening, live, error, start, stop };
}
