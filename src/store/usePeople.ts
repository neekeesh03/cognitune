// Friends, requests and presence, kept fresh by polling the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AvatarSpec } from "@/engine/avatar";
import { openJson } from "@/lib/e2ee";
import { track } from "@/lib/track";
import { rtLive, startRealtime, WAKE_EVENT } from "@/lib/realtime";
export interface Pub { id: string; username: string; name: string; avatar: AvatarSpec; pk?: string | null; bio?: string }
export interface Friend extends Pub { online: boolean; lastSeen?: number | null; unread: number; last: { text: string; ts: number; mine: boolean } | null }
interface RawFriend extends Omit<Friend, "last"> { last: { enc: string | null; text: string; ts: number; mine: boolean } | null }
interface MeResp { rt?: { url: string; key: string; ch: string } | null; user: Pub; friends: RawFriend[]; incoming: Pub[]; outgoing: Pub[] }

export function usePeople(active: boolean, onNew?: (f: Friend, delta: number) => void) {
  const [friends, setFriends] = useState<Friend[]>([]); const [incoming, setIncoming] = useState<Pub[]>([]); const [outgoing, setOutgoing] = useState<Pub[]>([]); const [ready, setReady] = useState(false);
  const prev = useRef<Record<string, number>>({}); const cb = useRef(onNew); cb.current = onNew;
  const refresh = useCallback(async () => {
    try {
      const r = await api<MeResp>("me"); startRealtime(r.rt);
      const friends: Friend[] = await Promise.all(r.friends.map(async f => {
        if (!f.last) return { ...f, last: null };
        let text = f.last.text;
        if (f.last.enc) { try { const c = await openJson<{ text?: string; file?: unknown; react?: { e: string } }>(r.user.id, f.pk || "", f.last.enc); text = c.file ? "Sent a file" : c.react ? (c.react.e || "Message") : c.text || "Message"; } catch { text = "Private message"; } }
        return { ...f, last: { text, ts: f.last.ts, mine: f.last.mine } };
      }));
      setFriends(friends); setIncoming(r.incoming); setOutgoing(r.outgoing); setReady(true);
      friends.forEach(f => { const before = prev.current[f.id] ?? f.unread; if (f.unread > before) cb.current?.(f, f.unread - before); prev.current[f.id] = f.unread; });
    } catch { /* offline or signed out: keep what we have */ }
  }, []);
  useEffect(() => {
    if (!active) return; refresh();
    let n = 0; const t = setInterval(() => { if (!rtLive() || ++n % 4 === 0) refresh(); }, document.hidden ? 120000 : 30000); const v = () => { if (!document.hidden) refresh(); };
    let dbn = 0; const w = (e: Event) => { const k = (e as CustomEvent).detail; if (k === "t" || k === "r") return; window.clearTimeout(dbn); dbn = window.setTimeout(refresh, 3000); };
    document.addEventListener("visibilitychange", v); window.addEventListener(WAKE_EVENT, w); return () => { clearInterval(t); window.clearTimeout(dbn); document.removeEventListener("visibilitychange", v); window.removeEventListener(WAKE_EVENT, w); };
  }, [active, refresh]);
  const request = useCallback(async (username: string) => { const r = await api<{ status: string }>("friend-request", { body: { username } }); track("invite"); await refresh(); return r.status; }, [refresh]);
  const respond = useCallback(async (id: string, accept: boolean) => { await api("friend-respond", { body: { id, accept } }); await refresh(); }, [refresh]);
  const remove = useCallback(async (id: string, block = false) => { await api("friend-remove", { body: { id, block } }); await refresh(); }, [refresh]);
  return { friends, incoming, outgoing, ready, refresh, request, respond, remove };
}
export type PeopleApi = ReturnType<typeof usePeople>;
export const totalUnread = (f: Friend[]) => f.reduce((a, x) => a + x.unread, 0);
