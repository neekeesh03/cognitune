import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/FeedView";
import { api } from "@/lib/api";
import { withReact, type Post } from "@/store/useFeed";
import type { PeopleApi, Pub } from "@/store/usePeople";

interface ProfileData { user: Pub; bio: string; joined: number | null; self: boolean; friend: boolean; week?: number; month?: number; together?: number; posts?: Post[] }

/** A person's page: who they are, how they have been showing up, and what they posted. Friends see more than strangers. */
export function ProfileView({ username, people, onBack, onMessage, onSaved }: { username: string; people: PeopleApi; onBack: () => void; onMessage: (id: string) => void; onSaved?: () => void }) {
  const [d, setD] = useState<ProfileData | null>(null); const [err, setErr] = useState(""); const [bio, setBio] = useState(""); const [editing, setEditing] = useState(false); const [msg, setMsg] = useState("");
  const load = useCallback(async () => { try { const r = await api<ProfileData>("profile-view?u=" + encodeURIComponent(username)); setD(r); setBio(r.bio); setErr(""); } catch (e) { setErr((e as Error).message); } }, [username]);
  useEffect(() => { load(); }, [load]);
  const react = async (id: string, e: string) => {
    let next = ""; setD(x => x && { ...x, posts: x.posts?.map(p => { if (p.id !== id) return p; const y = withReact(p, e); next = y.mine; return y; }) });
    try { await api("post-react", { body: { id, e: next } }); } catch { load(); }
  };
  const remove = async (id: string) => { await api("post-del", { body: { id } }); setD(x => x && { ...x, posts: x.posts?.filter(p => p.id !== id) }); };
  const saveBio = async () => { try { await api("profile", { body: { bio } }); setEditing(false); setMsg("Saved."); onSaved?.(); load(); } catch (e) { setMsg((e as Error).message); } };
  const requested = d && people.outgoing.some(o => o.id === d.user.id);
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-4">
      <button onClick={onBack} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</button>
      {err && <p className="glass rounded-3xl p-6 text-center text-muted-foreground">{err}</p>}
      {!d && !err && <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>}
      {d && <>
        <section className="glass rounded-3xl p-6 text-center">
          <div className="mx-auto w-fit"><Avatar spec={d.user.avatar} size={104} /></div>
          <h1 className="mt-3 text-3xl">{d.user.name}</h1>
          <div className="text-sm text-muted-foreground">{`@${d.user.username}${d.joined ? ` · Joined ${new Date(d.joined).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : ""}`}</div>
          {editing ? (
            <div className="mx-auto mt-3 max-w-md text-start">
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} rows={2} aria-label="Your bio" placeholder="A line about you. For example: student, slowly finishing my thesis." className="w-full resize-none rounded-2xl bg-secondary/60 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="mt-2 flex items-center gap-2"><span className="text-xs text-muted-foreground">{bio.length}/160</span><Button size="sm" variant="ghost" className="ms-auto rounded-full" onClick={() => { setEditing(false); setBio(d.bio); }}>Cancel</Button><Button size="sm" variant="hero" className="rounded-full" onClick={saveBio}>Save</Button></div>
            </div>
          ) : (
            <p className="mx-auto mt-3 max-w-md whitespace-pre-wrap text-[15px]">{d.bio || (d.self ? "" : "No bio yet.")}</p>
          )}
          {d.self && !editing && <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => setEditing(true)}>{d.bio ? "Edit bio" : "Add a bio"}</Button>}
          {msg && <p className="mt-2 text-xs text-primary" role="status">{msg}</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {d.friend && <Button variant="hero" className="rounded-full" onClick={() => onMessage(d.user.id)}><MessageCircle className="mr-1.5 h-4 w-4" />Message</Button>}
            {!d.self && !d.friend && <Button variant="hero" className="rounded-full" disabled={!!requested} onClick={async () => { try { const s = await people.request(d.user.username); setMsg(s === "friends" ? `You and @${d.user.username} are now friends.` : `Request sent to @${d.user.username}.`); load(); } catch (e) { setMsg((e as Error).message); } }}><UserPlus className="mr-1.5 h-4 w-4" />{requested ? "Request sent" : "Add friend"}</Button>}
          </div>
        </section>
        {(d.self || d.friend) && (
          <section className="grid grid-cols-3 gap-2 text-center">
            <div className="glass rounded-3xl p-4"><div className="text-3xl font-semibold">{d.week ?? 0}</div><div className="text-xs text-muted-foreground">days started this week</div></div>
            <div className="glass rounded-3xl p-4"><div className="text-3xl font-semibold">{d.month ?? 0}</div><div className="text-xs text-muted-foreground">days started this month</div></div>
            <div className="glass rounded-3xl p-4"><div className="text-3xl font-semibold">{d.self ? (d.posts?.length ?? 0) : (d.together ?? 0)}</div><div className="text-xs text-muted-foreground">{d.self ? "posts" : "days you both started this week"}</div></div>
          </section>)}
        {(d.self || d.friend) ? (
          <section className="space-y-3">
            <h2 className="px-1 text-sm font-semibold text-muted-foreground">{d.self ? "Your posts" : "Posts"}</h2>
            {(d.posts ?? []).length === 0 && <p className="glass rounded-3xl p-5 text-center text-sm text-muted-foreground">{d.self ? "You have not posted yet. Share a small win from the feed." : "No posts yet."}</p>}
            {(d.posts ?? []).map(p => <PostCard key={p.id} p={p} feed={{ react, remove }} onReply={d.friend ? onMessage : undefined} />)}
          </section>
        ) : <p className="glass rounded-3xl p-5 text-center text-sm text-muted-foreground">Become friends to see how they are showing up and what they post.</p>}
      </>}
    </div>);
}
