import { useEffect, useMemo, useRef, useState } from "react";
import { burst, toast } from "@/lib/fx";
import { PinkyCard, PinkyForm } from "@/components/Pinky";
import { Burrow } from "@/components/Burrow";
import { HOUR, activePact, keptCount, keptTogether, reducePacts, rhythm, reminderSlot, windowEnd, type Pact, type PinkyEvt } from "@/engine/pinky";
import { lastSeenText } from "@/lib/notify";
import { inviteText } from "@/lib/invite";
import { EmojiPicker, QUICK_REACTIONS, onlyEmoji } from "@/components/EmojiPicker";
import { FeedView } from "@/components/FeedView";
import { ProfileView } from "@/components/ProfileView";
import { useFeed } from "@/store/useFeed";
import { track } from "@/lib/track";
import type { Pair } from "@/store/useBurrow";
import AlertsCard from "@/components/AlertsCard";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowLeft, CalendarPlus, Check, HeartHandshake, CheckCheck, Copy, Download, FileText, Paperclip, Plus, Search, Send, Share2, Sparkles, Timer, UserMinus, X } from "lucide-react";
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
import type { PlanApi } from "@/store/usePlan";
import { PlanCard, PlanTogetherForm } from "@/components/SharePlan";

const fmtSize = (n: number) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1e3)) + " KB");
interface Props { pairs?: Record<string, Pair>; people: PeopleApi; game: GameApi; plan: PlanApi; startPinky?: (title: string, onDone: () => void) => void; me: User; openId: string | null; setOpenId: (id: string | null) => void; startSession: (name: string, dur: number, buddy?: { sid: string; friendId: string; name: string; avatar: AvatarSpec; room?: boolean }) => void }

function useWide() {
  const q = "(min-width: 1024px)"; const [w, setW] = useState(() => window.matchMedia(q).matches);
  useEffect(() => { const m = window.matchMedia(q); const h = () => setW(m.matches); m.addEventListener("change", h); return () => m.removeEventListener("change", h); }, []);
  return w;
}

