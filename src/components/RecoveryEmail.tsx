import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

type St = { enabled: boolean; email: string | null; google: boolean };

/** Add a recovery email so a forgotten password can be reset. Hidden until the server can send email. */
export function RecoveryEmail() {
  const [st, setSt] = useState<St | null>(null); const [email, setEmail] = useState(""); const [code, setCode] = useState("");
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const load = () => api<St>("email-status").then(setSt).catch(() => setSt(null));
  useEffect(() => { load(); }, []);
  if (!st || !st.enabled || st.google) return null;
  const run = async (fn: () => Promise<void>) => { setMsg(""); setBusy(true); try { await fn(); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="glass space-y-3 rounded-3xl p-5 text-sm">
      <div className="font-semibold">Recovery email</div>
      {st.email && !sent ? (<>
        <p className="text-muted-foreground">If you forget your password, we will send a reset link to {st.email}.</p>
        <div className="flex gap-2"><Button variant="outline" className="rounded-full" onClick={() => { setSent(false); setEmail(""); setSt({ ...st, email: null }); }}>Change</Button>
          <Button variant="ghost" className="rounded-full" disabled={busy} onClick={() => run(async () => { await api("email-remove", { body: {} }); setMsg("Removed."); await load(); })}>Remove</Button></div>
      </>) : sent ? (<>
        <p className="text-muted-foreground">We sent a 6 digit code to {email}. It works for 15 minutes.</p>
        <Input className="h-11 rounded-2xl bg-secondary/60" inputMode="numeric" maxLength={6} placeholder="6 digit code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
        <Button variant="hero" className="w-full rounded-2xl" disabled={code.length !== 6 || busy} onClick={() => run(async () => { await api("email-verify", { body: { code } }); setSent(false); setCode(""); setEmail(""); setMsg("Saved. You can now reset your password by email."); await load(); })}>Confirm</Button>
      </>) : (<>
        <p className="text-muted-foreground">Add an email so you can get back in if you forget your password. We use it for nothing else.</p>
        <Input className="h-11 rounded-2xl bg-secondary/60" type="email" autoCapitalize="none" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
        <Button variant="hero" className="w-full rounded-2xl" disabled={!email.includes("@") || busy} onClick={() => run(async () => { await api("email-set", { body: { email } }); setSent(true); })}>Send code</Button>
      </>)}
      {msg && <p className="text-muted-foreground" role="status">{msg}</p>}
    </div>);
}
