import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import { randomAvatar } from "@/engine/avatar";
import type { AuthApi } from "@/store/useAuth";

type Step = "welcome" | "signup" | "login";

function Brand({ small }: { small?: boolean }) {
  return <div className="flex items-center justify-center gap-2.5"><div className={`${small ? "h-7 w-7" : "h-9 w-9"} animate-morph`} style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} /><span className={`${small ? "text-2xl" : "text-3xl"} font-semibold tracking-tight`}>Cognitune</span></div>;
}

export function AuthScreen({ auth }: { auth: AuthApi }) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const crowd = useMemo(() => Array.from({ length: 5 }, () => randomAvatar()), []);
  const go = async () => {
    setErr(""); setBusy(true);
    try { step === "signup" ? await auth.register({ username, password, name: name.trim() || username }) : await auth.login({ username, password }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const to = (s: Step) => { setStep(s); setErr(""); };
  const ok = username.trim().length >= 3 && password.length >= (step === "signup" ? 8 : 1);

  if (step === "welcome") return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <Brand />
      <div className="relative mt-10 h-44 w-full" aria-hidden="true">
        {[{ l: "6%", t: "38%", s: 64, r: -8 }, { l: "24%", t: "4%", s: 72, r: 6 }, { l: "42%", t: "30%", s: 92, r: 0 }, { l: "64%", t: "2%", s: 72, r: -6 }, { l: "78%", t: "40%", s: 62, r: 9 }].map((p, i) => (
          <div key={i} className="absolute" style={{ left: p.l, top: p.t, transform: `rotate(${p.r}deg)` }}><div className="animate-float" style={{ animationDelay: `${i * 0.6}s` }}><Avatar spec={crowd[i]} size={p.s} /></div></div>))}
      </div>
      <h1 className="mt-8 text-4xl leading-tight">Start something small.</h1>
      <p className="mt-3 max-w-xs text-muted-foreground">Your companion for getting started, with friends in your corner.</p>
      <div className="mt-8 w-full space-y-3">
        <Button variant="hero" className="h-12 w-full rounded-2xl text-base" onClick={() => to("signup")}>Get started</Button>
        <Button variant="outline" className="h-12 w-full rounded-2xl text-base" onClick={() => to("login")}>I already have an account</Button>
      </div>
    </div>);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <button onClick={() => to("welcome")} className="mb-4 flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</button>
      <Brand small />
      <h1 className="mt-5 text-center text-4xl leading-tight">{step === "signup" ? "Create your account" : "Welcome back."}</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-muted-foreground">{step === "signup" ? "Three quick things. You will meet your friend next." : "Sign in to pick up where you left off."}</p>
      <div className="glass mt-6 space-y-3 rounded-3xl p-5">
        {step === "signup" && <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Your name" value={name} maxLength={30} autoFocus onChange={e => setName(e.target.value)} />}
        <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Username (letters, numbers, _)" autoCapitalize="none" autoCorrect="off" value={username} maxLength={20} autoFocus={step === "login"} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} />
        <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder={step === "signup" ? "Password (8+ characters)" : "Password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && ok && go()} />
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={!ok || busy} onClick={go}>{busy ? "One moment..." : step === "signup" ? "Continue" : "Sign in"}</Button>
        <p className="text-center text-xs text-muted-foreground">{step === "signup" ? "Your journal, plans and rewards stay on this device. Messages to friends are end-to-end encrypted and locked with your password. There is no password reset yet, so remember yours." : <>New here? <button className="underline" onClick={() => to("signup")}>Get started</button></>}</p>
      </div>
      {step === "signup" && <p className="mt-4 text-center text-sm text-muted-foreground">Already have an account? <button className="underline" onClick={() => to("login")}>Sign in</button></p>}
    </div>);
}
