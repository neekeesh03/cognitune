import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Block } from "@/engine/plan";
import type { ExtEvent } from "@/engine/calendar";

const K = "cognitune.cal.v1"; const STALE = 15 * 60e3;
interface St { url: string; events: ExtEvent[]; fetched: number; feed: boolean; token: string | null }
const load = (): St => { try { return { url: "", events: [], fetched: 0, feed: false, token: null, ...JSON.parse(localStorage.getItem(K) || "{}") }; } catch { return { url: "", events: [], fetched: 0, feed: false, token: null }; } };

export function useCalendar(blocks: Block[]) {
  const [st, setSt] = useState<St>(load); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { localStorage.setItem(K, JSON.stringify(st)); }, [st]);
  const refresh = useCallback(async (url = st.url) => {
    if (!url) return; setBusy(true); setError("");
    try { const r = await api<{ events: ExtEvent[] }>("cal-import", { body: { url } }); setSt(s => ({ ...s, url, events: r.events, fetched: Date.now() })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [st.url]);
  useEffect(() => { if (st.url && Date.now() - st.fetched > STALE) refresh(); }, []); // eslint-disable-line
  const connect = useCallback(async (url: string) => { await refresh(url.trim()); }, [refresh]);
  const disconnect = useCallback(() => setSt(s => ({ ...s, url: "", events: [], fetched: 0 })), []);
  const enableFeed = useCallback(async () => { setError(""); try { const r = await api<{ token: string }>("cal-feed-on", { body: {} }); setSt(s => ({ ...s, feed: true, token: r.token })); await api("cal-sync", { body: { blocks } }); } catch (e) { setError((e as Error).message); } }, [blocks]);
  const disableFeed = useCallback(async () => { try { await api("cal-feed-off", { body: {} }); } catch { /* ignore */ } setSt(s => ({ ...s, feed: false, token: null })); }, []);
  // keep the feed fresh while it is on
  const t = useRef<number>();
  useEffect(() => { if (!st.feed) return; window.clearTimeout(t.current); t.current = window.setTimeout(() => { api("cal-sync", { body: { blocks } }).catch(() => {}); }, 2500); return () => window.clearTimeout(t.current); }, [blocks, st.feed]);
  return { url: st.url, events: st.events, fetched: st.fetched, feed: st.feed, token: st.token, busy, error, refresh, connect, disconnect, enableFeed, disableFeed };
}
export type CalendarApi = ReturnType<typeof useCalendar>;
