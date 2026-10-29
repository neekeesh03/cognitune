// Live "someone is starting with me" presence for a shared focus session. Sends only a tiny state word, never what you are working on.
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
export type BuddyState = "none" | "waiting" | "working" | "done" | "left";
export interface Buddy { sid: string; friendId: string; name: string }
export function useBuddy(b: Buddy | null | undefined, mine: "waiting" | "working" | "done") {
  const [state, setState] = useState<BuddyState>("none"); const me = useRef(mine); me.current = mine;
  useEffect(() => {
    if (!b) return; let live = true;
    const tick = async () => { try { await api("session-ping", { body: { sid: b.sid, w: b.friendId, state: me.current } }); const r = await api<{ state: BuddyState }>(`session-state?sid=${encodeURIComponent(b.sid)}&w=${b.friendId}`); if (live) setState(r.state); } catch { /* offline: keep last */ } };
    tick(); const t = setInterval(tick, 10000);
    return () => { live = false; clearInterval(t); api("session-ping", { body: { sid: b.sid, w: b.friendId, state: "left" } }).catch(() => {}); };
  }, [b?.sid]); // eslint-disable-line
  return state;
}
