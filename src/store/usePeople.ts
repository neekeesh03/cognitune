// Friends, requests and presence, kept fresh by polling the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { AvatarSpec } from "@/engine/avatar";
export interface Pub { id: string; username: string; name: string; avatar: AvatarSpec }
export interface Friend extends Pub { online: boolean; unread: number; last: { text: string; ts: number; mine: boolean } | null }
interface MeResp { user: Pub; friends: Friend[]; incoming: Pub[]; outgoing: Pub[] }

export function usePeople(active: boolean, onNew?: (f: Friend) => void) {
  const [friends, setFriends] = useState<Friend[]>([]); const [incoming, setIncoming] = useState<Pub[]>([]); const [outgoing, setOutgoing] = useState<Pub[]>([]); const [ready, setReady] = useState(false);
  const prev = useRef<Record<string, number>>({}); const cb = useRef(onNew); cb.current = onNew;
  const refresh = useCallback(async () => {
    try {
      const r = await api<MeResp>("me"); setFriends(r.friends); setIncoming(r.incoming); setOutgoing(r.outgoing); setReady(true);
      r.friends.forEach(f => { if (f.unread > (prev.current[f.id] ?? f.unread)) cb.current?.(f); prev.current[f.id] = f.unread; });
    } catch { /* offline or signed out: keep what we have */ }
  }, []);
  useEffect(() => {
    if (!active) return; refresh();
    const t = setInterval(() => { if (!document.hidden) refresh(); }, 15000); const v = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", v); return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [active, refresh]);
  const request = useCallback(async (username: string) => { const r = await api<{ status: string }>("friends/request", { body: { username } }); await refresh(); return r.status; }, [refresh]);
  const respond = useCallback(async (id: string, accept: boolean) => { await api("friends/respond", { body: { id, accept } }); await refresh(); }, [refresh]);
  const remove = useCallback(async (id: string, block = false) => { await api("friends/remove", { body: { id, block } }); await refresh(); }, [refresh]);
  return { friends, incoming, outgoing, ready, refresh, request, respond, remove };
}
export type PeopleApi = ReturnType<typeof usePeople>;
export const totalUnread = (f: Friend[]) => f.reduce((a, x) => a + x.unread, 0);
