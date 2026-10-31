import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { alertState, turnOnAlerts, type AlertState } from "@/lib/push";
import { shareInvite } from "@/lib/invite";
import { track } from "@/lib/track";

const DONE = "lagomo.gs.hidden";
/** Three steps, ticked off as they happen. Disappears when finished or dismissed. */
export function GetStarted({ username, friends, started }: { username: string; friends: number; started: boolean }) {
  const [hidden, setHidden] = useState(() => !!localStorage.getItem(DONE)); const [al, setAl] = useState<AlertState | null>(null); const [msg, setMsg] = useState(""); const [invited, setInvited] = useState(() => !!localStorage.getItem("lagomo.invited"));
  useEffect(() => { alertState().then(setAl); }, []);
  const hasFriend = friends > 0 || invited; const alertsOn = al === "on" || al === "unsupported";
  if (hidden || al === null) return null;
  if (started && hasFriend && alertsOn) return null;
  const items: { done: boolean; title: string; sub: string; act?: { label: string; run: () => void } }[] = [
    { done: started, title: "Press Start once", sub: "Two minutes is enough. Use the card above." },
    { done: hasFriend, title: "Invite a friend", sub: "They will see you started. Nothing else.", act: { label: "Send link", run: async () => { const r = await shareInvite(username); track("invite_share"); if (r !== "failed") setInvited(true); setMsg(r === "copied" ? "Link copied. Paste it to a friend." : r === "failed" ? "Could not share. Try again." : ""); } } },
    { done: alertsOn, title: "Get a tap on the shoulder", sub: "A gentle alert when a friend starts.", act: al === "blocked" ? undefined : { label: "Turn on", run: async () => { try { setAl(await turnOnAlerts()); track("alerts_prime_yes"); } catch { setMsg("Could not turn alerts on."); } } } },
  ];
  const left = items.filter(i => !i.done).length;
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{`Getting started · ${3 - left} of 3`}</span>
        <button onClick={() => { localStorage.setItem(DONE, "1"); setHidden(true); }} className="-m-2 p-2 text-xs text-muted-foreground hover:text-foreground">Hide</button></div>
      <div className="space-y-2">{items.map(i => (
        <div key={i.title} className="flex items-center gap-3">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${i.done ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{i.done && <Check className="h-4 w-4" />}</span>
          <div className="min-w-0 flex-1"><div className={`font-medium ${i.done ? "text-muted-foreground line-through" : ""}`}>{i.title}</div>{!i.done && <div className="text-sm text-muted-foreground">{i.sub}</div>}</div>
          {!i.done && i.act && <button onClick={i.act.run} className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground">{i.act.label}</button>}
        </div>))}</div>
      {msg && <p role="status" className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>);
}
