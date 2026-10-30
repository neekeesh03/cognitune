import { useState } from "react";
import { MessageCircle, MoreHorizontal, SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { Mascot } from "@/components/Mascot";
import { EmojiPicker, QUICK_REACTIONS, onlyEmoji } from "@/components/EmojiPicker";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/notify";
import type { FeedApi, Post, PostKind } from "@/store/useFeed";
import type { AvatarSpec } from "@/engine/avatar";

const KIND: Record<PostKind, { label: string; badge: string }> = {
  update: { label: "Update", badge: "" },
  win: { label: "Small win 🎉", badge: "Small win 🎉" },
  help: { label: "Need a nudge 🙏", badge: "Needs a nudge 🙏" },
};

export function Composer({ feed, me }: { feed: FeedApi; me: { avatar: AvatarSpec; name: string } }) {
  const [text, setText] = useState(""); const [kind, setKind] = useState<PostKind>("update"); const [team, setTeam] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const post = async () => { if (!text.trim()) return; setBusy(true); setErr(""); try { await feed.create(text.trim(), kind, team); setText(""); setKind("update"); setTeam(false); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex gap-3">
        <Avatar spec={me.avatar} size={44} />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={600} aria-label="Write a post" placeholder="Share a small win, an update, or ask for a nudge..." className="min-h-[3.5rem] flex-1 resize-none rounded-2xl bg-secondary/50 px-3.5 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <EmojiPicker onPick={e => setText(t => t + e)} />
        {(Object.keys(KIND) as PostKind[]).map(k => <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1.5 text-sm ${kind === k ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{KIND[k].label}</button>)}
        {feed.canTeam && <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={team} onChange={e => setTeam(e.target.checked)} />Post to everyone as the Lagomo team</label>}
        <Button variant="hero" className="ms-auto rounded-full px-6" disabled={busy || !text.trim()} onClick={post}>Post</Button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">Only your friends see your posts. Posts are stored on our server for 90 days, and are not end-to-end encrypted like chat.</p>
    </div>);
}

export function PostCard({ p, feed, onProfile, onReply }: { p: Post; feed: Pick<FeedApi, "react" | "remove">; onProfile?: (username: string) => void; onReply?: (id: string) => void }) {
  const [picking, setPicking] = useState(false); const [menu, setMenu] = useState(false); const [note, setNote] = useState("");
  const name = p.team ? "Lagomo team" : p.author?.name ?? "Someone";
  const report = async () => { setMenu(false); const reason = prompt("What is the problem with this post? (for example: spam, rude, unsafe)"); if (!reason || !p.author) return; try { await api("report", { body: { id: p.author.id, reason: "post: " + reason.slice(0, 30), text: p.text } }); setNote("Thanks. The Lagomo team will take a look."); } catch (e) { setNote((e as Error).message); } };
  return (
    <article className={`rounded-3xl p-4 ${p.team ? "border border-primary/30" : "glass"}`} style={p.team ? { background: "linear-gradient(160deg, hsl(var(--f-grain) / .18), hsl(var(--primary) / .08))" } : undefined}>
      <header className="flex items-center gap-3">
        <button disabled={p.team || !p.author || !onProfile} onClick={() => p.author && onProfile?.(p.author.username)} aria-label={`Open ${name}'s profile`} className="shrink-0">{p.team || !p.author ? <Mascot size={42} /> : <Avatar spec={p.author.avatar} size={42} />}</button>
        <div className="min-w-0 flex-1">
          <button disabled={p.team || !onProfile} onClick={() => p.author && onProfile?.(p.author.username)} className="block truncate text-start font-semibold hover:underline disabled:no-underline"><span translate={p.team ? undefined : "no"}>{name}</span></button>
          <div className="text-xs text-muted-foreground">{timeAgo(p.ts)}{p.team ? " · From the Lagomo team" : ""}</div>
        </div>
        {KIND[p.kind]?.badge && <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{KIND[p.kind].badge}</span>}
        <div className="relative">
          <button aria-label="More" onClick={() => setMenu(m => !m)} className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          {menu && <div className="absolute end-0 top-8 z-20 w-40 rounded-2xl border border-border bg-popover p-1 text-sm shadow-lg">
            {p.canDelete && <button onClick={async () => { setMenu(false); if (confirm("Delete this post?")) { try { await feed.remove(p.id); } catch (e) { setNote((e as Error).message); } } }} className="block w-full rounded-xl px-3 py-2 text-start hover:bg-foreground/[.06]">Delete post</button>}
            {!p.own && !p.team && <button onClick={report} className="block w-full rounded-xl px-3 py-2 text-start hover:bg-foreground/[.06]">Report</button>}
          </div>}
        </div>
      </header>
      <div translate="no" dir="auto" className={`mt-3 whitespace-pre-wrap break-words text-start ${onlyEmoji(p.text) ? "text-5xl leading-tight" : "text-[15px]"}`}>{p.text}</div>
      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        {Object.entries(p.reacts).sort((a, b) => b[1] - a[1]).map(([e, n]) => <button key={e} onClick={() => feed.react(p.id, e)} className={`rounded-full border px-2 text-sm leading-7 ${p.mine === e ? "border-primary bg-primary/15" : "border-border bg-background/60"}`}>{e} {n}</button>)}
        <div className="relative">
          <button aria-label="React" onClick={() => setPicking(x => !x)} className="flex items-center rounded-full border border-border px-2 py-1 text-muted-foreground hover:text-foreground"><SmilePlus className="h-4 w-4" /></button>
          {picking && <div className="absolute bottom-9 start-0 z-20 flex gap-0.5 rounded-full border border-border bg-popover p-1 shadow-lg">{QUICK_REACTIONS.map(e => <button key={e} onClick={() => { setPicking(false); feed.react(p.id, e); }} aria-label={e} className={`rounded-full px-1.5 py-0.5 text-xl leading-none transition hover:scale-125 ${p.mine === e ? "bg-primary/20" : ""}`}>{e}</button>)}</div>}
        </div>
        {!p.own && !p.team && p.author && onReply && <button onClick={() => onReply(p.author!.id)} className="ms-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="h-4 w-4" /><span>Reply privately</span></button>}
      </footer>
      {note && <p role="status" className="mt-2 text-xs text-primary">{note}</p>}
    </article>);
}

export function FeedView({ feed, me, onProfile, onReply, hasFriends, onInvite }: { feed: FeedApi; me: { avatar: AvatarSpec; name: string }; onProfile: (u: string) => void; onReply: (id: string) => void; hasFriends: boolean; onInvite: () => void }) {
  return (
    <div className="space-y-3">
      <Composer feed={feed} me={me} />
      {!feed.ready && <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>}
      {feed.ready && feed.posts.length === 0 && (
        <div className="glass rounded-3xl p-6 text-center">
          <div className="mx-auto mb-2 w-fit"><Mascot size={52} /></div>
          <p className="font-semibold">Nothing here yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">{hasFriends ? "Post a small win. Your friends will see it here." : "Your feed shows posts from your friends. Invite one to get started."}</p>
          {!hasFriends && <Button variant="hero" className="mt-3 rounded-full" onClick={onInvite}>Invite a friend</Button>}
        </div>)}
      {feed.posts.map(p => <PostCard key={p.id} p={p} feed={feed} onProfile={onProfile} onReply={onReply} />)}
      {feed.ready && feed.more && feed.posts.length > 0 && <div className="text-center"><Button variant="ghost" className="rounded-full" onClick={() => feed.older().catch(() => undefined)}>Show older posts</Button></div>}
    </div>);
}
