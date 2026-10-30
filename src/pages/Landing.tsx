import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import { Mascot, Wordmark } from "@/components/Mascot";
import { LangPicker } from "@/components/LangPicker";
import { randomAvatar } from "@/engine/avatar";

type V = "tiny" | "together" | "calm";
const STEPS = [
  { n: "1", t: "Say what you are dodging", d: "One line. \"Start my essay.\" Lagomo finds the first tiny step.", tint: "hsl(var(--f-grain) / .22)" },
  { n: "2", t: "Press Start", d: "A gentle two-minute timer begins. That is the whole job.", tint: "hsl(var(--secondary))" },
  { n: "3", t: "A friend sees you hop in", d: "They get a quiet ping, no details. You are not alone in it.", tint: "hsl(var(--accent))" },
];
const FAQ = [
  ["Is it free?", "Yes, completely. Every part of Lagomo is free. No paid plan, no ads, no card."],
  ["Do my friends see what I am working on?", "No. They only see that you hopped in. Task names never leave your device."],
  ["Who can read my messages?", "Only you and your friend. Chats are end-to-end encrypted and your journal stays on your device."],
  ["What if I stop after a minute?", "That still counts. Lagomo has no streak shame and missed days never count against you."],
];
const COPY: Record<V, { h: string; sub: string; bullets: string[] }> = {
  tiny: { h: "Stuck? Start in two minutes.", sub: "Tell Lagomo what you are avoiding. It finds the first tiny step and starts a two-minute timer with you. No setup, no pile of overdue tasks.", bullets: ["One tiny step, not a plan", "A gentle two-minute timer", "Missed days never count against you"] },
  together: { h: "Start together.", sub: "Starting is easier with someone beside you. Invite a friend and begin at the same time, with a shared timer and a private chat only the two of you can read.", bullets: ["Start with a friend in 30 seconds", "A shared focus timer", "Encrypted chat, just for you two"] },
  calm: { h: "A calm way to get started.", sub: "A plain, kind way to take the first step when your brain says not yet. No lectures. No streak shame.", bullets: ["One small step, then another", "Quiet by design, kind when you slip", "Your journal never leaves your device"] },
};
const SEG: Record<"a" | "b", string> = { a: "Made for students: the essay, the revision, the deadline you keep dodging.", b: "Made for your first years of work: the report, the admin, the thing you keep putting off." };

