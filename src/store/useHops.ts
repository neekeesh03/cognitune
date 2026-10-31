import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { notify } from "@/lib/notify";
import { track } from "@/lib/track";
import { rtLive, WAKE_EVENT } from "@/lib/realtime";

interface HopsResp { hops: Record<string, { ts: number }>; cheers: { from: string; ts: number }[] }
type Person = { id: string; name: string };

/** Who hopped in today, a one-tap cheer, and the signal you send when you start. No task text ever leaves the device. */
export function useHops(friends: Person[], active = true) {
  const [hops, setHops] = useState<Record<string, number>>({});
  const [cheered, setCheered] = useState<Record<string, number>>({});
  const seenHop = useRef<Record<string, number>>({}); const seenCheer = useRef(Date.now()); const first = useRef(true);
  const fr = useRef(friends); fr.current = friends;
  const poll = useCallback(async () => {
    try {
      const r = await api<HopsResp>("hops");
      const next: Record<string, number> = {}; Object.entries(r.hops).forEach(([id, v]) => { next[id] = v.ts; });
      if (!first.current) Object.entries(next).forEach(([id, ts]) => { if (ts > (seenHop.current[id] ?? 0)) { const f = fr.current.find(x => x.id === id); if (f) notify({ id: `hop:${id}:${ts}`, tag: "hop:" + id, title: f.name + " hopped in", body: "Your turn? One small start is enough." }); } });
      seenHop.current = next; first.current = false; setHops(next);
      r.cheers.filter(c => c.ts > seenCheer.current).forEach(c => { const f = fr.current.find(x => x.id === c.from); notify({ id: `cheer:${c.from}:${c.ts}`, tag: "cheer:" + c.from, title: (f?.name ?? "A friend") + " cheered you on", body: "Nice hop." }); });
      if (r.cheers.length) seenCheer.current = Math.max(seenCheer.current, ...r.cheers.map(c => c.ts));
    } catch { /* offline or signed out: stay quiet */ }
  }, []);
  useEffect(() => {
    if (!active) return; poll();
    let n = 0; const t = setInterval(() => { if (!rtLive() || ++n % 4 === 0) poll(); }, document.hidden ? 120000 : 45000);
    const w = (e: Event) => { const k = (e as CustomEvent).detail; if (k === "h") poll(); };
    window.addEventListener(WAKE_EVENT, w);
    return () => { clearInterval(t); window.removeEventListener(WAKE_EVENT, w); };
  }, [active, poll]);
  const hopIn = useCallback(() => { api("hop", { body: {} }).catch(() => undefined); }, []);
  const cheer = useCallback(async (id: string) => { setCheered(c => ({ ...c, [id]: Date.now() })); track("hop_cheer"); try { await api("cheer", { body: { to: id } }); } catch { /* ignore */ } }, []);
  return { hops, cheered, hopIn, cheer };
}
export type HopsApi = ReturnType<typeof useHops>;
