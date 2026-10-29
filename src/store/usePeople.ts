// Friends, requests and presence, kept fresh by polling the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AvatarSpec } from "@/engine/avatar";
import { openJson } from "@/lib/e2ee";
import { track } from "@/lib/track";
export interface Pub { id: string; username: string; name: string; avatar: AvatarSpec; pk?: string | null }
export interface Friend extends Pub { online: boolean; unread: number; last: { text: string; ts: number; mine: boolean } | null }
interface RawFriend extends Omit<Friend, "last"> { last: { enc: string | null; text: string; ts: number; mine: boolean } | null }
interface MeResp { user: Pub; friends: RawFriend[]; incoming: Pub[]; outgoing: Pub[] }

export function usePeople(active: boolean, onNew?: (f: Friend) => void) {
  const [friends, setFriends] = useState<Friend[]>([]); const [incoming, setIncoming] = useState<Pub[]>([]); const [outgoing, setOutgoing] = useState<Pub[]>([]); const [ready, setReady] = useState(false);
  const prev = useRef<Record<string, number>>({}); const cb = useRef(onNew); cb.current = onNew;
  const refresh = useCallback(async () => {
    try {
      const r = await api<MeResp>("me");
      const friends: Friend[] = await Promise.all(r.friends.map(async f => {
        if (!f.last) return { ...f, last: null };
        let text = f.last.text;
        if (f.last.enc) { try { const c = await openJson<{ text?: string; file?: unknown }>(r.user.id, f.pk || "", f.last.enc); text = c.file ? "Sent a file" : c.text || "Message"; } catch { text = "Private message"; } }
        return { ...f, last: { text, ts: f.last.ts, mine: f.last.mine } };
      }));
      setFriends(friends); setIncoming(r.incoming); setOutgoing(r.outgoing); setReady(true);
      friends.forEach(f => { if (f.unread > (prev.current[f.id] ?? f.unread)) cb.current?.(f); prev.current[f.id] = f.unread; });
    } catch { /* offline or signed out: keep what we have */ }
  }, []);
  useEffect(() => {
    if (!active) return; refresh();
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 15000); const v = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", v); return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [active, refresh]);
  const request = useCallback(async (username: string) => { const r = await api<{ status: string }>("friend-request", { body: { username } }); track("invite"); await refresh(); return r.status; }, [refresh]);
  const respond = useCallback(async (id: string, accept: boolean) => { await api("friend-respond", { body: { id, accept } }); await refresh(); }, [refresh]);
  const remove = useCallback(async (id: string, block = false) => { await api("friend-remove", { body: { id, block } }); await refresh(); }, [refresh]);
  return { friends, incoming, outgoing, ready, refresh, request, respond, remove };
}
export type PeopleApi = ReturnType<typeof usePeople>;
export const totalUnread = (f: Friend[]) => f.reduce((a, x) => a + x.unread, 0);
