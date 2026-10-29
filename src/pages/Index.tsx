import { useEffect, useRef, useState } from "react";
import { Activity, CalendarCheck, Heart, Home, MessageCircle, Moon, Sprout, Sun } from "lucide-react";
import { CheckInTab } from "@/components/CheckInTab";
import { TodayTab } from "@/components/TodayTab";
import { TuneTab } from "@/components/TuneTab";
import { PlanTab } from "@/components/PlanTab";
import { CircleTab } from "@/components/CircleTab";
import { MeTab } from "@/components/MeTab";
import { FxHost } from "@/components/FxHost";
import { useHistory } from "@/store/useHistory";
import { useJournal } from "@/store/useJournal";
import { useGame } from "@/store/useGame";
import { usePlan } from "@/store/usePlan";
import { usePeople, unread, type Person } from "@/store/usePeople";
import { useChat } from "@/net/useChat";
import { JoinDialog } from "@/components/JoinDialog";
import { FocusTimer } from "@/components/FocusTimer";
import { toast } from "@/lib/fx";

const TABS = [
  { id: "today", label: "Today", icon: Home },
  { id: "plan", label: "Plan", icon: CalendarCheck },
  { id: "tune", label: "Tune", icon: MessageCircle },
  { id: "checkin", label: "Check-in", icon: Activity },
  { id: "circle", label: "Circle", icon: Heart },
  { id: "me", label: "Me", icon: Sprout },
] as const;
type Tab = (typeof TABS)[number]["id"];

const Index = () => {
  const { history, add, update, clear, remove } = useHistory();
  const j = useJournal(history);
  const game = useGame();
  const plan = usePlan();
  const people = usePeople();
  const [tab, setTab] = useState<Tab>("today");
  const [openId, setOpenId] = useState<string | null>(null);
  const [live, setLive] = useState<{ name: string; dur: number } | null>(null);
  const [invite, setInvite] = useState<{ room: string; from: string } | null>(() => { const h = new URLSearchParams(location.hash.slice(1)); const room = h.get("join"); return room ? { room, from: h.get("from") || "A friend" } : null; });
  const tabRef = useRef(tab); tabRef.current = tab; const openRef = useRef(openId); openRef.current = openId;
  const chat = useChat(people, {
    onIncoming: (p: Person, m) => { if (!(tabRef.current === "circle" && openRef.current === p.id)) toast(p.name, m.kind === "file" ? "Sent you a file" : m.kind === "session" ? "Invited you to focus together" : m.text.slice(0, 60)); },
    onSessionJoin: (p: Person, sid: string) => { const msg = p.thread.find(t => t.session?.id === sid); if (msg?.session) { people.patchMsg(p.id, msg.id, { session: { ...msg.session, status: "joined" } }); setLive({ name: p.name, dur: msg.session.dur }); } },
  });
  const acceptInvite = (myName: string) => {
    if (!invite) return; j.set({ name: myName });
    const existing = people.ref.current.find(p => p.roomId === invite.room); const p = existing ?? people.add({ name: invite.from, relation: "friend", roomId: invite.room });
    history_clear(); setInvite(null); setOpenId(p.id); setTab("circle"); game.earn("nudge", { people: 1 });
  };
  const history_clear = () => { try { window.history.replaceState(null, "", location.pathname + location.search); } catch { /* ignore */ } };
  const unreadTotal = people.people.reduce((a, p) => a + unread(p), 0);
  const [dark, setDark] = useState(() => localStorage.getItem("cognitune.theme") === "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("cognitune.theme", dark ? "dark" : "light"); }, [dark]);
  const lastTask = history[history.length - 1]?.task && history[history.length - 1].task !== "Untitled" ? history[history.length - 1].task : plan.tasks.find(t => !t.doneAt)?.title ?? "";
  return (
    <div className="min-h-screen pb-28">
      <FxHost />
      {invite && <JoinDialog inviter={invite.from} defaultName={j.settings.name} onJoin={acceptInvite} onCancel={() => { history_clear(); setInvite(null); }} />}
      {live && <FocusTimer color="var(--f-flexion)" task={`Focusing with ${live.name}`} minutes={live.dur} autoStart onStarted={() => {}} onDone={() => game.earn("buddy")} onClose={() => setLive(null)} />}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 animate-morph" style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} />
          <span className="text-2xl font-semibold tracking-tight">Cognitune</span>
        </div>
        <button aria-label="Switch between light and dark" onClick={() => setDark(!dark)} className="glass rounded-full p-2.5 text-muted-foreground hover:text-foreground">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
      </header>
      <main className="mx-auto max-w-5xl overflow-x-clip px-5 pt-8">
        {tab === "today" && <TodayTab j={j} go={t => setTab(t as Tab)} game={game} plan={plan} />}
        {tab === "plan" && <PlanTab plan={plan} game={game} history={history} />}
        {tab === "tune" && <TuneTab j={j} earnChat={() => game.earn("chat")} earnJournal={() => game.earn("journal")} />}
        <div className={tab === "checkin" ? "" : "hidden"}><CheckInTab history={history} profile={j.profile} onSave={c => { add(c); game.earn("checkin"); }} onStarted={id => { update(id, { started: true }); game.earn("started", { early: new Date().getHours() < 9 }); }} onDone={() => game.earn("timer")} /></div>
        {tab === "circle" && <CircleTab people={people} chat={chat} game={game} selfName={j.settings.name} openId={openId} setOpenId={setOpenId} startSession={(p, dur) => setLive({ name: p.name, dur })} />}
        {tab === "me" && <MeTab game={game} profile={j.profile} history={history} onFollowUp={(id, s) => update(id, { started: s })} onClear={() => { clear(); j.clear(); }} onDelete={remove} />}
      </main>
      <nav className="glass fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-0.5 rounded-full p-1.5" aria-label="Main">
        {TABS.map(t => { const I = t.icon, on = tab === t.id; return (
          <button key={t.id} onClick={() => setTab(t.id)} aria-label={t.label} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm transition ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="relative"><I className="h-4 w-4" />{t.id === "circle" && unreadTotal > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unreadTotal}</span>}</span><span className={on ? "" : "hidden lg:inline"}>{t.label}</span>
          </button>); })}
      </nav>
    </div>
  );
};
export default Index;
