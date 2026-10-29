import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthApi } from "@/store/useAuth";

// Shown on a device that is signed in but does not have your private-message key yet.
// Password accounts: enter the password. Google accounts: enter (or create) a chat passcode.
export function UnlockScreen({ auth }: { auth: AuthApi }) {
  const isG = !!auth.user?.g;
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [forgot, setForgot] = useState(false); const [creating, setCreating] = useState(false);
  const run = async (fn: () => Promise<void>) => { setErr(""); setBusy(true); try { await fn(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const go = () => run(() => (isG ? auth.unlockPasscode(pw, forgot) : auth.unlock(pw)));
  const isCreate = isG && (forgot || creating);
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="glass w-full max-w-sm space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-2 text-xl font-semibold"><Lock className="h-5 w-5 text-primary" />{isG ? "Your chat passcode" : "Turn on private messaging"}</div>
        <p className="text-sm text-muted-foreground">{isG ? (isCreate ? "Your messages are locked so only you and your friends can read them. Choose a passcode to lock them. You will need it on each new device. We cannot reset it for you." : "Enter the passcode you chose for private messages. If this is your first time, choose a new one below.") : "Your messages are now locked so only you and your friends can read them. Enter your password once on this device to set that up."}</p>
        <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder={isG ? "Passcode (6+ characters)" : "Password"} autoFocus value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && pw && !isCreate && go()} />
        {isCreate && <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder="Type it again" value={pw2} onChange={e => setPw2(e.target.value)} />}
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button variant="hero" className="h-12 w-full rounded-2xl" disabled={!pw || busy || (isG && pw.length < 6) || (isCreate && pw !== pw2)} onClick={go}>{busy ? "One moment..." : isCreate ? "Save passcode" : "Continue"}</Button>
        {isG && !isCreate && <button className="w-full text-sm text-muted-foreground underline" onClick={() => { setCreating(true); setErr(""); setPw(""); }}>I do not have a passcode yet</button>}
        {isG && !isCreate && err.includes("not right") && <button className="w-full text-sm text-muted-foreground underline" onClick={() => { setForgot(true); setErr(""); setPw(""); }}>I forgot it. Start over (older private messages will be lost)</button>}
        <button className="w-full text-sm text-muted-foreground underline" onClick={() => auth.logout()}>Log out instead</button>
      </div>
    </div>);
}
