import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AuthApi } from "@/store/useAuth";

// Shown once on a device that is signed in but does not have your private-message key yet.
export function UnlockScreen({ auth }: { auth: AuthApi }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => { setErr(""); setBusy(true); try { await auth.unlock(pw); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="glass w-full max-w-sm space-y-4 rounded-3xl p-6">
        <div className="flex items-center gap-2 text-xl font-semibold"><Lock className="h-5 w-5 text-primary" />Turn on private messaging</div>
        <p className="text-sm text-muted-foreground">Your messages are now locked so only you and your friends can read them. Enter your password once on this device to set that up.</p>
        <Input className="h-11 rounded-2xl bg-secondary/60" type="password" placeholder="Password" autoFocus value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && pw && go()} />
        {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        <Button variant="hero" className="h-12 w-full rounded-2xl" disabled={!pw || busy} onClick={go}>{busy ? "One moment..." : "Continue"}</Button>
        <button className="w-full text-sm text-muted-foreground underline" onClick={() => auth.logout()}>Log out instead</button>
      </div>
    </div>);
}
