import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const OPTS = [["very", "Very disappointed"], ["somewhat", "Somewhat disappointed"], ["not", "Not disappointed"], ["nolonger", "I don't really use it"]] as const;
// One short question, shown at most once every two weeks to people who have really used the app.
export function PulseCard() {
  const [show, setShow] = useState(false); const [ans, setAns] = useState<string>(""); const [benefit, setBenefit] = useState(""); const [alt, setAlt] = useState(""); const [done, setDone] = useState(false);
  useEffect(() => { const t = setTimeout(() => api<{ eligible: boolean }>("pulse-check").then(r => setShow(r.eligible)).catch(() => {}), 20000); return () => clearTimeout(t); }, []);
  if (!show) return null;
  const send = async () => { try { await api("pulse", { body: { answer: ans, benefit, alt } }); } catch { /* ignore */ } setDone(true); setTimeout(() => setShow(false), 2500); };
  return (
    <div role="dialog" aria-label="Quick question" className="glass fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-3xl p-5 shadow-xl">
      {done ? <p className="text-center">Thank you. That really helps us.</p> : (
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3"><div className="font-semibold">How would you feel if you could no longer use Lagomo?</div><button aria-label="Not now" className="text-muted-foreground" onClick={() => { setShow(false); api("pulse", { body: { answer: "not" } }).catch(() => {}); }}>Not now</button></div>
          <div className="flex flex-wrap gap-2">{OPTS.map(([k, l]) => <button key={k} onClick={() => setAns(k)} className={`rounded-full border px-3 py-1.5 ${ans === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{l}</button>)}</div>
          {ans && <><Input className="h-10 rounded-2xl bg-secondary/60" placeholder="What is the main thing it helps you with? (optional)" value={benefit} maxLength={300} onChange={e => setBenefit(e.target.value)} /><Input className="h-10 rounded-2xl bg-secondary/60" placeholder="What would you use instead? (optional)" value={alt} maxLength={200} onChange={e => setAlt(e.target.value)} /><Button variant="hero" className="w-full rounded-full" onClick={send}>Send</Button></>}
          <p className="text-xs text-muted-foreground">Answers are anonymous and are never linked to your account.</p>
        </div>)}
    </div>);
}
