import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { track } from "@/lib/track";
import { alertState, turnOnAlerts, turnOffAlerts, type AlertState } from "@/lib/push";

/** Optional once-a-day nudge at a time you choose. One alert a day at most, skipped if you already started. */
function DailyNudge() {
  const [time, setTime] = useState("08:30"); const [on, setOn] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  useEffect(() => { api<{ reminder: { time: string } | null }>("reminder").then(r => { if (r.reminder) { setTime(r.reminder.time); setOn(true); } }).catch(() => undefined); }, []);
  const save = async (t: string) => { setBusy(true); setMsg(""); try { await api("reminder", { body: { time: t, tz: new Date().getTimezoneOffset() } }); setOn(true); track("reminder_set"); setMsg("Saved. One gentle nudge a day."); } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); } };
  const off = async () => { setBusy(true); try { await api("reminder", { method: "DELETE", body: {} }); setOn(false); setMsg(""); } catch { setMsg("Could not turn it off."); } finally { setBusy(false); } };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
      <span className="font-medium">Daily nudge</span>
      <input type="time" value={time} onChange={e => { setTime(e.target.value); if (on && e.target.value) save(e.target.value); }} aria-label="Daily nudge time" className="rounded-xl border border-border bg-secondary/40 px-3 py-1.5" />
      {on ? <button disabled={busy} onClick={off} className="rounded-full border px-3 py-1.5 text-muted-foreground hover:text-foreground">Turn off</button> : <button disabled={busy || !time} onClick={() => save(time)} className="rounded-full bg-primary px-3 py-1.5 text-primary-foreground">Turn on</button>}
      <span className="basis-full text-xs text-muted-foreground">{msg || "Skipped on days you already started. Never more than one."}</span>
    </div>);
}

/** One calm card: turn friend alerts on or off for this device. */
export default function AlertsCard() {
  const [st, setSt] = useState<AlertState | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { alertState().then(setSt); }, []);
  if (!st || st === "unsupported") return st === "unsupported" ? <p className="text-center text-xs text-muted-foreground">Alerts need a newer browser. On iPhone, add Lagomo to your Home Screen first.</p> : null;
  const go = async (fn: () => Promise<AlertState>) => { setBusy(true); setErr(""); try { setSt(await fn()); } catch (e) { setErr((e as Error).message || "Could not change alerts."); } finally { setBusy(false); } };
  if (st === "on") return (
    <div className="glass rounded-3xl p-4"><div className="flex items-center justify-between gap-3"><div><div className="font-semibold">Friend alerts are on</div><div className="text-sm text-muted-foreground">You will hear when a friend writes, starts or cheers you on. Never what the message says.</div></div>
      <button disabled={busy} onClick={() => go(turnOffAlerts)} className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Turn off</button></div><DailyNudge /></div>);
  if (st === "blocked") return <p className="glass rounded-3xl p-4 text-sm text-muted-foreground">Alerts are blocked in your browser settings for this site. Allow notifications there, then come back and turn them on.</p>;
  return (
    <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4"><div><div className="font-semibold">Know when a friend starts</div><div className="text-sm text-muted-foreground">Get one gentle alert per friend, even when Lagomo is closed. No spam.</div>{err && <div className="mt-1 text-xs text-accent">{err}</div>}</div>
      <button disabled={busy} onClick={() => go(turnOnAlerts)} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">{busy ? "..." : "Turn on alerts"}</button></div>);
}
