import { useEffect, useState } from "react";
import { alertState, turnOnAlerts, turnOffAlerts, type AlertState } from "@/lib/push";

/** One calm card: turn friend alerts on or off for this device. */
export default function AlertsCard() {
  const [st, setSt] = useState<AlertState | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { alertState().then(setSt); }, []);
  if (!st || st === "unsupported") return st === "unsupported" ? <p className="text-center text-xs text-muted-foreground">Alerts need a newer browser. On iPhone, add Lagomo to your Home Screen first.</p> : null;
  const go = async (fn: () => Promise<AlertState>) => { setBusy(true); setErr(""); try { setSt(await fn()); } catch (e) { setErr((e as Error).message || "Could not change alerts."); } finally { setBusy(false); } };
  if (st === "on") return (
    <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4"><div><div className="font-semibold">Friend alerts are on</div><div className="text-sm text-muted-foreground">You will hear when a friend writes, hops in or cheers you on. Never what the message says.</div></div>
      <button disabled={busy} onClick={() => go(turnOffAlerts)} className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Turn off</button></div>);
  if (st === "blocked") return <p className="glass rounded-3xl p-4 text-sm text-muted-foreground">Alerts are blocked in your browser settings for this site. Allow notifications there, then come back and turn them on.</p>;
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4"><div><div className="font-semibold">Know when a friend hops in</div><div className="text-sm text-muted-foreground">Get one gentle alert per friend, even when Lagomo is closed. No spam.</div>{err && <div className="mt-1 text-xs text-accent">{err}</div>}</div>
      <button disabled={busy} onClick={() => go(turnOnAlerts)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{busy ? "..." : "Turn on alerts"}</button></div>);
}