async function hit(kind: "view" | "click" | "signup", v: V, s: string) { try { await fetch("/api/hit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, v, s }) }); } catch { /* ignore */ } }

// Public page. /hello?v=tiny|together|calm&s=a|b  (v = message, s = who it is aimed at)
export default function Landing() {
  const q = new URLSearchParams(location.search); const v = (["tiny", "together", "calm"].includes(q.get("v") || "") ? q.get("v") : "tiny") as V; const s = q.get("s") === "b" ? "b" : "a"; const src = (q.get("src") || "").slice(0, 40);
  const c = COPY[v]; const crowd = useMemo(() => Array.from({ length: 3 }, () => randomAvatar()), []);
  const [email, setEmail] = useState(""); const [ok, setOk] = useState(false); const [consent, setConsent] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [what, setWhat] = useState("");
  useEffect(() => { document.title = "Lagomo: " + c.h; if (!sessionStorage.getItem("lp-view")) { sessionStorage.setItem("lp-view", "1"); hit("view", v, s); } }, [v, s, c.h]);
  const go = () => { hit("click", v, s); if (what.trim()) sessionStorage.setItem("lagomo.prefill", what.trim().slice(0, 80)); location.href = "/"; };
  const join = async () => {
    setErr(""); setBusy(true);
    try { const r = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, v, s, src }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Something went wrong."); setOk(true); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5"><Mascot size={36} /><Wordmark className="text-2xl font-semibold tracking-tight" /></div>
        <div className="flex items-center gap-2"><LangPicker /><a href="/" onClick={() => hit("click", v, s)} className="rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10">Sign in</a></div>
      </header>

      {/* 1. Hero: one promise, one try-it box */}
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-8 text-center">
        <div className="mx-auto w-fit animate-float"><Mascot size={112} /></div>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">Just enough to start</p>
        <h1 className="mt-3 text-5xl leading-[1.05] sm:text-6xl">{c.h}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">{c.sub}</p>
        <div className="glass mx-auto mt-8 flex max-w-lg flex-col gap-3 rounded-3xl p-3 sm:flex-row">
          <input value={what} onChange={e => setWhat(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} aria-label="What are you putting off" placeholder="What are you putting off?" className="h-12 flex-1 rounded-2xl bg-secondary/60 px-4 text-base outline-none focus:ring-2 focus:ring-primary/40" />
          <Button variant="hero" className="h-12 rounded-2xl px-6 text-base" onClick={go}>Start free</Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{SEG[s]}</p>
      </section>

      {/* 2. Show, do not tell: what a friend sees */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="text-center md:text-left">
            <h2 className="text-4xl leading-tight">Starting is easier when someone is beside you.</h2>
            <p className="mt-4 text-lg text-muted-foreground">Hop in, and your friends get one quiet ping. No public feed, no scores, no pressure to reply.</p>
          </div>
          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center gap-3"><Avatar spec={crowd[0]} size={44} /><div className="text-left"><div className="font-semibold">Mia hopped in</div><div className="text-sm text-muted-foreground">Your turn? One small start is enough.</div></div></div>
            </div>
            <div className="glass ml-8 mt-3 rounded-3xl p-5">
              <div className="flex items-center gap-3"><Avatar spec={crowd[1]} size={44} /><div className="text-left"><div className="font-semibold">You are in. 2:00</div><div className="text-sm text-muted-foreground">Mia cheered you on</div></div></div>
            </div>
            <div className="absolute -right-2 -top-6 animate-float"><Avatar spec={crowd[2]} size={56} /></div>
          </div>
        </div>
      </section>

      {/* 3. How it works: three colour-coded steps */}
      <section className="px-6 py-20" style={{ background: "hsl(var(--secondary) / .55)" }}>
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-4xl">How it works</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{STEPS.map(st => (
            <div key={st.n} className="rounded-3xl p-7" style={{ background: st.tint }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">{st.n}</div>
              <h3 className="mt-5 text-2xl">{st.t}</h3><p className="mt-2 text-muted-foreground">{st.d}</p>
            </div>))}</div>
        </div>
      </section>

      {/* 4. What it is NOT: calm contrast (Forest style) */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-center text-4xl">Built to get you started. Not to keep you scrolling.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-border p-7"><div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Most apps</div>
            <ul className="mt-4 space-y-2 text-muted-foreground"><li>Endless task lists</li><li>Streaks that punish you</li><li>Public feeds and follower counts</li><li>Strangers on camera</li><li>Paywalls and upsells</li></ul></div>
          <div className="rounded-3xl bg-primary p-7 text-primary-foreground"><div className="text-sm uppercase tracking-[0.2em] opacity-80">Lagomo</div>
            <ul className="mt-4 space-y-2 text-lg"><li>One tiny step</li><li>No shame, ever</li><li>Just your real friends</li><li>Private by design</li><li>Free, for everyone</li></ul></div>
        </div>
      </section>

      {/* 5. FAQ: four short answers */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <h2 className="text-center text-4xl">Quick answers</h2>
        <div className="mt-8 divide-y divide-border rounded-3xl border border-border">{FAQ.map(([qq, a]) => (
          <details key={qq} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{qq}<span className="text-primary transition group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-2 text-muted-foreground">{a}</p></details>))}</div>
      </section>

      {/* 6. Final call to action + optional email */}
      <section className="px-6 py-20 text-center" style={{ background: "hsl(var(--f-grain) / .2)" }}>
        <div className="mx-auto w-fit animate-float"><Mascot size={72} /></div>
        <h2 className="mt-4 text-4xl">Ready for one small start?</h2>
        <Button variant="hero" className="mt-6 h-14 rounded-2xl px-10 text-lg" onClick={go}>Start free</Button>
        <div className="mx-auto mt-10 max-w-md text-left text-sm">
          {ok ? <p className="text-center font-medium text-primary">You are on the list. We will only email you about Lagomo.</p> : (
            <details className="glass rounded-3xl p-4"><summary className="cursor-pointer text-center text-muted-foreground">Not ready? Get an email when new things launch</summary>
              <div className="mt-3 flex gap-2"><Input className="h-11 rounded-2xl bg-secondary/60" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} /><Button variant="outline" className="h-11 rounded-2xl" disabled={busy || !email || !consent} onClick={join}>Join</Button></div>
              <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5" checked={consent} onChange={e => setConsent(e.target.checked)} />Yes, email me about Lagomo. I can unsubscribe any time.</label>
              {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}</details>)}
        </div>
      </section>
      <p className="px-6 py-8 text-center text-xs text-muted-foreground">Lagomo is a helper for building habits, not therapy or medical advice. <a href="/privacy" className="underline">Privacy</a> · <a href="/terms" className="underline">Terms</a></p>
    </div>);
}
