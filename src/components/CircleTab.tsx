import { useEffect, useRef, useState } from "react";
import { lastSeenText } from "@/lib/notify";
import { inviteText } from "@/lib/invite";
import { EmojiPicker, QUICK_REACTIONS, onlyEmoji } from "@/components/EmojiPicker";
import { FeedView } from "@/components/FeedView";
import { ProfileView } from "@/components/ProfileView";
import { useFeed } from "@/store/useFeed";
import { track } from "@/lib/track";
import type { Pair } from "@/store/useBurrow";
import AlertsCard from "@/components/AlertsCard";
import { ArrowLeft, Check, CheckCheck, Copy, Download, FileText, Paperclip, Plus, Search, Send, Share2, Sparkles, Timer, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/api";
import { fetchFileUrl } from "@/net/blobs";
import { loadKey, safetyCode } from "@/lib/e2ee";
import type { AvatarSpec } from "@/engine/avatar";
import { useChat, type ChatMsg } from "@/net/useChat";
import { inviteToRoom } from "@/net/room";
import type { Friend, PeopleApi, Pub } from "@/store/usePeople";
import type { User } from "@/store/useAuth";
import type { GameApi } from "@/store/useGame";

const fmtSize = (n: number) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
interface Props { pairs?: Record<string, Pair>; people: PeopleApi; game: GameApi; me: User; openId: string | null; setOpenId: (id: string | null) => void; startSession: (name: string, dur: number, buddy?: { sid: string; friendId: string; name: string; avatar: AvatarSpec; room?: boolean }) => void }

export function CircleTab(props: Props) {
  const { people, me, openId, setOpenId } = props;
  const [profile, setProfile] = useState<string | null>(null);
  const [view, setView] = useState<"feed" | "friends">(() => (localStorage.getItem("lagomo.circleView") === "friends" ? "friends" : "feed"));
  const feed = useFeed(view === "feed" && !openId && !profile);
  const pick = (v: "feed" | "friends") => { setView(v); localStorage.setItem("lagomo.circleView", v); };
  const openProfile = (u: string) => { setProfile(u); track("profile_view"); window.scrollTo({ top: 0 }); };
  const f = people.friends.find(x => x.id === openId);
  if (profile) return <ProfileView username={profile} people={people} onBack={() => setProfile(null)} onMessage={id => { setProfile(null); setOpenId(id); }} onSaved={() => people.refresh()} />;
  if (f) return <Conversation {...props} f={f} back={() => setOpenId(null)} openProfile={openProfile} />;
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-5">
      <div className="text-center"><h1 className="text-4xl">Your circle</h1></div>
      <div className="glass mx-auto flex w-fit gap-1 rounded-full p-1" role="tablist" aria-label="Circle">
        {(["feed", "friends"] as const).map(v => <button key={v} role="tab" aria-selected={view === v} onClick={() => pick(v)} className={`rounded-full px-5 py-2 text-sm ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v === "feed" ? "Feed" : "Friends and chats"}</button>)}
      </div>
      {view === "feed"
        ? <FeedView feed={feed} me={me} hasFriends={people.friends.length > 0} onProfile={openProfile} onReply={id => setOpenId(id)} onInvite={() => pick("friends")} />
        : <Home {...props} openProfile={openProfile} />}
    </div>);
}

function Corner({ people, me, startSession }: Pick<Props, "people" | "me" | "startSession">) {
  const [open, setOpen] = useState(false); const [pick, setPick] = useState<string[]>([]); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setPick(p => (p.includes(id) ? p.filter(x => x !== id) : p.length < 5 ? [...p, id] : p));
  const go = async (dur: number) => { setErr(""); setBusy(true); try { const sid = await inviteToRoom(me.id, people.friends.filter(f => pick.includes(f.id)), dur); setOpen(false); setPick([]); startSession("The Corner", dur, { sid, friendId: "", name: "The Corner", avatar: me.avatar, room: true }); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  if (people.friends.length === 0) return null;
  return (
    <div className="glass space-y-3 rounded-3xl p-4">
      <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">The Corner</div><div className="text-xs text-muted-foreground">Work side by side with up to 5 friends. No cameras, just company.</div></div>{!open && <Button variant="hero" size="sm" className="rounded-full" onClick={() => setOpen(true)}>Open a corner</Button>}</div>
      {open && <>
        <div className="flex flex-wrap gap-2">{people.friends.map(f => <button key={f.id} aria-pressed={pick.includes(f.id)} onClick={() => toggle(f.id)} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${pick.includes(f.id) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}><Avatar spec={f.avatar} size={22} />{f.name.split(" ")[0]}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">{pick.length === 0 ? "Pick who to invite, then how long." : `${pick.length} invited`}</span>{[15, 25, 45].map(d => <Button key={d} size="sm" variant="hero" className="rounded-full" disabled={!pick.length || busy} onClick={() => go(d)}>{d} min</Button>)}<Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setOpen(false); setPick([]); }}>Cancel</Button></div>
        {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
      </>}
    </div>);
}

function Home({ people, game, me, setOpenId, startSession, pairs, openProfile }: Props & { openProfile: (u: string) => void }) {
  const [q, setQ] = useState(""); const [found, setFound] = useState<Pub[]>([]); const [msg, setMsg] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => { if (q.trim().length < 2) { setFound([]); return; } const t = setTimeout(() => api<{ users: Pub[] }>("search?q=" + encodeURIComponent(q.trim())).then(r => setFound(r.users)).catch(() => {}), 250); return () => clearTimeout(t); }, [q]);
  const status = (id: string) => people.friends.some(f => f.id === id) ? "friend" : people.outgoing.some(f => f.id === id) ? "sent" : people.incoming.some(f => f.id === id) ? "incoming" : "none";
  const add = async (username: string) => { setMsg(""); try { const s = await people.request(username); if (s === "friends") game.earn("nudge", { people: 1 }); setMsg(s === "friends" ? `You and @${username} are now friends.` : `Request sent to @${username}.`); } catch (e) { setMsg((e as Error).message); } };
  const invite = inviteText(me.username);
  const share = async () => { localStorage.setItem("lagomo.invited", "1"); if (navigator.share) { try { await navigator.share({ title: "Join me on Lagomo", text: invite }); return; } catch { /* cancelled */ } } await navigator.clipboard?.writeText(invite).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-5">
      <p className="mx-auto max-w-md text-center text-muted-foreground">Chat with the people who help you start. Send messages and files, work side by side.</p>
      <div className="glass flex items-center gap-4 rounded-3xl p-4"><button aria-label="Open your profile" onClick={() => openProfile(me.username)}><Avatar spec={me.avatar} size={56} /></button><div className="min-w-0 flex-1"><button onClick={() => openProfile(me.username)} className="font-semibold hover:underline">{me.name}</button><div className="text-sm text-muted-foreground">@{me.username}</div></div>
        <Button variant="hero" className="rounded-full" onClick={share}>{copied ? <><Check className="mr-1 h-4 w-4" />Copied</> : <><Share2 className="mr-1 h-4 w-4" />Invite friends</>}</Button></div>
      {people.incoming.length > 0 && <div className="glass space-y-2 rounded-3xl p-4"><div className="text-sm font-semibold">Friend requests</div>{people.incoming.map(u => (
        <div key={u.id} className="flex items-center gap-3"><Avatar spec={u.avatar} size={40} /><div className="min-w-0 flex-1"><div className="truncate font-medium">{u.name}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
          <Button size="sm" variant="hero" className="rounded-full" onClick={() => { people.respond(u.id, true); game.earn("nudge", { people: 1 }); }}>Accept</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={() => people.respond(u.id, false)}>Decline</Button></div>))}</div>}
      <div className="glass space-y-3 rounded-3xl p-4">
        <div className="text-sm font-semibold">Add a friend</div>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="h-11 rounded-2xl bg-secondary/60 pl-9" placeholder="Search by username" autoCapitalize="none" value={q} onChange={e => setQ(e.target.value.replace(/[^a-zA-Z0-9_@]/g, "").replace("@", ""))} /></div>
        {found.map(u => { const s = status(u.id); return (
          <div key={u.id} className="flex items-center gap-3"><Avatar spec={u.avatar} size={40} /><div className="min-w-0 flex-1"><div className="truncate font-medium">{u.name}</div><div className="text-xs text-muted-foreground">@{u.username}</div></div>
            {s === "none" || s === "incoming" ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => add(u.username)}><Plus className="mr-1 h-4 w-4" />{s === "incoming" ? "Accept" : "Add"}</Button> : <span className="text-xs text-muted-foreground">{s === "friend" ? "Friends" : "Requested"}</span>}</div>); })}
        {q.trim().length >= 2 && found.length === 0 && <p className="text-xs text-muted-foreground">No one found yet. Ask your friend for their exact username.</p>}
        {msg && <p className="text-sm text-primary" role="status">{msg}</p>}
      </div>
      <AlertsCard />
      <Corner people={people} me={me} startSession={startSession} />
      {people.friends.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No friends here yet. Invite someone, or search for a username above.</p> : (
        <div className="grid gap-3 sm:grid-cols-2">{people.friends.map(x => (
          <button key={x.id} aria-label={`Chat with ${x.name}`} onClick={() => setOpenId(x.id)} className="glass flex items-center gap-3 rounded-3xl p-4 text-left transition hover:scale-[1.01]">
            <div className="relative"><span role="button" tabIndex={0} aria-label={`Open ${x.name}'s profile`} onClick={e => { e.stopPropagation(); openProfile(x.username); }} onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); openProfile(x.username); } }}><Avatar spec={x.avatar} size={52} /></span><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${x.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.name}</span>{x.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{x.unread}</span>}</div>
              <div className="truncate text-xs text-muted-foreground">{x.last ? (x.last.mine ? "You: " : "") + x.last.text : x.online ? "Online now" : "Say hi"}</div>
              <div className={`text-[11px] ${x.online ? "text-success" : "text-muted-foreground"}`}>{x.online ? "Online now" : lastSeenText(x.lastSeen)}{(pairs?.[x.id]?.both ?? 0) > 0 ? ` · together ${pairs![x.id].both}/7 days` : ""}</div></div>
          </button>))}</div>)}
      {people.outgoing.length > 0 && <p className="text-center text-xs text-muted-foreground">Waiting on: {people.outgoing.map(u => "@" + u.username).join(", ")}</p>}
      <p className="text-center text-xs text-muted-foreground">Messages and files are end-to-end encrypted. They are locked on your device and only you and your friend can open them. Our server only stores scrambled data so it can deliver it when your friend is away. Your journal never leaves your device.</p>
    </div>);
}

