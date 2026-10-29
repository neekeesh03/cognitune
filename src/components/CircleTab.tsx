import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Copy, Download, FileText, Paperclip, Plus, Search, Send, Share2, Sparkles, Timer, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/Avatar";
import { suggestReplies, tuneRoomPrompt } from "@/engine/friend";
import { api } from "@/lib/api";
import { fetchFileUrl } from "@/net/blobs";
import { useChat, type ChatMsg } from "@/net/useChat";
import type { Friend, PeopleApi, Pub } from "@/store/usePeople";
import type { User } from "@/store/useAuth";
import type { GameApi } from "@/store/useGame";

const fmtSize = (n: number) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
interface Props { people: PeopleApi; game: GameApi; me: User; openId: string | null; setOpenId: (id: string | null) => void; startSession: (name: string, dur: number) => void }

export function CircleTab(props: Props) {
  const { people, me, openId, setOpenId } = props;
  const f = people.friends.find(x => x.id === openId);
  if (f) return <Conversation {...props} f={f} back={() => setOpenId(null)} />;
  return <Home {...props} />;
}

function Home({ people, game, me, setOpenId }: Props) {
  const [q, setQ] = useState(""); const [found, setFound] = useState<Pub[]>([]); const [msg, setMsg] = useState(""); const [copied, setCopied] = useState(false);
  useEffect(() => { if (q.trim().length < 2) { setFound([]); return; } const t = setTimeout(() => api<{ users: Pub[] }>("search?q=" + encodeURIComponent(q.trim())).then(r => setFound(r.users)).catch(() => {}), 250); return () => clearTimeout(t); }, [q]);
  const status = (id: string) => people.friends.some(f => f.id === id) ? "friend" : people.outgoing.some(f => f.id === id) ? "sent" : people.incoming.some(f => f.id === id) ? "incoming" : "none";
  const add = async (username: string) => { setMsg(""); try { const s = await people.request(username); if (s === "friends") game.earn("nudge", { people: 1 }); setMsg(s === "friends" ? `You and @${username} are now friends.` : `Request sent to @${username}.`); } catch (e) { setMsg((e as Error).message); } };
  const invite = `Join me on Cognitune, a friendly app for getting started on things. Sign up at ${location.origin} and add me: @${me.username}`;
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: "Join me on Cognitune", text: invite }); return; } catch { /* cancelled */ } } await navigator.clipboard?.writeText(invite).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-5">
      <div className="text-center"><h1 className="text-4xl">Your circle</h1><p className="mx-auto mt-2 max-w-md text-muted-foreground">Chat with the people who help you start. Send messages and files, work side by side, and let Tune cheer you both on.</p></div>
      <div className="glass flex items-center gap-4 rounded-3xl p-4"><Avatar spec={me.avatar} size={56} /><div className="min-w-0 flex-1"><div className="font-semibold">{me.name}</div><div className="text-sm text-muted-foreground">@{me.username}</div></div>
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
      {people.friends.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No friends here yet. Invite someone, or search for a username above.</p> : (
        <div className="grid gap-3 sm:grid-cols-2">{people.friends.map(x => (
          <button key={x.id} aria-label={`Chat with ${x.name}`} onClick={() => setOpenId(x.id)} className="glass flex items-center gap-3 rounded-3xl p-4 text-left transition hover:scale-[1.01]">
            <div className="relative"><Avatar spec={x.avatar} size={52} /><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${x.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.name}</span>{x.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{x.unread}</span>}</div>
              <div className="truncate text-xs text-muted-foreground">{x.last ? (x.last.mine ? "You: " : "") + x.last.text : x.online ? "Online now" : "Say hi"}</div></div>
          </button>))}</div>)}
      {people.outgoing.length > 0 && <p className="text-center text-xs text-muted-foreground">Waiting on: {people.outgoing.map(u => "@" + u.username).join(", ")}</p>}
      <p className="text-center text-xs text-muted-foreground">Messages and files are stored on our server so they arrive even when your friend is away. They are not end-to-end encrypted, so keep the very private stuff in your journal, which never leaves your device.</p>
    </div>);
}

function FileBubble({ m }: { m: ChatMsg }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let u: string | null = null, live = true; if (m.file) fetchFileUrl(m.file.id).then(x => { if (x && live) { u = x; setUrl(x); } }); return () => { live = false; if (u) URL.revokeObjectURL(u); }; }, [m.file?.id]); // eslint-disable-line
  if (!m.file) return null; const img = m.file.type.startsWith("image/");
  return (<div>{img && url && <img src={url} alt={m.file.name} className="mb-1 max-h-56 rounded-xl" />}
    <div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{m.file.name}</span><span className="shrink-0 text-xs opacity-70">{fmtSize(m.file.size)}</span>{url && <a href={url} download={m.file.name} aria-label={`Download ${m.file.name}`} className="shrink-0 rounded-full p-1 hover:bg-foreground/10"><Download className="h-4 w-4" /></a>}</div>
    {m.text && <div className="mt-1 whitespace-pre-wrap">{m.text}</div>}</div>);
}

