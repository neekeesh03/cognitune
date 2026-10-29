import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import { randomAvatar } from "@/engine/avatar";

type V = "tiny" | "together" | "calm";
const COPY: Record<V, { h: string; sub: string; bullets: string[] }> = {
  tiny: { h: "Stuck? Start in two minutes.", sub: "Tell Cognitune what you are avoiding. It finds the first tiny step and starts a two-minute timer with you. No setup, no pile of overdue tasks.", bullets: ["One tiny step, not a plan", "A gentle two-minute timer", "Missed days never count against you"] },
  together: { h: "Start together.", sub: "Starting is easier with someone beside you. Invite a friend and begin at the same time, with a shared timer and a private chat only the two of you can read.", bullets: ["Start with a friend in 30 seconds", "A shared focus timer", "Encrypted chat, just for you two"] },
  calm: { h: "A calm companion for getting started.", sub: "Tune is a warm, plain-spoken companion that helps you take the first step when your brain says not yet. No lectures. No streak shame.", bullets: ["Talk it out, then pick one step", "Quiet by design, kind when you slip", "Your journal never leaves your device"] },
};
const SEG: Record<"a" | "b", string> = { a: "Built to be gentle on busy, distractible minds.", b: "Made for students and anyone who keeps putting things off." };

async function hit(kind: "view" | "click" | "signup", v: V, s: string) { try { await fetch("/api/hit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, v, s }) }); } catch { /* ignore */ } }

// Public test page. /hello?v=tiny|together|calm&s=a|b  (v = message, s = who it is aimed at)
export default function Landing() {
  const q = new URLSearchParams(location.search); const v = (["tiny", "together", "calm"].includes(q.get("v") || "") ? q.get("v") : "tiny") as V; const s = q.get("s") === "a" ? "a" : "b"; const src = (q.get("src") || "").slice(0, 40);
  const c = COPY[v]; const crowd = useMemo(() => Array.from({ length: 4 }, () => randomAvatar()), []);
  const [email, setEmail] = useState(""); const [ok, setOk] = useState(false); const [consent, setConsent] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = "Cognitune: " + c.h; if (!sessionStorage.getItem("lp-view")) { sessionStorage.setItem("lp-view", "1"); hit("view", v, s); } }, [v, s, c.h]);
  const join = async () => {
    setErr(""); setBusy(true);
    try { const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, v, s, src }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Something went wrong."); setOk(true); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex items-center gap-2.5"><div className="h-8 w-8 animate-morph" style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} /><span className="text-2xl font-semibold tracking-tight">Cognitune</span></div>
      <div className="mt-8 flex justify-center gap-3" aria-hidden="true">{crowd.map((a, i) => <div key={i} className="animate-float" style={{ animationDelay: `${i * 0.5}s` }}><Avatar spec={a} size={i % 2 ? 64 : 80} /></div>)}</div>
      <h1 className="mt-8 text-4xl leading-tight sm:text-5xl">{c.h}</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">{c.sub}</p>
      <p className="mt-2 text-sm text-muted-foreground">{SEG[s]}</p>
      <ul className="mt-6 space-y-1.5 text-left">{c.bullets.map(b => <li key={b} className="flex gap-2"><span className="text-primary" aria-hidden="true">&#10003;</span>{b}</li>)}</ul>
      <div className="mt-8 w-full space-y-3">
        <Button variant="hero" className="h-12 w-full rounded-2xl text-base" onClick={() => { hit("click", v, s); location.href = "/"; }}>Try it now, free</Button>
        <div className="glass rounded-3xl p-4 text-left text-sm">
          {ok ? <p className="text-center font-medium text-primary">You are on the list. We will only email you about Cognitune.</p> : <>
            <div className="mb-2 font-semibold">Or get an email when new things launch</div>
            <div className="flex gap-2"><Input className="h-11 rounded-2xl bg-secondary/60" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /><Button variant="outline" className="h-11 rounded-2xl" disabled={busy || !email || !consent} onClick={join}>Join</Button></div>
            <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5" checked={consent} onChange={e => setConsent(e.target.checked)} />Yes, email me about Cognitune. I can unsubscribe any time.</label>
            {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}</>}
        </div>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">Cognitune is a helper for building habits, not therapy or medical advice. <a href="/privacy" className="underline">Privacy</a> · <a href="/terms" className="underline">Terms</a></p>
    </div>);
}
