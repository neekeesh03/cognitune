import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

/** A recovery code is the free way back in if you forget your password. Shown once. Only a fingerprint is kept on the server. */
export function RecoveryCode() {
  const [st, setSt] = useState<{ has: boolean; google: boolean } | null>(null); const [pw, setPw] = useState(""); const [open, setOpen] = useState(false);
  const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => { api<{ has: boolean; google: boolean }>("rcode-status").then(setSt).catch(() => setSt(null)); }, []);
  if (!st || st.google) return null;
  const make = async () => { setMsg(""); setBusy(true); try { const r = await api<{ code: string }>("rcode-new", { body: { password: pw } }); setCode(r.code); setSt({ ...st, has: true }); setPw(""); setOpen(false); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="glass space-y-3 rounded-3xl p-5 text-sm">
      <div className="font-semibold">Recovery code</div>
      {code ? (<>
        <p className="text-muted-foreground">Save this somewhere safe, like a note or a photo. It is shown only once. If you forget your password, this code lets you back in.</p>
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-secondary/60 px-4 py-3 font-mono text-lg tracking-wider" translate="no" aria-label="Your recovery code">{code}
          <button aria-label="Copy" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}><Copy className="h-4 w-4" /></button></div>
        {copied && <p className="text-primary" role="status">Copied.</p>}
        <p className="text-xs text-muted-foreground">Using it also locks your old private messages, because they were locked with your old password.</p>
        <Button variant="outline" className="rounded-full" onClick={() => setCode("")}>I saved it</Button>
      </>) : (<>
        <p className="text-muted-foreground">{st.has ? "You have a recovery code. Make a new one if you lost it. The old one stops working." : "Free and private. Make a code now so you are never locked out if you forget your password."}</p>
        {open ? (<>
          <Input className="h-11 rounded-2xl bg-secondary/60" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && pw && !busy && make()} />
          <Button variant="hero" className="w-full rounded-2xl" disabled={!pw || busy} onClick={make}>{busy ? "Making..." : "Make my code"}</Button>
        </>) : <Button variant={st.has ? "outline" : "hero"} className="rounded-full" onClick={() => setOpen(true)}>{st.has ? "Make a new code" : "Make my recovery code"}</Button>}
      </>)}
      {msg && <p className="text-destructive" role="alert">{msg}</p>}
    </div>);
}
