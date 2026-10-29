import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarEditor } from "@/components/AvatarEditor";
import { randomAvatar, type AvatarSpec } from "@/engine/avatar";
import type { AuthApi } from "@/store/useAuth";

export function AuthScreen({ auth }: { auth: AuthApi }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<AvatarSpec>(randomAvatar); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(""); setBusy(true);
    try { mode === "signup" ? await auth.register({ username, password, name: name || username, avatar }) : await auth.login({ username, password }); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const ok = username.trim().length >= 3 && password.length >= (mode === "signup" ? 8 : 1);
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-6 flex items-center justify-center gap-2.5"><div className="h-9 w-9 animate-morph" style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} /><span className="text-3xl font-semibold tracking-tight">Cognitune</span></div>
      <h1 className="text-center text-4xl leading-tight">{mode === "signup" ? "Start something small." : "Welcome back."}</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-muted-foreground">{mode === "signup" ? "Your companion for getting started, with friends in your corner." : "Sign in to pick up where you left off."}</p>
      <div className="glass mt-6 space-y-3 rounded-3xl p-5">
        <div className="flex gap-1 rounded-full bg-foreground/[.05] p-1">{([["signup", "Create account"], ["login", "Sign in"]] as const).map(([id, l]) => <button key={id} onClick={() => { setMode(id); setErr(""); }} className={`flex-1 rounded-full py-1.5 text-sm ${mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</button>)}</div>
        {mode === "signup" && <><AvatarEditor value={avatar} onChange={setAvatar} /><Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Your name" value={name} maxLength={30} onChange={e => setName(e.target.value)} /></>}
        <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Username (letters, numbers, _)" autoCapitalize="none" autoCorrect="off" value={username} maxLength={20} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} />
        <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && ok && go()} />
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={!ok || busy} onClick={go}>{busy ? "One moment..." : mode === "signup" ? "Create my account" : "Sign in"}</Button>
        <p className="text-center text-xs text-muted-foreground">{mode === "signup" ? "Your journal, plans and rewards stay on this device. Messages and files you send to friends are stored on our server so they arrive even when your friend is offline. There is no password reset yet, so remember yours." : "New here? Choose Create account."}</p>
      </div>
    </div>);
}
