import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, CheckCheck, Copy, Download, FileText, Paperclip, Plus, Send, Share2, Sparkles, Timer, Trash2, User, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { personColor } from "@/engine/share";
import { suggestReplies, tuneRoomPrompt } from "@/engine/friend";
import { getBlob } from "@/net/blobs";
import { MAX_FILE, type ChatApi } from "@/net/useChat";
import { unread, type Msg, type PeopleApi, type Person, type Relation } from "@/store/usePeople";
import type { GameApi } from "@/store/useGame";

const RELS: { id: Relation; label: string; hint: string }[] = [
  { id: "buddy", label: "Focus buddy", hint: "Someone to work alongside" }, { id: "friend", label: "Friend", hint: "Cheers you on" },
  { id: "family", label: "Family", hint: "People at home" }, { id: "mentor", label: "Mentor", hint: "Guides you" }, { id: "teammate", label: "Teammate", hint: "Works with you" },
];
const fmtSize = (n: number) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
const col = (i: number) => `hsl(var(${personColor(i).slice(4, -1)}))`;
export const inviteLink = (p: Person, me: string) => `${location.origin}${location.pathname}#join=${p.roomId}&from=${encodeURIComponent(me || "A friend")}`;

interface Props { people: PeopleApi; chat: ChatApi; game: GameApi; selfName: string; openId: string | null; setOpenId: (id: string | null) => void; startSession: (p: Person, dur: number, sid: string) => void }

export function CircleTab(props: Props) {
  const { people, chat, game, openId, setOpenId } = props; const [adding, setAdding] = useState(false);
  const p = people.people.find(x => x.id === openId);
  if (p) return <Conversation {...props} p={p} idx={people.people.indexOf(p)} back={() => setOpenId(null)} />;
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-5">
      <div className="text-center"><h1 className="text-4xl">Your circle</h1><p className="mx-auto mt-2 max-w-md text-muted-foreground">Chat with the people who help you start, right here. Send messages and files, work side by side, and let Tune cheer you both on.</p></div>
      {people.people.length === 0 && !adding && (
        <div className="glass rounded-3xl p-6 text-center"><UserPlus className="mx-auto mb-2 h-8 w-8 text-primary" /><p className="mb-4 text-muted-foreground">Nobody here yet. Add one person to begin. A single focus buddy is enough.</p><Button variant="hero" className="rounded-full" onClick={() => setAdding(true)}>Add your first person</Button></div>)}
      <div className="grid gap-3 sm:grid-cols-2">{people.people.map((x, i) => { const last = x.thread[x.thread.length - 1], u = unread(x); return (
        <button key={x.id} onClick={() => setOpenId(x.id)} className="glass flex items-center gap-3 rounded-3xl p-4 text-left transition hover:scale-[1.01]">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-background" style={{ background: col(i) }}><User className="h-5 w-5" /><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${chat.online[x.id] ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
          <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.name}</span>{u > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{u}</span>}</div>
            <div className="truncate text-xs text-muted-foreground">{last ? (last.kind === "file" ? "Sent a file" : last.text) : chat.online[x.id] ? "Online now" : x.everConnected ? "Offline" : "Waiting to connect"}</div></div>
        </button>); })}</div>
      {people.people.length > 0 && !adding && <div className="text-center"><Button variant="outline" className="rounded-full" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />Add someone</Button></div>}
      {adding && <AddPerson onCancel={() => setAdding(false)} onSave={v => { const x = people.add(v); setAdding(false); game.earn("nudge", { people: people.people.length + 1 }); setOpenId(x.id); }} />}
      <p className="text-center text-xs text-muted-foreground">Chats go directly between your devices, with no account needed. You both need Cognitune open to talk live. Messages you send while they are away are delivered when they return.</p>
    </div>
  );
}