export function CircleTab(props: Props) {
  const { people, me, openId, setOpenId } = props;
  const wide = useWide();
  const [profile, setProfile] = useState<string | null>(null);
  const [view, setView] = useState<"feed" | "friends">(() => (localStorage.getItem("lagomo.circleView") === "friends" ? "friends" : "feed"));
  const feed = useFeed(view === "feed" && !openId && !profile);
  const pick = (v: "feed" | "friends") => { setView(v); localStorage.setItem("lagomo.circleView", v); };
  const openProfile = (u: string) => { setProfile(u); track("profile_view"); window.scrollTo({ top: 0 }); };
  const f = people.friends.find(x => x.id === openId);
  if (profile) return <ProfileView username={profile} people={people} onBack={() => setProfile(null)} onMessage={id => { setProfile(null); setOpenId(id); }} onSaved={() => people.refresh()} />;
  if (f && wide) return (
    <div className="mx-auto grid max-w-6xl grid-cols-[300px_minmax(0,1fr)] items-start gap-6">
      <aside className="sticky top-4 space-y-2">
        <button onClick={() => setOpenId(null)} className="flex items-center gap-1 px-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Friends</button>
        <div className="max-h-[calc(100vh-7rem)] space-y-1.5 overflow-y-auto pe-1">
          {people.friends.map(x => (
            <button key={x.id} aria-label={`Chat with ${x.name}`} aria-current={x.id === f.id ? "true" : undefined} onClick={() => setOpenId(x.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-start transition ${x.id === f.id ? "bg-primary/15" : "hover:bg-secondary/60"}`}>
              <div className="relative"><Avatar spec={x.avatar} size={40} /><span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${x.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-medium" translate="no">{x.name}</span>{x.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{x.unread}</span>}</div>
                <div className="truncate text-xs text-muted-foreground">{x.last ? (x.last.mine ? "You: " : "") + x.last.text : x.online ? "Online now" : "Say hi"}</div></div>
            </button>))}
        </div>
      </aside>
      <Conversation key={f.id} {...props} f={f} back={() => setOpenId(null)} openProfile={openProfile} />
    </div>);
  if (f) return <Conversation {...props} f={f} back={() => setOpenId(null)} openProfile={openProfile} />;
  return (
    <div className="animate-rise mx-auto max-w-2xl space-y-5 lg:max-w-5xl">
      <div className="text-center"><h1 className="text-4xl">Friends</h1></div>
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
  const go = async (dur: number) => { setErr(""); setBusy(true); try { const sid = await inviteToRoom(me.id, people.friends.filter(f => pick.includes(f.id)), dur); setOpen(false); setPick([]); startSession("Quiet room", dur, { sid, friendId: "", name: "Quiet room", avatar: me.avatar, room: true }); } catch (e) { setErr((e as Error).message); } setBusy(false); };
  if (people.friends.length === 0) return null;
  return (
    <div className="glass space-y-3 rounded-3xl p-4">
      <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Quiet room</div><div className="text-xs text-muted-foreground">Work side by side with up to 5 friends. No cameras, just company.</div></div>{!open && <Button variant="hero" size="sm" className="rounded-full" onClick={() => setOpen(true)}>Open a quiet room</Button>}</div>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{people.friends.map(x => (
          <button key={x.id} aria-label={`Chat with ${x.name}`} onClick={() => setOpenId(x.id)} className="glass flex items-center gap-3 rounded-3xl p-4 text-left transition hover:scale-[1.01]">
            <div className="relative"><span role="button" tabIndex={0} aria-label={`Open ${x.name}'s profile`} onClick={e => { e.stopPropagation(); openProfile(x.username); }} onKeyDown={e => { if (e.key === "Enter") { e.stopPropagation(); openProfile(x.username); } }}><Avatar spec={x.avatar} size={52} /></span><span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${x.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.name}</span>{x.unread > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{x.unread}</span>}</div>
              <div className="truncate text-xs text-muted-foreground">{x.last ? (x.last.mine ? "You: " : "") + x.last.text : x.online ? "Online now" : "Say hi"}</div>
              <div className={`text-[11px] ${x.online ? "text-success" : "text-muted-foreground"}`}>{x.online ? "Online now" : lastSeenText(x.lastSeen)}{(pairs?.[x.id]?.either ?? 0) > 0 ? ` · together ${pairs![x.id].either}/7 days` : ""}</div></div>
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

function Conversation({ f, me, people, game, plan, startSession, startPinky, back, openProfile }: Props & { f: Friend; back: () => void; openProfile: (u: string) => void }) {
  const chat = useChat(f.id, me.id, f.pk ?? null);
  const [code, setCode] = useState(""); useEffect(() => { setCode(""); (async () => { const k = await loadKey(me.id); if (k && f.pk) setCode(await safetyCode(k.pk, f.pk)); })().catch(() => {}); }, [me.id, f.pk]);
  const [text, setText] = useState(""); const [pickDur, setPickDur] = useState(false); const [planOpen, setPlanOpen] = useState(false); const [burrowOpen, setBurrowOpen] = useState(false); const [showCode, setShowCode] = useState(false);
  const [pinkyOpen, setPinkyOpen] = useState(() => sessionStorage.getItem("lagomo.pinky.open") === f.id); const [pbusy, setPbusy] = useState(false); const [now, setNow] = useState(Date.now());
  useEffect(() => { if (sessionStorage.getItem("lagomo.pinky.open") === f.id) sessionStorage.removeItem("lagomo.pinky.open"); }, [f.id]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []); const [err, setErr] = useState(""); const [started, setStarted] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null); const end = useRef<HTMLDivElement>(null); const tt = useRef(0); const ta = useRef<HTMLTextAreaElement>(null);
  const [reactFor, setReactFor] = useState<string | null>(null);
  // Reactions: one per person per message, latest wins, empty = removed.
  const reacts = new Map<string, Map<string, string>>();
  for (const m of chat.messages) if (m.kind === "react" && m.react) { const per = reacts.get(m.react.to) ?? new Map<string, string>(); if (m.react.e) per.set(m.from, m.react.e); else per.delete(m.from); reacts.set(m.react.to, per); }
  const shownMsgs = chat.messages.filter(m => m.kind !== "react" && !(m.kind === "pinky" && m.pinky?.op !== "make"));
  const pacts = useMemo(() => reducePacts(chat.messages.map(m => ({ from: m.from, ts: m.ts, pinky: m.pinky, file: m.file }))), [chat.messages]);
  const activeP = activePact(pacts); const keptN = keptCount(pacts);
  const prevKept = useRef<number | null>(null);
  useEffect(() => { // celebrate only a Pinky that finished just now, not old history that is loading
    const lastDone = Math.max(0, ...chat.messages.filter(m => m.pinky?.op === "done").map(m => m.ts));
    if (prevKept.current !== null && keptN > prevKept.current && Date.now() - lastDone < 30000) { burst(); toast("Kept together", first); track("pinky_kept_together"); }
    prevKept.current = keptN;
  }, [keptN]); // eslint-disable-line
  const myReact = (id: string) => reacts.get(id)?.get(me.id) ?? "";
  const doReact = (id: string, e: string) => { setReactFor(null); run(() => chat.react(id, myReact(id) === e ? "" : e)); };
  const insertEmoji = (e: string) => { const el = ta.current; if (!el) { setText(t => t + e); return; } const s = el.selectionStart ?? text.length, en = el.selectionEnd ?? text.length; const v = text.slice(0, s) + e + text.slice(en); onType(v); requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + e.length, s + e.length); }); };
  const first = f.name.split(" ")[0];
  const pinkyBlock = (pid: string, text: string, end: number) => { const s = reminderSlot(end); const key = "pinky:" + pid; const old = plan.blocks.find(b => b.sharedId === key); if (!s) { if (old) plan.removeBlock(old.id, true); return; } if (old) plan.patchBlock(old.id, { day: s.day, start: s.start, done: false, notified: false, title: text }); else plan.addBlock({ title: text, day: s.day, start: s.start, dur: 5, remind: 0, sharedId: key }); };
  const pinkyRun = async (fn: () => Promise<unknown>) => { setPbusy(true); await run(fn); setPbusy(false); };
  const myText = (p: Pact) => p.parts[me.id]?.text ?? "";
  const pinkyMake = async (e: PinkyEvt, remind: boolean) => { await chat.sendPinky(e); if (remind) pinkyBlock(e.id, e.text!, e.end!); game.earn("chat"); track("pinky_make"); };
  const pinkyDone = (p: Pact, receipt: "tap" | "timer") => pinkyRun(async () => { await chat.sendPinky({ id: p.id, op: "done", receipt }); plan.blocks.filter(b => b.sharedId === "pinky:" + p.id).forEach(b => plan.patchBlock(b.id, { done: true })); if (receipt === "tap") game.earn("pinky"); track("pinky_done"); });
  const pinkyPhoto = (p: Pact, blob: Blob) => pinkyRun(async () => { await chat.sendPinkyPhoto(blob, { id: p.id, op: "done", receipt: "photo" }); plan.blocks.filter(b => b.sharedId === "pinky:" + p.id).forEach(b => plan.patchBlock(b.id, { done: true })); game.earn("pinky"); track("pinky_done"); track("pinky_photo"); });
  const reportPhoto = (url: string) => { if (!confirm(`Report this photo from ${first}? The photo is shared with the Lagomo team so they can review it.`)) return; run(async () => { const blob = await (await fetch(url)).blob(); const ev = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); await api("report", { body: { id: f.id, reason: "Photo", text: "Pinky photo receipt", evidence: ev } }); toast("Report sent", "Thank you"); track("pinky_photo_report"); }); };
  const pinkyCard = (p: Pact) => (
    <PinkyCard pact={p} me={me.id} first={first} now={now} busy={pbusy} pk={f.pk ?? null} onDonePhoto={b => pinkyPhoto(p, b)} onReportPhoto={reportPhoto}
      onJoin={t => pinkyRun(async () => { const late = p.end < Date.now() + HOUR; const end = late ? windowEnd("day") : undefined; await chat.sendPinky({ id: p.id, op: "join", text: t, end }); pinkyBlock(p.id, t || p.parts[p.creator].text, end ?? p.end); track("pinky_join"); })}
      onStart={() => startPinky ? startPinky(myText(p), () => { pinkyDone(p, "timer"); }) : pinkyDone(p, "tap")}
      onDone={() => pinkyDone(p, "tap")}
      onKeep={() => pinkyRun(async () => { const end = windowEnd("day"); await chat.sendPinky({ id: p.id, op: "keep", end }, true); pinkyBlock(p.id, myText(p), end); track("pinky_roll"); })}
      onSmaller={t => pinkyRun(async () => { const end = windowEnd("day"); await chat.sendPinky({ id: p.id, op: "smaller", text: t, end }, true); pinkyBlock(p.id, t, end); track("pinky_roll"); })}
      onLetGo={() => pinkyRun(async () => { await chat.sendPinky({ id: p.id, op: "letgo" }, true); const b = plan.blocks.find(x => x.sharedId === "pinky:" + p.id); if (b) plan.removeBlock(b.id, true); track("pinky_roll"); })}
      onHop={() => pinkyRun(async () => { await chat.invite(2); toast("Invite sent", "Start your 2 minutes too"); track("pinky_hop"); })}
      onCheer={() => pinkyRun(async () => { await chat.sendText("I am cheering for your Pinky."); })} />);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [shownMsgs.length, chat.typing]);
  useEffect(() => { people.refresh(); }, [chat.messages.length]); // eslint-disable-line
  const run = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); } catch (e) { setErr((e as Error).message); } };
  const send = () => { const t = text.trim(); if (!t) return; setText(""); run(async () => { await chat.sendText(t); game.earn("chat"); }); };
  const onType = (v: string) => { setText(v); window.clearTimeout(tt.current); tt.current = window.setTimeout(chat.sendTyping, 300); };
  const joined = (sid: string) => chat.messages.some(m => m.kind === "session_join" && m.session?.id === sid);
  const begin = (sid: string, dur: number, room?: boolean) => { if (started.includes(sid)) return; setStarted(s => [...s, sid]); startSession(room ? "Quiet room" : f.name, dur, { sid, friendId: f.id, name: room ? "Quiet room" : f.name, avatar: f.avatar, ...(room ? { room: true } : {}) }); };
  return (
    <div className="animate-rise mx-auto flex w-full max-w-2xl flex-col gap-4 lg:max-w-4xl" style={{ minHeight: "calc(100vh - 11rem)" }}>
      <div className="sticky top-0 z-30 -mx-5 -mt-2 border-b border-border/50 bg-background/95 px-5 pb-2 pt-2 lg:mx-0 lg:rounded-b-2xl lg:px-4 shadow-sm backdrop-blur-xl">
      <button onClick={back} className="flex w-fit items-center gap-1 lg:hidden text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Friends</button>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="relative"><button aria-label={`Open ${f.name}'s profile`} onClick={() => openProfile(f.username)}><Avatar spec={f.avatar} size={40} /></button><span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background ${chat.online ? "bg-success" : "bg-muted-foreground/50"}`} /></div>
          <div><button onClick={() => openProfile(f.username)} className="text-start"><h1 className="text-xl font-semibold hover:underline">{f.name}</h1></button><div className="text-sm text-muted-foreground">{chat.online ? "Online now" : lastSeenText(f.lastSeen)}</div>{!f.pk && <div className="mt-0.5 text-xs text-accent">{first} has not turned on private messaging yet. They need to sign in once.</div>}</div></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><button aria-label="More" className="rounded-full p-2 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openProfile(f.username)}>View profile</DropdownMenuItem>
            {f.pk && <DropdownMenuItem onSelect={() => setShowCode(v => !v)}>Privacy and safety code</DropdownMenuItem>}
            <DropdownMenuItem onSelect={async () => { const reason = prompt(`Report ${f.name}. What is the problem? (for example: spam, rude, unsafe)`); if (!reason) return; try { await api("report", { body: { id: f.id, reason: reason.slice(0, 40), text: reason } }); alert("Thanks. We aim to look at every report within 3 days."); } catch (e) { alert((e as Error).message); } }}>Report</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={async () => { if (confirm(`Remove ${f.name} from your circle?`)) { await people.remove(f.id, confirm("Also block them so they cannot message you?")); back(); } }}>Remove from circle</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showCode && f.pk && <p className="mt-2 rounded-2xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">Private chat. Only you and {first} can read it. Safety code <b className="text-foreground">{code || "..."}</b>. Compare it with your friend in person or on a call. If it matches, nobody is listening in.</p>}
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
                {m.kind === "file" ? <FileBubble m={m} meId={me.id} pk={f.pk ?? null} /> : m.kind === "pinky" && m.pinky ? (() => { const pp = pacts.find(x => x.id === m.pinky!.id); return pp ? pinkyCard(pp) : null; })() : m.kind === "plan" && m.plan ? <PlanCard p={m.plan} mine={mine} first={first} blocks={plan.blocks} onAdd={() => { const p = m.plan!; plan.addBlock({ title: p.title, day: p.day, start: p.start, dur: p.dur, remind: 10, sharedId: p.id }); run(() => chat.sendText("I am in for “" + p.title + "”.")); game.earn("chat"); track("plan_accept"); }} /> : m.kind === "session" && m.session ? (
                  <div><div className="flex items-center gap-2 font-medium"><Timer className="h-4 w-4" />{m.text}</div>
                    {!mine && !sj && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => run(async () => { await chat.joinSession(m.session!.id, m.session!.dur, m.session!.room); begin(m.session!.id, m.session!.dur, m.session!.room); })}>Join now</Button>}
                    {!mine && sj && !started.includes(m.session.id) && <Button size="sm" variant="hero" className="mt-2 rounded-full" onClick={() => begin(m.session!.id, m.session!.dur, m.session!.room)}>Open timer</Button>}
                    {mine && m.session.room && <div className="mt-1 text-xs opacity-80">Invite sent. Your quiet room is open.</div>}
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
      <>
        <div className="flex flex-wrap gap-2">
          {!pickDur && <Button size="sm" variant="outline" className="rounded-full" disabled={!!activeP && !pinkyOpen} title={activeP ? "A Pinky is already open with this friend" : undefined} onClick={() => setPinkyOpen(o => !o)}><HeartHandshake className="mr-1 h-3.5 w-3.5" />Promise</Button>}
          {!pickDur && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPlanOpen(o => !o)}><CalendarPlus className="mr-1 h-3.5 w-3.5" />Plan together</Button>}
          {!pickDur ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPickDur(true)}><Timer className="mr-1 h-3.5 w-3.5" />Focus together</Button> : [15, 25, 45].map(d => <Button key={d} size="sm" variant="hero" className="rounded-full" onClick={() => { setPickDur(false); run(() => chat.invite(d)); }}>{d} min</Button>)}
          {pacts.length > 0 && !pickDur && <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={() => setBurrowOpen(o => !o)}>Together {rhythm(pacts, now).thisWeek}/{rhythm(pacts, now).goal}</Button>}
        </div>
        {pacts.length > 0 && burrowOpen && <Burrow first={first} kept={keptN} r={rhythm(pacts, now)} />}
        {pinkyOpen && !activeP && <PinkyForm first={first} onClose={() => setPinkyOpen(false)} onSend={pinkyMake} />}
        {planOpen && <PlanTogetherForm first={first} onClose={() => setPlanOpen(false)} onSend={async (p, addMine) => { await chat.sendPlan(p); if (addMine) plan.addBlock({ title: p.title, day: p.day, start: p.start, dur: p.dur, remind: 10, sharedId: p.id }); game.earn("chat"); track("plan_send"); }} />}
        {(err || chat.error) && <p className="text-xs text-destructive" role="alert">{err || chat.error}</p>}
        <div className="sticky bottom-24 z-20 lg:bottom-4 rounded-3xl bg-background shadow-md">
        <div className="glass flex items-end gap-2 rounded-3xl p-2">
          <button aria-label="Attach a file" onClick={() => fileRef.current?.click()} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground"><Paperclip className="h-5 w-5" /></button>
          <input ref={fileRef} type="file" hidden onChange={e => { const file = e.target.files?.[0]; if (file) run(async () => { await chat.sendFile(file, text.trim()); setText(""); game.earn("nudge"); }); e.target.value = ""; }} />
          <EmojiPicker onPick={insertEmoji} />
          <textarea ref={ta} value={text} onChange={e => onType(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={`Message ${first}...`} className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none" />
          <button aria-label="Send" onClick={send} disabled={!text.trim()} className="rounded-full bg-primary p-2.5 text-primary-foreground disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </div>
        </div>
      </>
    </div>);
}
