// Live "someone is starting with me" presence for a shared focus session. Sends only a tiny state word, never what you are working on.
import { useEffect, useRef, useState } from "react";
import { WAKE_EVENT } from "@/lib/realtime";
import { api } from "@/lib/api";
import type { AvatarSpec } from "@/engine/avatar";
export type BuddyState = "none" | "waiting" | "working" | "done" | "left";
export interface Buddy { sid: string; friendId: string; name: string; room?: boolean }
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

// The Corner: a room of 2 to 6 friends. Same rule as before: only a state word is shared, never what you are working on.
export interface RoomMember { id: string; name: string; avatar: AvatarSpec; state: BuddyState; e?: string; et?: number }
/** One small cheer to everyone in the room. It floats up for a moment on their screens. */
export const roomCheer = (sid: string, state: "waiting" | "working" | "done", e: string) => api("room-ping", { body: { sid, state, e } }).catch(() => undefined);
export function useRoom(sid: string | null | undefined, mine: "waiting" | "working" | "done") {
  const [members, setMembers] = useState<RoomMember[]>([]); const me = useRef(mine); me.current = mine;
  useEffect(() => {
    if (!sid) return; let live = true;
    const tick = async () => { try { const r = await api<{ members: RoomMember[] }>("room-ping", { body: { sid, state: me.current } }); if (live) setMembers(r.members); } catch { /* offline: keep last */ } };
    tick(); const t = setInterval(tick, 8000);
    const onWake = (ev: Event) => { if ((ev as CustomEvent).detail === "r") tick(); }; window.addEventListener(WAKE_EVENT, onWake);
    return () => { live = false; clearInterval(t); window.removeEventListener(WAKE_EVENT, onWake); api("room-ping", { body: { sid, state: "left" } }).catch(() => {}); };
  }, [sid]);
  return members;
}