function Conversation({ f, me, people, game, startSession, back }: Props & { f: Friend; back: () => void }) {
  const chat = useChat(f.id, me.id);
  const [text, setText] = useState(""); const [pickDur, setPickDur] = useState(false); const [err, setErr] = useState(""); const [started, setStarted] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null); const end = useRef<HTMLDivElement>(null); const tt = useRef(0);
  const first = f.name.split(" ")[0];
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [chat.messages.length, chat.typing]);
  useEffect(() => { people.refresh(); }, [chat.messages.length]); // eslint-disable-line
  const lastIn = [...chat.messages].reverse().find(m => m.from === f.id && m.kind === "text"); const suggestions = lastIn ? suggestReplies(lastIn.text, f.name) : [];
  const run = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); } catch (e) { setErr((e as Error).message); } };
  const send = () => { const t = text.trim(); if (!t) return; setText(""); run(async () => { await chat.sendText(t); game.earn("chat"); }); };
  const onType = (v: string) => { setText(v); window.clearTimeout(tt.current); tt.current = window.setTimeout(chat.sendTyping, 300); };
  const joined = (sid: string) => chat.messages.some(m => m.kind === "session_join" && m.session?.id === sid);
  const begin = (sid: string, dur: number) => { if (started.includes(sid)) return; setStarted(s => [...s, sid]); startSession(f.name, dur); };
  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col gap-4" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Your circle</button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="relative"><Avatar spec={f.avatar} size={60} /><span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${chat.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
          <div><h1 className="text-3xl">{f.name}</h1><div className="text-sm text-muted-foreground">@{f.username} · {chat.online ? "Online now" : "Away. Your messages will be waiting."}</div></div></div>
        <button aria-label={`Report ${f.name}`} className="p-2 text-xs text-muted-foreground hover:text-foreground" onClick={async () => { const reason = prompt(`Report ${f.name}. What is the problem? (for example: spam, rude, unsafe)`); if (!reason) return; try { await api("report", { body: { id: f.id, reason: reason.slice(0, 40), text: reason } }); alert("Thanks. The Cognitune team will take a look."); } catch (e) { alert((e as Error).message); } }}>Report</button>
        <button aria-label={`Remove ${f.name}`} className="p-2 text-muted-foreground hover:text-foreground" onClick={async () => { if (confirm(`Remove ${f.name} from your circle?`)) { await people.remove(f.id, confirm("Also block them so they cannot message you?")); back(); } }}><UserMinus className="h-4 w-4" /></button>
      </div>
      <div className="glass flex-1 space-y-2 rounded-3xl p-4" style={{ minHeight: 240 }}>
        {chat.messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hi, or ask Tune to start the conversation.</p>}
        {chat.messages.map(m => {
          if (m.kind === "session_join") return <div key={m.id} className="text-center text-xs text-muted-foreground">{m.from === me.id ? "You" : first} joined the focus session</div>;
          if (m.kind === "tune") return <div key={m.id} className="mx-auto max-w-[90%] rounded-2xl px-4 py-2.5 text-sm" style={{ background: "hsl(var(--f-grain) / .25)" }}><div className="mb-0.5 flex items-center gap-1 text-xs font-semibold"><Sparkles className="h-3 w-3" />Tune</div>{m.text}</div>;
          const mine = m.from === me.id; const sj = m.session && joined(m.session.id);
          return (
            <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : ""}`}>
              {!mine && <Avatar spec={f.avatar} size={28} />}
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-foreground/[.07]"}`}>
                {m.kind === "file" ? <FileBubble m={m} /> : m.kind === "session" && m.session ? (
                  <div><div className="flex items-center gap-2 font-medium"><Timer className="h-4 w-4" />{m.text}</div>
                    {!mine && !sj && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => run(async () => { await chat.joinSession(m.session!.id, m.session!.dur); begin(m.session!.id, m.session!.dur); })}>Join now</Button>}
                    {!mine && sj && !started.includes(m.session.id) && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => begin(m.session!.id, m.session!.dur)}>Open timer</Button>}
                    {mine && !sj && <div className="mt-1 text-xs opacity-80">Waiting for {first} to join...</div>}
                    {mine && sj && <Button size="sm" variant="outline" className="mt-2 rounded-full bg-transparent" onClick={() => begin(m.session!.id, m.session!.dur)}>{first} joined. Start</Button>}</div>
                ) : <div className="whitespace-pre-wrap">{m.text}</div>}
                <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}>{new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{mine && <CheckCheck className="h-3 w-3" aria-label="Sent" />}</div>
              </div>
            </div>);
        })}
        {chat.typing && <div className="flex items-end gap-2"><Avatar spec={f.avatar} size={28} /><div className="rounded-2xl rounded-bl-sm bg-foreground/[.07] px-4 py-3"><span className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div></div>}
        <div ref={end} />
      </div>
      <div className="space-y-2">
        {suggestions.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" />Tune suggests</span>{suggestions.map(s => <button key={s} onClick={() => setText(s)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">{s}</button>)}</div>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => run(() => chat.sendTune(tuneRoomPrompt(me.name, first, chat.messages.length)))}><Sparkles className="mr-1 h-3.5 w-3.5" />Ask Tune to cheer us on</Button>
          {!pickDur ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPickDur(true)}><Timer className="mr-1 h-3.5 w-3.5" />Focus together</Button> : [15, 25, 45].map(d => <Button key={d} size="sm" variant="hero" className="rounded-full" onClick={() => { setPickDur(false); run(() => chat.invite(d)); }}>{d} min</Button>)}
        </div>
        {(err || chat.error) && <p className="text-xs text-destructive" role="alert">{err || chat.error}</p>}
        <div className="glass flex items-end gap-2 rounded-3xl p-2">
          <button aria-label="Attach a file" onClick={() => fileRef.current?.click()} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground"><Paperclip className="h-5 w-5" /></button>
          <input ref={fileRef} type="file" hidden onChange={e => { const file = e.target.files?.[0]; if (file) run(async () => { await chat.sendFile(file, text.trim()); setText(""); game.earn("nudge"); }); e.target.value = ""; }} />
          <textarea value={text} onChange={e => onType(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${first}...`} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none" />
          <button aria-label="Send" onClick={send} disabled={!text.trim()} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">Photos are shrunk to fit. Other files can be up to about 700 KB.</p>
      </div>
    </div>);
}
