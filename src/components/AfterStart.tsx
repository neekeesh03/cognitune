import { useEffect, useState } from "react";
import { alertState, turnOnAlerts, type AlertState } from "@/lib/push";
import { shareInvite } from "@/lib/invite";
import { track } from "@/lib/track";

const WHEN = ["Tomorrow morning", "After lunch", "This evening", "Not now"];
/** The end of a start. Peak-end: finish warm, offer one more step, then ask for the one thing that helps you come back. */
export function AfterStart({ onMore, hasFriends, username }: { onMore: (min: number) => void; hasFriends: boolean; username: string }) {
  const [when, setWhen] = useState<string | null>(null); const [al, setAl] = useState<AlertState | null>(null); const [asked, setAsked] = useState(false); const [msg, setMsg] = useState("");
  useEffect(() => { alertState().then(setAl); }, []);
  const pick = (w: string) => { setWhen(w); if (w !== "Not now") { localStorage.setItem("lagomo.nexthop", JSON.stringify({ w, ts: Date.now() })); track("nexthop_set"); } };
  return (
    <div className="mt-5 w-full max-w-sm space-y-4 px-6 text-center">
      <div><p className="mb-2 text-sm text-muted-foreground">Want to keep the momentum?</p>
        <div className="flex justify-center gap-2">{[10, 25].map(m => <button key={m} onClick={() => { track("keep_going"); onMore(m); }} className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm text-primary">{`${m} more minutes`}</button>)}</div></div>
      <div><p className="mb-2 text-sm text-muted-foreground">{when ? (when === "Not now" ? "No problem. Starting counts." : "Planned: " + when.toLowerCase() + ". Easy.") : "When will you start next?"}</p>
        {!when && <div className="flex flex-wrap justify-center gap-2">{WHEN.map(w => <button key={w} onClick={() => pick(w)} className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary">{w}</button>)}</div>}</div>
      {!asked && hasFriends && al === "off" && (
        <div className="rounded-2xl bg-secondary/60 p-4 text-left"><div className="font-semibold">Want a tap on the shoulder?</div><div className="text-sm text-muted-foreground">We will alert you when a friend starts. Never marketing.</div>
          <div className="mt-3 flex gap-2"><button onClick={async () => { try { setAl(await turnOnAlerts()); track("alerts_prime_yes"); } catch { setMsg("Could not turn alerts on."); } setAsked(true); }} className="rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">Turn on alerts</button>
            <button onClick={() => { track("alerts_prime_no"); setAsked(true); }} className="px-3 text-sm text-muted-foreground">Not now</button></div></div>)}
      {!hasFriends && (
        <div className="rounded-2xl bg-secondary/60 p-4 text-left"><div className="font-semibold">Start together next time</div><div className="text-sm text-muted-foreground">Send a friend your link. They will see you hop in.</div>
          <button onClick={async () => { const r = await shareInvite(username); track("invite_share"); setMsg(r === "copied" ? "Link copied." : r === "failed" ? "Could not share." : "Sent."); }} className="mt-3 rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">Send link</button></div>)}
      {msg && <p role="status" className="text-xs text-muted-foreground">{msg}</p>}
    </div>);
}
