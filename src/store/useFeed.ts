import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { track } from "@/lib/track";
import type { Pub } from "@/store/usePeople";

export type PostKind = "update" | "win" | "help";
export interface Post { id: string; ts: number; text: string; kind: PostKind; team: boolean; author: Pub | null; reacts: Record<string, number>; mine: string; own: boolean; canDelete: boolean }

/** Applies a reaction change to a post locally, so taps feel instant. */
export const withReact = (p: Post, e: string): Post => {
  const reacts = { ...p.reacts };
  if (p.mine) { reacts[p.mine] = (reacts[p.mine] || 1) - 1; if (reacts[p.mine] <= 0) delete reacts[p.mine]; }
  const next = p.mine === e ? "" : e; if (next) reacts[next] = (reacts[next] || 0) + 1;
  return { ...p, reacts, mine: next };
};

/** Friends-only feed, newest first. */
export function useFeed(active: boolean) {
  const [posts, setPosts] = useState<Post[]>([]); const [canTeam, setCanTeam] = useState(false); const [ready, setReady] = useState(false); const [more, setMore] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const r = await api<{ posts: Post[]; canTeam: boolean }>("feed"); setPosts(r.posts); setCanTeam(r.canTeam); setMore(r.posts.length >= 30); setReady(true); setError(""); } catch (e) { setError((e as Error).message); setReady(true); }
  }, []);
  useEffect(() => { if (!active) return; load(); const t = setInterval(() => { if (!document.hidden) load(); }, 60000); return () => clearInterval(t); }, [active, load]);
  const older = useCallback(async () => {
    const last = posts[posts.length - 1]; if (!last) return;
    const r = await api<{ posts: Post[] }>("feed?before=" + last.ts); setPosts(p => [...p, ...r.posts.filter(x => !p.some(y => y.id === x.id))]); setMore(r.posts.length >= 30);
  }, [posts]);
  const create = useCallback(async (text: string, kind: PostKind, team = false) => {
    const r = await api<{ post: Post }>("post", { body: { text, kind, team } }); setPosts(p => [r.post, ...p]); track("post_create", { kind });
  }, []);
  const react = useCallback(async (id: string, e: string) => {
    let next = ""; setPosts(p => p.map(x => { if (x.id !== id) return x; const y = withReact(x, e); next = y.mine; return y; }));
    track("post_react"); try { await api("post-react", { body: { id, e: next } }); } catch { load(); }
  }, [load]);
  const remove = useCallback(async (id: string) => { await api("post-del", { body: { id } }); setPosts(p => p.filter(x => x.id !== id)); }, []);
  return { posts, canTeam, ready, more, error, load, older, create, react, remove, setPosts };
}
export type FeedApi = ReturnType<typeof useFeed>;