function FileBubble({ m, meId, pk }: { m: ChatMsg; meId: string; pk: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let u: string | null = null, live = true; if (m.file) fetchFileUrl(m.file, meId, pk).then(x => { if (x && live) { u = x; setUrl(x); } }); return () => { live = false; if (u) URL.revokeObjectURL(u); }; }, [m.file?.id]); // eslint-disable-line
  if (!m.file) return null; const img = m.file.type.startsWith("image/");
  return (<div>{img && url && <img src={url} alt={m.file.name} className="mb-1 max-h-56 rounded-xl" />}
    <div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{m.file.name}</span><span className="shrink-0 text-xs opacity-70">{fmtSize(m.file.size)}</span>{url && <a href={url} download={m.file.name} aria-label={`Download ${m.file.name}`} className="shrink-0 rounded-full p-1 hover:bg-foreground/10"><Download className="h-4 w-4" /></a>}</div>
    {m.text && <div className="mt-1 whitespace-pre-wrap">{m.text}</div>}</div>);
}

function Conversation({ f, me, people, game, startSession, back, openProfile }: Props & { f: Friend; back: () => void; openProfile: (u: string) => void }) {
  const chat = useChat(f.id, me.id, f.pk ?? null);
  const [code, setCode] = useState(""); useEffect(() => { setCode(""); (async () => { const k = await loadKey(me.id); if (k && f.pk) setCode(await safetyCode(k.pk, f.pk)); })().catch(() => {}); }, [me.id, f.pk]);
  const [text, setText] = useState(""); const [pickDur, setPickDur] = useState(false); const [err, setErr] = useState(""); const [started, setStarted] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null); const end = useRef<HTMLDivElement>(null); const tt = useRef(0); const ta = useRef<HTMLTextAreaElement>(null);
  const [reactFor, setReactFor] = useState<string | null>(null);
  // Reactions: one per person per message, latest wins, empty = removed.
  const reacts = new Map<string, Map<string, string>>();
  for (const m of chat.messages) if (m.kind === "react" && m.react) { const per = reacts.get(m.react.to) ?? new Map<string, string>(); if (m.react.e) per.set(m.from, m.react.e); else per.delete(m.from); reacts.set(m.react.to, per); }
  const shownMsgs = chat.messages.filter(m => m.kind !== "react");
  const myReact = (id: string) => reacts.get(id)?.get(me.id) ?? "";
  const doReact = (id: string, e: string) => { setReactFor(null); run(() => chat.react(id, myReact(id) === e ? "" : e)); };
  const insertEmoji = (e: string) => { const el = ta.current; if (!el) { setText(t => t + e); return; } const s = el.selectionStart ?? text.length, en = el.selectionEnd ?? text.length; const v = text.slice(0, s) + e + text.slice(en); onType(v); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + e.length, s + e.length); }); };
  const first = f.name.split(" ")[0];
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [shownMsgs.length, chat.typing]);
  useEffect(() => { people.refresh(); }, [chat.messages.length]); // eslint-disable-line
  const run = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); } catch (e) { setErr((e as Error).message); } };
  const send = () => { const t = text.trim(); if (!t) return; setText(""); run(async () => { await chat.sendText(t); game.earn("chat"); }); };
  const onType = (v: string) => { setText(v); window.clearTimeout(tt.current); tt.current = window.setTimeout(chat.sendTyping, 300); };
  const joined = (sid: string) => chat.messages.some(m => m.kind === "session_join" && m.session?.id === sid);
  const begin = (sid: string, dur: number, room?: boolean) => { if (started.includes(sid)) return; setStarted(s => [...s, sid]); startSession(room ? "The Corner" : f.name, dur, { sid, friendId: f.id, name: room ? "The Corner" : f.name, avatar: f.avatar, ...(room ? { room: true } : {}) }); };
  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col gap-4" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <div className="sticky top-0 z-30 -mx-5 -mt-2 border-b border-border/50 bg-background/95 px-5 pb-2 pt-2 shadow-sm backdrop-blur-xl">
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Your circle</button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="relative"><button aria-label={`Open ${f.name}'s profile`} onClick={() => openProfile(f.username)}><Avatar spec={f.avatar} size={40} /></button><span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${chat.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
          <div><button onClick={() => openProfile(f.username)} className="text-start"><h1 className="text-xl font-semibold hover:underline">{f.name}</h1></button><div className="text-sm text-muted-foreground">@{f.username} · {chat.online ? "Online now" : lastSeenText(f.lastSeen) + ". Your messages will be waiting."}</div>{f.pk ? <div className="mt-0.5 text-xs text-muted-foreground" title="Compare this code with your friend, in person or on a call. If it matches, nobody is listening in.">Private chat. Safety code {code || "..."}</div> : <div className="mt-0.5 text-xs text-accent">{first} has not turned on private messaging yet. They need to sign in once.</div>}</div></div>
        <button aria-label={`Report ${f.name}`} className="p-2 text-xs text-muted-foreground hover:text-foreground" onClick={async () => { const reason = prompt(`Report ${f.name}. What is the problem? (for example: spam, rude, unsafe)`); if (!reason) return; try { await api("report", { body: { id: f.id, reason: reason.slice(0, 40), text: reason } }); alert("Thanks. The Lagomo team will take a look."); } catch (e) { alert((e as Error).message); } }}>Report</button>
        <button aria-label={`Remove ${f.name}`} className="p-2 text-muted-foreground hover:text-foreground" onClick={async () => { if (confirm(`Remove ${f.name} from your circle?`)) { await people.remove(f.id, confirm("Also block them so they cannot message you?")); back(); } }}><UserMinus className="h-4 w-4" /></button>
      </div>
      </div>
      <div className="glass flex-1 space-y-2 rounded-3xl p-4" style={{ minHeight: 240 }}>
        {shownMsgs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hi.</p>}
        {shownMsgs.map(m => {
          if (m.kind === "session_join") return <div key={m.id} className="text-center text-xs text-muted-foreground">{m.from === me.id ? "You" : first} joined the focus session</div>;
          const mine = m.from === me.id; const sj = m.session && joined(m.session.id);
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
              {!mine && <Avatar spec={f.avatar} size={28} />}
              <div className={`relative flex max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
              {reactFor === m.id && <div className={`absolute -top-11 z-20 flex gap-0.5 rounded-full border border-border bg-popover p-1 shadow-lg ${mine ? "end-0" : "start-0"}`} role="menu" aria-label="React" translate="no">{QUICK_REACTIONS.map(e => <button key={e} onClick={() => doReact(m.id, e)} aria-label={e} className={`rounded-full px-1.5 py-0.5 text-xl leading-none hover:scale-125 transition ${myReact(m.id) === e ? "bg-primary/20" : ""}`}>{e}</button>)}</div>}
              <div onClick={() => m.kind === "text" && setReactFor(r => r === m.id ? null : m.id)} className={`${m.kind === "text" && onlyEmoji(m.text) ? "px-1 text-5xl leading-tight" : `rounded-2xl px-3.5 py-2 text-[15px] ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-foreground/[.07]"}`} ${m.kind === "text" ? "cursor-pointer select-text" : ""}`}>
                {m.kind === "file" ? <FileBubble m={m} meId={me.id} pk={f.pk ?? null} /> : m.kind === "session" && m.session ? (
                  <div><div className="flex items-center gap-2 font-medium"><Timer className="h-4 w-4" />{m.text}</div>
                    {!mine && !sj && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => run(async () => { await chat.joinSession(m.session!.id, m.session!.dur, m.session!.room); begin(m.session!.id, m.session!.dur, m.session!.room); })}>Join now</Button>}
                    {!mine && sj && !started.includes(m.session.id) && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => begin(m.session!.id, m.session!.dur, m.session!.room)}>Open timer</Button>}
                    {mine && m.session.room && <div className="mt-1 text-xs opacity-80">Invite sent. Your corner is open.</div>}
                    {mine && !m.session.room && !sj && <div className="mt-1 text-xs opacity-80">Waiting for {first} to join...</div>}
                    {mine && !m.session.room && sj && <Button size="sm" variant="outline" className="mt-2 rounded-full bg-transparent" onClick={() => begin(m.session!.id, m.session!.dur)}>{first} joined. Start</Button>}</div>
                ) : <div className="whitespace-pre-wrap" translate="no" dir="auto">{m.text}</div>}
                <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine && !(m.kind === "text" && onlyEmoji(m.text)) ? "opacity-70" : "text-muted-foreground"}`}>{new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{mine && <CheckCheck className="h-3 w-3" aria-label="Sent" />}</div>
              </div>
              {(reacts.get(m.id)?.size ?? 0) > 0 && <div className={`${m.kind === "text" && onlyEmoji(m.text) ? "mt-1" : "-mt-1.5"} flex gap-1`} translate="no">{[...new Set(reacts.get(m.id)!.values())].map(e => { const n = [...reacts.get(m.id)!.values()].filter(x => x === e).length; return <button key={e} onClick={() => doReact(m.id, e)} className={`rounded-full border px-1.5 text-sm leading-6 ${myReact(m.id) === e ? "border-primary bg-primary/15" : "border-border bg-background"}`}>{e}{n > 1 ? ` ${n}` : ""}</button>; })}</div>}
              </div>
            </div>);
        })}
        {chat.typing && <div className="flex items-end gap-2"><Avatar spec={f.avatar} size={28} /><div className="rounded-2xl rounded-bl-sm bg-foreground/[.07] px-4 py-3"><span className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div></div>}
        <div ref={end} />
      </div>
      <div className="sticky bottom-24 z-20 space-y-2 rounded-3xl bg-background/95 pb-1 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          {!pickDur ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPickDur(true)}><Timer className="mr-1 h-3.5 w-3.5" />Focus together</Button> : [15, 25, 45].map(d => <Button key={d} size="sm" variant="hero" className="rounded-full" onClick={() => { setPickDur(false); run(() => chat.invite(d)); }}>{d} min</Button>)}
        </div>
        {(err || chat.error) && <p className="text-xs text-destructive" role="alert">{err || chat.error}</p>}
        <div className="glass flex items-end gap-2 rounded-3xl p-2">
          <button aria-label="Attach a file" onClick={() => fileRef.current?.click()} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground"><Paperclip className="h-5 w-5" /></button>
          <input ref={fileRef} type="file" hidden onChange={e => { const file = e.target.files?.[0]; if (file) run(async () => { await chat.sendFile(file, text.trim()); setText(""); game.earn("nudge"); }); e.target.value = ""; }} />
          <EmojiPicker onPick={insertEmoji} />
          <textarea ref={ta} value={text} onChange={e => onType(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${first}...`} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none" />
          <button aria-label="Send" onClick={send} disabled={!text.trim()} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">Photos are shrunk to fit. Other files can be up to about 700 KB.</p>
      </div>
    </div>);
}
