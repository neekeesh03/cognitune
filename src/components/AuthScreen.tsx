import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mascot, Wordmark } from "@/components/Mascot";
import { Avatar } from "@/components/Avatar";
import { randomAvatar } from "@/engine/avatar";
import { googleClientId, renderGoogleButton } from "@/lib/google";
import type { AuthApi } from "@/store/useAuth";
import { invitedBy } from "@/lib/invite";
import { LangPicker } from "@/components/LangPicker";
import { GuestStart } from "@/components/GuestStart";
import { hasGuestStart } from "@/lib/guest";
import { resetEnabled } from "@/lib/config";
import { api } from "@/lib/api";
import { tr } from "@/i18n";

type Step = "welcome" | "signup" | "login" | "forgot" | "reset";
const resetToken = () => new URLSearchParams(window.location.search).get("reset") || "";

function GoogleButton({ auth, text, onError }: { auth: AuthApi; text: "signup_with" | "signin_with"; onError: (m: string) => void }) {
  const box = useRef<HTMLDivElement>(null); const [id, setId] = useState<string | null>(null);
  useEffect(() => { googleClientId().then(setId); }, []);
  useEffect(() => { if (id && box.current) renderGoogleButton(box.current, id, text, c => auth.google(c).catch(e => onError((e as Error).message))).catch(() => onError("Could not load Google sign-in.")); }, [id, text]); // eslint-disable-line
  if (!id) return null;
  return <><div ref={box} className="flex min-h-[44px] justify-center" /><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div></>;
}

function Brand({ small }: { small?: boolean }) {
  return <div className="flex items-center justify-center gap-2.5"><Mascot size={small ? 36 : 46} /><Wordmark className={`${small ? "text-2xl" : "text-3xl"} font-semibold tracking-tight`} /></div>;
}