function AddPerson({ onSave, onCancel }: { onSave: (v: { name: string; relation: Relation }) => void; onCancel: () => void }) {
  const [name, setName] = useState(""); const [rel, setRel] = useState<Relation>("buddy");
  return (
    <div className="glass space-y-3 rounded-3xl p-5">
      <div className="flex items-center justify-between"><div className="text-lg font-semibold">Add someone</div><button aria-label="Cancel" onClick={onCancel}><X className="h-4 w-4" /></button></div>
      <Input className="h-11 rounded-2xl bg-secondary/60" placeholder="Their name" value={name} onChange={e => setName(e.target.value)} />
      <div className="flex flex-wrap gap-2">{RELS.map(r => <button key={r.id} onClick={() => setRel(r.id)} title={r.hint} className={`rounded-full border px-3 py-1.5 text-sm ${rel === r.id ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{r.label}</button>)}</div>
      <p className="text-xs text-muted-foreground">Next you will get a private link to send them once. When they open it, you can chat right here.</p>
      <Button variant="hero" className="h-11 w-full rounded-2xl" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), relation: rel })}>Continue</Button>
    </div>);
}

function FileBubble({ m, progress }: { m: Msg; progress?: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { let u: string | null = null; let live = true; if (m.file) getBlob(m.file.id).then(b => { if (b && live) { u = URL.createObjectURL(b); setUrl(u); } }); return () => { live = false; if (u) URL.revokeObjectURL(u); }; }, [m.file?.id]); // eslint-disable-line
  if (!m.file) return null; const img = m.file.type.startsWith("image/");
  return (
    <div>
      {img && url && <img src={url} alt={m.file.name} className="mb-1 max-h-56 rounded-xl" />}
      <div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{m.file.name}</span><span className="shrink-0 text-xs opacity-70">{fmtSize(m.file.size)}</span>
        {url && <a href={url} download={m.file.name} aria-label={`Download ${m.file.name}`} className="shrink-0 rounded-full p-1 hover:bg-foreground/10"><Download className="h-4 w-4" /></a>}</div>
      {progress != null && <div className="mt-1 h-1 rounded bg-foreground/20"><div className="h-full rounded bg-current" style={{ width: `${progress * 100}%` }} /></div>}
      {m.text && <div className="mt-1 whitespace-pre-wrap">{m.text}</div>}
    </div>);
}

function Conversation({ p, idx, people, chat, game, selfName, startSession, back }: Props & { p: Person; idx: number; back: () => void }) {
  const [text, setText] = useState(""); const [err, setErr] = useState(""); const [copied, setCopied] = useState(false); const [pickDur, setPickDur] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null); const end = useRef<HTMLDivElement>(null); const tt = useRef<number>();
  const online = !!chat.online[p.id]; const first = p.name.split(" ")[0]; const link = inviteLink(p, selfName);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); people.markRead(p.id); }, [p.thread.length, chat.typing[p.id]]); // eslint-disable-line
  const lastIn = [...p.thread].reverse().find(m => m.from === "them" && m.kind === "text");
  const suggestions = lastIn ? suggestReplies(lastIn.text, p.name) : [];

  const send = () => { const t = text.trim(); if (!t) return; chat.send(p.id, { kind: "text", text: t }); game.earn("chat"); setText(""); chat.setTypingTo(p.id, false); };
  const onType = (v: string) => { setText(v); chat.setTypingTo(p.id, true); window.clearTimeout(tt.current); tt.current = window.setTimeout(() => chat.setTypingTo(p.id, false), 2000); };
  const pick = async (f: File) => { setErr(""); if (f.size > MAX_FILE) { setErr("That file is over 15 MB. Try a smaller one."); return; } await chat.sendFile(p.id, f, text.trim()); setText(""); game.earn("nudge"); };
  const cheer = () => { chat.send(p.id, { kind: "tune", from: "tune", text: tuneRoomPrompt(selfName, first, p.thread.length) }); };
  const invite = (dur: number) => { const sid = crypto.randomUUID(); chat.send(p.id, { kind: "session", text: `Let's focus together for ${dur} minutes.`, session: { id: sid, dur, status: "invited" } }); setPickDur(false); };
  const join = (m: Msg) => { if (!m.session) return; chat.joinSession(p.id, m.session.id); people.patchMsg(p.id, m.id, { session: { ...m.session, status: "joined" } }); startSession(p, m.session.dur, m.session.id); };
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: "Join me on Cognitune", text: `${selfName || "I"} invited you to chat on Cognitune:`, url: link }); return; } catch { /* cancelled */ } } copy(); };
  const copy = async () => { await navigator.clipboard?.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="animate-rise mx-auto flex max-w-2xl flex-col gap-4" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <button onClick={back} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Your circle</button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="relative flex h-14 w-14 items-center justify-center rounded-full text-background" style={{ background: col(idx) }}><User className="h-6 w-6" /><span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
          <div><h1 className="text-3xl">{p.name}</h1><div className="text-sm text-muted-foreground">{online ? "Online now" : p.everConnected ? "Offline. Your messages will arrive when they are back." : "Not connected yet"}</div></div></div>
        <button aria-label={`Remove ${p.name}`} className="p-2 text-muted-foreground hover:text-foreground" onClick={() => { if (confirm(`Remove ${p.name} and this conversation?`)) { people.remove(p.id); back(); } }}><Trash2 className="h-4 w-4" /></button>
      </div>

      {!p.everConnected && (
        <div className="glass space-y-3 rounded-3xl p-4">
          <div className="font-semibold">Invite {first}</div>
          <p className="text-sm text-muted-foreground">Send this private link to {first} one time. When {first} opens it in Cognitune, you will be connected and can chat right here.</p>
          <div className="truncate rounded-2xl bg-foreground/[.05] px-3 py-2 text-xs text-muted-foreground">{link}</div>
          <div className="flex gap-2"><Button variant="hero" className="rounded-full" onClick={copy}>{copied ? <><Check className="mr-1 h-4 w-4" />Copied</> : <><Copy className="mr-1 h-4 w-4" />Copy link</>}</Button><Button variant="outline" className="rounded-full" onClick={share}><Share2 className="mr-1 h-4 w-4" />Share link</Button></div>
        </div>)}

      <div className="glass flex-1 space-y-2 rounded-3xl p-4" style={{ minHeight: 240 }}>
        {p.thread.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hi, or ask Tune to start the conversation.</p>}
        {p.thread.map(m => m.kind === "tune" ? (
          <div key={m.id} className="mx-auto max-w-[90%] rounded-2xl px-4 py-2.5 text-sm" style={{ background: "hsl(var(--f-grain) / .25)" }}><div className="mb-0.5 flex items-center gap-1 text-xs font-semibold"><Sparkles className="h-3 w-3" />Tune</div>{m.text}</div>
        ) : m.kind === "note" ? (
          <div key={m.id} className="text-center text-xs text-muted-foreground">{m.text}</div>
        ) : (
          <div key={m.id} className={`flex ${m.from === "me" ? "justify-end" : ""}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[15px] ${m.from === "me" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-foreground/[.07]"}`}>
              {m.kind === "file" ? <FileBubble m={m} progress={chat.progress[m.id]} /> : m.kind === "session" && m.session ? (
                <div><div className="flex items-center gap-2 font-medium"><Timer className="h-4 w-4" />{m.text}</div>
                  {m.from === "them" && m.session.status === "invited" && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => join(m)}>Join now</Button>}
                  {m.from === "me" && m.session.status === "invited" && <div className="mt-1 text-xs opacity-80">Waiting for {first} to join...</div>}
                  {m.session.status === "joined" && <div className="mt-1 text-xs opacity-80">Session started</div>}</div>
              ) : <div className="whitespace-pre-wrap">{m.text}</div>}
              <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${m.from === "me" ? "opacity-70" : "text-muted-foreground"}`}>{new Date(m.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{m.from === "me" && (m.delivered ? <CheckCheck className="h-3 w-3" aria-label="Delivered" /> : <Check className="h-3 w-3" aria-label="Sent, waiting" />)}</div>
            </div>
          </div>))}
        {chat.typing[p.id] && <div className="flex"><div className="rounded-2xl rounded-tl-sm bg-foreground/[.07] px-4 py-3"><span className="inline-flex gap-1">{[0, 1, 2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />)}</span></div></div>}
        <div ref={end} />
      </div>

      <div className="space-y-2">
        {suggestions.length > 0 && <div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" />Tune suggests</span>{suggestions.map(s => <button key={s} onClick={() => setText(s)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">{s}</button>)}</div>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={cheer}><Sparkles className="mr-1 h-3.5 w-3.5" />Ask Tune to cheer us on</Button>
          {!pickDur ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPickDur(true)}><Timer className="mr-1 h-3.5 w-3.5" />Focus together</Button>
            : [15, 25, 45].map(d => <Button key={d} size="sm" variant="hero" className="rounded-full" onClick={() => invite(d)}>{d} min</Button>)}
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="glass flex items-end gap-2 rounded-3xl p-2">
          <button aria-label="Attach a file" onClick={() => fileRef.current?.click()} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground"><Paperclip className="h-5 w-5" /></button>
          <input ref={fileRef} type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
          <textarea value={text} onChange={e => onType(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${first}...`} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none" />
          <button aria-label="Send" onClick={send} disabled={!text.trim()} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">{online ? "Connected directly to " + first + "." : "Waiting for " + first + " to open Cognitune. Messages and files will be delivered then."}</p>
      </div>
    </div>
  );
}
