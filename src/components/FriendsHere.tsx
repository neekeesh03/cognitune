import { useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { shareInvite } from "@/lib/invite";
import { track } from "@/lib/track";
import type { Friend } from "@/store/usePeople";
import type { HopsApi } from "@/store/useHops";
import type { BurrowApi } from "@/store/useBurrow";

const ago = (ts: number) => { const m = Math.max(1, Math.round((Date.now() - ts) / 60000)); return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };

/** One calm place for people: who started today (with a cheer), and how many days you have started together. No feed, no scores. */
const QUEST = 3; // days you both start within a week
const weekKey = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

export function FriendsHere({ friends, hops, burrow, username, onOpen, onQuestDone }: { friends: Friend[]; hops: HopsApi; burrow: BurrowApi; username: string; onOpen: (id: string) => void; onQuestDone?: (f: Friend) => void }) {
  const [msg, setMsg] = useState("");
  useEffect(() => { // a small celebration, once per friend per week
    friends.forEach(f => { if ((burrow.pairs[f.id]?.both ?? 0) >= QUEST) { const k = `lagomo.quest.${weekKey()}.${f.id}`; if (!localStorage.getItem(k)) { localStorage.setItem(k, "1"); onQuestDone?.(f); } } });
  }, [friends, burrow.pairs]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!friends.length) return (
    <div className="glass rounded-3xl p-5 text-center">
      <div className="font-semibold">Starting is easier with someone</div>
      <p className="mt-1 text-sm text-muted-foreground">Send a friend your link. They will see you hop in. Nothing else.</p>
      <button onClick={async () => { const r = await shareInvite(username); track("invite_share"); setMsg(r === "copied" ? "Link copied. Paste it to a friend." : r === "failed" ? "Could not share." : "Sent."); }} className="mt-3 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Send my link</button>
      {msg && <p role="status" className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>);
  const rank = (f: Friend) => (hops.hops[f.id] ? 1e13 + hops.hops[f.id] : 0) + (burrow.pairs[f.id]?.both ?? 0) * 1e9 + (f.online ? 1e8 : 0);
  const list = [...friends].sort((a, b) => rank(b) - rank(a)).slice(0, 4);
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 text-sm font-semibold">Your people</div>
      <div className="space-y-1">
        {list.map(f => {
          const hopped = hops.hops[f.id]; const days = burrow.pairs[f.id]?.both ?? 0;
          const sub = hopped ? `Started ${ago(hopped)}` : days >= QUEST ? "Together quest done. Lovely." : days > 0 ? `${days} of ${QUEST} days together this week` : f.online ? "Here now" : "";
          return (
            <div key={f.id} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-secondary/50">
              <button onClick={() => onOpen(f.id)} className="flex min-w-0 flex-1 items-center gap-3 text-start" aria-label={`Open chat with ${f.name}`}>
                <span className="relative"><Avatar spec={f.avatar} size={38} />{(hopped || f.online) && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-success" />}</span>
                <span className="min-w-0"><span className="block truncate font-medium" translate="no">{f.name}</span>{sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}</span>
                {days > 0 && <span className="ms-auto flex shrink-0 gap-1" aria-hidden="true">{Array.from({ length: QUEST }, (_, i) => <span key={i} className={`h-2 w-2 rounded-full ${i < days ? "bg-primary" : "bg-foreground/15"}`} />)}</span>}
              </button>
              {hopped && <button disabled={!!hops.cheered[f.id]} onClick={() => hops.cheer(f.id)} className="shrink-0 rounded-full bg-primary/15 px-3 py-1.5 text-sm text-primary disabled:opacity-60">{hops.cheered[f.id] ? "Cheered" : "Cheer"}</button>}
            </div>);
        })}
      </div>
    </div>);
}