export function AuthScreen({ auth }: { auth: AuthApi }) {
  const [step, setStep] = useState<Step>(() => (resetToken() ? "reset" : "welcome"));
  const [fmode, setFmode] = useState<"code" | "email">("code"); const [rcode, setRcode] = useState(""); const [resetOn, setResetOn] = useState(false); const [who, setWho] = useState(""); const [note, setNote] = useState(""); useEffect(() => { resetEnabled().then(setResetOn); }, []);
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

  const sendLink = async () => { setErr(""); setBusy(true); try { await api("reset-request", { body: { who } }); setNote("If that account has a confirmed recovery email, a reset link is on its way. It works for 30 minutes."); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const useCode = async () => { setErr(""); setBusy(true); try { await api("reset-code", { body: { username: who, code: rcode, password } }); setPassword(""); setRcode(""); setNote("Password changed. Sign in with your new one."); setStep("login"); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const doReset = async () => { setErr(""); setBusy(true); try { await api("reset-confirm", { body: { token: resetToken(), password } }); window.history.replaceState({}, "", "/"); setPassword(""); setNote("Password changed. Sign in with your new one."); setStep("login"); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  if (step === "forgot" || step === "reset") return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="fixed end-4 top-4 z-10"><LangPicker /></div>
      {step === "forgot" && <button onClick={() => { setNote(""); to("login"); }} className="mb-4 flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</button>}
      <Brand small />
      <h1 className="mt-5 text-center text-4xl leading-tight">{step === "forgot" ? "Forgot your password?" : "Choose a new password"}</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-muted-foreground">{step === "forgot" ? fmode === "code" || !resetOn ? "Enter your username, your recovery code and a new password." : "Enter your username or the recovery email on your account. We will email you a link." : "After this, your old private messages cannot be opened, because they were locked with your old password. New messages work as normal."}</p>
      <div className="glass mt-6 space-y-3 rounded-3xl p-5">
        {step === "forgot" ? (fmode === "code" || !resetOn ? <>
          <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Username" autoCapitalize="none" autoCorrect="off" value={who} onChange={e => setWho(e.target.value)} />
          <Input className="h-11 rounded-2xl bg-secondary/60 font-mono tracking-wider" placeholder="Recovery code (XXXX-XXXX-XXXX-XXXX)" autoCapitalize="characters" autoCorrect="off" value={rcode} onChange={e => setRcode(e.target.value)} />
          <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder="New password (8 or more characters)" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && who.trim() && rcode && password.length >= 8 && !busy && useCode()} />
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={!who.trim() || rcode.replace(/[^a-z0-9]/gi, "").length < 16 || password.length < 8 || busy} onClick={useCode}>{busy ? "Saving..." : "Reset with my code"}</Button>
          <p className="text-center text-xs text-muted-foreground">Made a code in Me, then Profile? Use it here. No code? Sign in with Google if you used it, or make a new account.</p>
          {resetOn && <button type="button" onClick={() => { setErr(""); setFmode("email"); }} className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground">Email me a link instead</button>}
        </> : <>
          <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Username or email" autoCapitalize="none" autoCorrect="off" value={who} onChange={e => setWho(e.target.value)} onKeyDown={e => e.key === "Enter" && who.trim() && !busy && sendLink()} />
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          {note && <p role="status" className="text-sm text-primary">{note}</p>}
          <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={!who.trim() || busy} onClick={sendLink}>{busy ? "Sending..." : "Send reset link"}</Button>
          <button type="button" onClick={() => { setErr(""); setNote(""); setFmode("code"); }} className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground">Use a recovery code instead</button>
        </>) : <>
          <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder="New password (8 or more characters)" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && password.length >= 8 && !busy && doReset()} />
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={password.length < 8 || busy} onClick={doReset}>{busy ? "Saving..." : "Save new password"}</Button>
        </>}
      </div>
    </div>);

  if (step === "welcome") return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center lg:grid lg:max-w-6xl lg:grid-cols-2 lg:content-center lg:gap-x-20 lg:gap-y-6 lg:px-10 lg:text-start">
      <div className="fixed end-4 top-4 z-10"><LangPicker /></div>
      <div className="lg:col-start-1 lg:row-start-1 lg:self-end [&>div]:lg:justify-start"><Brand /></div>
      <div className="relative mt-10 h-44 w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-[420px] lg:scale-110" aria-hidden="true">
        {[{ l: "6%", t: "38%", s: 64, r: -8 }, { l: "24%", t: "4%", s: 72, r: 6 }, { l: "42%", t: "30%", s: 92, r: 0 }, { l: "64%", t: "2%", s: 72, r: -6 }, { l: "78%", t: "40%", s: 62, r: 9 }].map((p, i) => (
          <div key={i} className="absolute" style={{ left: p.l, top: p.t, transform: `rotate(${p.r}deg)` }}><div className="animate-float" style={{ animationDelay: `${i * 0.6}s` }}><Avatar spec={crowd[i]} size={p.s} /></div></div>))}
      </div>
      <div className="flex w-full flex-col items-center lg:col-start-1 lg:row-start-2 lg:items-start lg:self-start">
      {invitedBy() && <p className="mt-6 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary" role="status">{`@${invitedBy()} invited you. Sign up and you will be friends.`}</p>}
      <h1 className="mt-8 text-4xl leading-tight lg:text-6xl lg:leading-[1.05]">Start something small. Together.</h1>
      <p className="mt-3 max-w-xs text-muted-foreground lg:max-w-md lg:text-lg">Press Start. Get a two-minute first step. A friend sees you begin.</p><p className="mt-2 text-xs text-muted-foreground">Lagomo is lagom (just the right amount) + go. One small start is enough.</p>
      <div className="mt-8 w-full space-y-3 lg:max-w-md">
        <GuestStart onSave={() => to("signup")} />
        <div className="flex gap-2 pt-2"><Button variant="outline" className="h-auto min-h-11 min-w-0 flex-1 whitespace-normal rounded-2xl px-2 leading-tight" onClick={() => to("signup")}>Create account</Button><Button variant="ghost" className="h-auto min-h-11 min-w-0 flex-1 whitespace-normal rounded-2xl px-2 leading-tight" onClick={() => to("login")}>I already have an account</Button></div>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">You must be 16 or older. By continuing you agree to the <a href="/terms" className="underline">Terms</a> and <a href="/privacy" className="underline">Privacy</a> notes.</p>
      <p className="mt-2 text-xs text-muted-foreground">{tr("In India you must be 18 or older.")} <a href="/safety" className="underline">{tr("Safety and reporting")}</a></p>
      </div>
    </div>);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10 lg:grid lg:max-w-5xl lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-10">
      <div className="fixed end-4 top-4 z-10"><LangPicker /></div>
      <div className="relative hidden h-[460px] lg:block" aria-hidden="true">
        {[{ l: "4%", t: "52%", s: 84, r: -8 }, { l: "30%", t: "6%", s: 96, r: 6 }, { l: "42%", t: "42%", s: 128, r: 0 }, { l: "74%", t: "10%", s: 92, r: -6 }, { l: "76%", t: "58%", s: 84, r: 9 }].map((p, k) => (
          <div key={k} className="absolute" style={{ left: p.l, top: p.t, transform: `rotate(${p.r}deg)` }}><div className="animate-float" style={{ animationDelay: `${k * 0.6}s` }}><Avatar spec={crowd[k]} size={p.s} /></div></div>))}
      </div>
      <div className="flex w-full flex-col">
      <button onClick={() => to("welcome")} className="mb-4 flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</button>
      <Brand small />
      <h1 className="mt-5 text-center text-4xl leading-tight">{step === "signup" ? "Create your account" : "Welcome back."}</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-muted-foreground">{step === "signup" ? (hasGuestStart() ? "Your start is waiting. Three quick things to keep it." : "Three quick things. You will meet your friend next.") : "Sign in to pick up where you left off."}</p>
      <div className="glass mt-6 space-y-3 rounded-3xl p-5">
        <GoogleButton key={step} auth={auth} text={step === "signup" ? "signup_with" : "signin_with"} onError={setErr} />
        {step === "signup" && <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Your name" value={name} maxLength={30} autoFocus onChange={e => setName(e.target.value)} />}
        <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Username (letters, numbers, _)" autoCapitalize="none" autoCorrect="off" value={username} maxLength={20} autoFocus={step === "login"} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} />
        <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder={step === "signup" ? "Password (8+ characters)" : "Password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && ok && go()} />
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        {step === "login" && note && <p role="status" className="text-sm text-primary">{note}</p>}
        <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={!ok || busy} onClick={go}>{busy ? "One moment..." : step === "signup" ? "Continue" : "Sign in"}</Button>
        {step === "login" && <button type="button" onClick={() => { setNote(""); setErr(""); to("forgot"); }} className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground">Forgot password?</button>}
        <p className="text-center text-xs text-muted-foreground">{step === "signup" ? "Your journal, plans and rewards stay on this device. Messages to friends are end-to-end encrypted and locked with your password. There is no password reset yet, so remember yours." : <>New here? <button className="underline" onClick={() => to("signup")}>Get started</button></>}</p>
      </div>
      {step === "signup" && <p className="mt-4 text-center text-sm text-muted-foreground">Already have an account? <button className="underline" onClick={() => to("login")}>Sign in</button></p>}
      </div>
    </div>);
}
