import { useEffect, useRef, useState } from "react";
import { Activity, CalendarCheck, Heart, Home, LogOut, Moon, Sprout, Sun } from "lucide-react";
import { CheckInTab } from "@/components/CheckInTab";
import { TodayTab } from "@/components/TodayTab";
import { PlanTab } from "@/components/PlanTab";
import { AnnounceBanner } from "@/components/AnnounceBanner";
import { CircleTab } from "@/components/CircleTab";
import { MeTab } from "@/components/MeTab";
import { FxHost } from "@/components/FxHost";
import { FocusTimer } from "@/components/FocusTimer";
import { AuthScreen } from "@/components/AuthScreen";
import { UnlockScreen } from "@/components/UnlockScreen";
import { MeetFriend } from "@/components/MeetFriend";
import { LofiButton } from "@/components/LofiPanel";
import { PulseCard } from "@/components/PulseCard";
import type { AvatarSpec } from "@/engine/avatar";
import { track } from "@/lib/track";
import { Avatar } from "@/components/Avatar";
import { Mascot, Wordmark } from "@/components/Mascot";
import { useHistory } from "@/store/useHistory";
import { useJournal } from "@/store/useJournal";
import { useGame } from "@/store/useGame";
import { usePlan } from "@/store/usePlan";
import { usePeople, totalUnread } from "@/store/usePeople";
import { useHops } from "@/store/useHops";
import { useAuth, type AuthApi, type User } from "@/store/useAuth";
import { useCalendar } from "@/store/useCalendar";
import { itemsForDay } from "@/engine/calendar";
import { notify } from "@/lib/notify";
import { api } from "@/lib/api";
import { useBurrow } from "@/store/useBurrow";
import { LangPicker } from "@/components/LangPicker";
import { getLang } from "@/i18n";
import { takeGuestStart } from "@/lib/guest";
import { useBlockReminders } from "@/store/useBlockReminders";
import type { Block } from "@/engine/plan";
import { StartsCard } from "@/components/StartsCard";
import { invitedBy, clearInvite } from "@/lib/invite";
import { suggestSteps, uid } from "@/engine/plan";
import { dkey } from "@/engine/game";
import { usePresence } from "@/lib/presence";
import { wornNow } from "@/components/Rabbit";

const TABS = [
  { id: "today", label: "Today", icon: Home },
  { id: "plan", label: "Plan", icon: CalendarCheck },
  { id: "checkin", label: "Start", icon: Activity },
  { id: "circle", label: "Friends", icon: Heart },
  { id: "me", label: "Me", icon: Sprout },
] as const;
type Tab = (typeof TABS)[number]["id"];

const useTheme = () => {
  const [dark, setDark] = useState(() => localStorage.getItem("lagomo.theme") === "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("lagomo.theme", dark ? "dark" : "light"); }, [dark]);
  return [dark, setDark] as const;
};

const Index = () => {
  const auth = useAuth(); useTheme();
  if (auth.loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-12 w-12 animate-morph" style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} /></div>;
  if (!auth.user || new URLSearchParams(window.location.search).get("reset")) return <><FxHost /><AuthScreen auth={auth} /></>;
  if (auth.locked) return <UnlockScreen auth={auth} />;
  if (auth.needsAvatar) return <><FxHost /><MeetFriend auth={auth} /></>;
  return <Shell auth={auth} user={auth.user} />;
};

function Shell({ auth, user }: { auth: AuthApi; user: User }) {
  const { history, add, update, clear, remove } = useHistory();
  const j = useJournal(history); const game = useGame(); const plan = usePlan(); const cal = useCalendar(plan.blocks);
  const agenda = itemsForDay(dkey(), plan.blocks, cal.events);
  const [tab, setTab] = useState<Tab>("today"); const [openId, setOpenId] = useState<string | null>(null);
  const [live, setLive] = useState<{ title: string; dur: number; solo?: boolean; buddy?: { sid: string; friendId: string; name: string; avatar: AvatarSpec; room?: boolean }; resources?: Block; blockId?: string; onDoneExtra?: () => void } | null>(null);
  // A reminder (toast or phone alert) opens "/?start=BLOCK_ID": go straight to that block's timer with its resources.
  const planRef = useRef(plan); planRef.current = plan;
  const startBlock = (b: Block) => setLive({ title: b.title, dur: Math.min(b.dur, 45), solo: true, resources: b, blockId: b.id });
  useEffect(() => {
    const open = (raw: string) => { try { const sp = new URL(raw, location.origin).searchParams; if (sp.has("undo")) { planRef.current.undoRemove(); track("block_undo"); return; } const id = sp.get("start"); if (!id) return; const b = planRef.current.blocks.find(x => x.id === id); if (b && !b.done) { startBlock(b); track("block_start_from_reminder"); } } catch { /* ignore a bad link */ } };
    if (new URLSearchParams(location.search).has("start")) { open(location.href); window.history.replaceState(null, "", location.pathname); }
    const onLink = (e: Event) => open((e as CustomEvent).detail.url);
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "open" && typeof e.data.url === "string") open(e.data.url); };
    window.addEventListener("lagomo:open", onLink); navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => { window.removeEventListener("lagomo:open", onLink); navigator.serviceWorker?.removeEventListener("message", onMsg); };
  }, []);
  const [dark, setDark] = useTheme();
  const tabRef = useRef(tab); tabRef.current = tab; const openRef = useRef(openId); openRef.current = openId;
  const people = usePeople(true, (f, n) => { if (!(tabRef.current === "circle" && openRef.current === f.id && !document.hidden)) notify({ id: `msg:${f.id}:${f.unread}`, tag: "msg:" + f.id, title: f.name, body: n > 1 ? `${n} new messages` : "New message" }); });
  const burrow = useBurrow(); useBlockReminders(plan);
  useEffect(() => {
    if (!takeGuestStart()) return;
    game.earn("started"); localStorage.setItem("lagomo.firstStart", "1"); track("timer_start");
    notify({ id: "guest-saved", tag: "guest", title: "Your first start is saved", body: "That counts. Next time, a friend can see you started." });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const sync = () => { api("lang", { body: { lang: getLang() } }).catch(() => undefined); };
    sync(); window.addEventListener("lagomo:lang", sync); return () => window.removeEventListener("lagomo:lang", sync);
  }, []);
  useEffect(() => {
    const u = invitedBy(); if (!u || u === user.username) return; clearInvite();
    api("friend-request", { body: { username: u } }).then(() => { people.refresh(); track("invite_join"); }).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const ping = () => { if (!document.hidden) api("ping", { body: {} }).catch(() => undefined); };
    ping(); const t = setInterval(ping, 25000); document.addEventListener("visibilitychange", ping); window.addEventListener("focus", ping);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", ping); window.removeEventListener("focus", ping); };
  }, []);
  const unread = totalUnread(people.friends);
  const hops = useHops(people.friends, true);
  const friendsStarted = people.friends.filter(f => hops.hops[f.id] && new Date(hops.hops[f.id]).toDateString() === new Date().toDateString()).length;
  const hasStarted = !!localStorage.getItem("lagomo.firstStart") || (game.g.counts.started ?? 0) > 0;
  const deepUser = true;
  usePresence({ name: user.name, started: game.g.todayActive && game.g.today === dkey(), streak: game.g.streak.current, friendsStarted, wear: wornNow(), starts: game.g.counts.started ?? 0, face: "calm" });
  useEffect(() => { if (!new URLSearchParams(location.search).has("start")) return; const t = window.setTimeout(() => (document.querySelector('[aria-label="What are you putting off"]') as HTMLInputElement | null)?.focus(), 700); return () => window.clearTimeout(t); }, []);
  useEffect(() => { track("app_open", undefined, true); }, []);
  useEffect(() => { const n = ({ circle: "tab_circle", plan: "tab_plan", checkin: "tab_checkin" } as Record<string, "tab_circle" | "tab_plan" | "tab_checkin">)[tab]; if (n) track(n, undefined, true); }, [tab]);
  void uid;
  const lastTask = history[history.length - 1]?.task && history[history.length - 1].task !== "Untitled" ? history[history.length - 1].task : plan.tasks.find(t => !t.doneAt)?.title ?? "";
  void lastTask;
  return (
    <div className="min-h-screen pb-28 lg:pb-12 lg:pl-56">
      <FxHost />
      <AnnounceBanner />
      <PulseCard />
      {live && <FocusTimer color="var(--f-flexion)" task={live.title} minutes={live.dur} autoStart buddy={live.buddy} hasFriends={people.friends.length > 0} username={user.username} cele={{ sparks: live.solo ? 10 : 12, streak: game.g.streak.current, me: user.avatar }} extra={<StartsCard compact name={user.name} avatar={user.avatar} g={game.g} />} onStarted={() => { track("timer_start"); if (!live.solo) track("together_start"); }} resources={live.resources} onDone={() => { track("timer_done"); game.earn(live.solo ? "timer" : "buddy"); if (live.blockId) plan.patchBlock(live.blockId, { done: true }); live.onDoneExtra?.(); }} onClose={() => setLive(null)} />}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 pt-6 max-[340px]:px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <Mascot size={32} />
          <Wordmark className="text-xl font-semibold tracking-tight max-[340px]:hidden sm:text-2xl" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 max-[340px]:gap-1 sm:gap-2">
          {deepUser && <LofiButton />}
          <LangPicker />
          {deepUser && <button aria-label="Switch between light and dark" onClick={() => setDark(!dark)} className="glass rounded-full p-2 text-muted-foreground hover:text-foreground sm:p-2.5">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>}
          <button aria-label="Log out" title="Log out" onClick={() => { if (confirm("Log out of Lagomo on this device?")) auth.logout(); }} className="glass hidden items-center gap-1.5 rounded-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground sm:flex"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Log out</span></button>
          <button aria-label="Your profile" onClick={() => setTab("me")}><Avatar spec={user.avatar} size={36} ring /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl overflow-x-clip px-5 pt-8">
        {tab === "today" && <TodayTab avatar={user.avatar} onPinky={id => { sessionStorage.setItem("lagomo.pinky.open", id); setOpenId(id); setTab("circle"); track("pinky_door"); }} onStartBlock={b => { startBlock(b); track("block_start_today"); }} j={j} name={user.name} go={t => { if (t.startsWith("circle:")) { setOpenId(t.slice(7)); setTab("circle"); } else setTab(t as Tab); }} game={game} plan={plan} agenda={agenda} onStart={(title, step) => { game.earn("started", { early: new Date().getHours() < 9 }); track("timer_start"); localStorage.setItem("lagomo.firstStart", "1"); hops.hopIn(); setTimeout(burrow.reload, 1500); setLive({ title: step || title, dur: 2, solo: true }); }} friends={people.friends} hops={hops} burrow={burrow} username={user.username} />}
        {tab === "plan" && <PlanTab plan={plan} game={game} history={history} cal={cal} />}
        <div className={tab === "checkin" ? "" : "hidden"}><CheckInTab history={history} profile={j.profile} onSave={c => { add(c); game.earn("checkin"); track("checkin"); }} onStarted={id => { update(id, { started: true }); game.earn("started", { early: new Date().getHours() < 9 }); track("timer_start"); }} onDone={() => { game.earn("timer"); track("timer_done"); }} /></div>
        {tab === "circle" && <CircleTab startPinky={(title, onDoneExtra) => setLive({ title, dur: 2, solo: true, onDoneExtra })} pairs={burrow.pairs} people={people} game={game} plan={plan} me={user} openId={openId} setOpenId={setOpenId} startSession={(name, dur, buddy) => setLive({ title: buddy?.room ? "In the quiet room" : `Focusing with ${name}`, dur, buddy })} />}
        {tab === "me" && <MeTab j={j} auth={auth} game={game} profile={j.profile} history={history} onFollowUp={(id, s) => update(id, { started: s })} onClear={() => { clear(); j.clear(); }} onDelete={remove} />}
      </main>
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-1 border-r border-border bg-background/70 px-3 pb-6 pt-24 backdrop-blur lg:flex" aria-label="Main">
        {TABS.filter(t => t.id !== "checkin" && (deepUser || t.id === "today" || t.id === "circle" || t.id === tab || (hasStarted && t.id === "plan"))).map(t => { const I = t.icon, on = tab === t.id; return (
          <button key={t.id} onClick={() => setTab(t.id)} aria-current={on ? "page" : undefined} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-start text-[15px] transition ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>
            <span className="relative"><I className="h-5 w-5" />{t.id === "circle" && unread > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread}</span>}</span>{t.label}
          </button>); })}
      </nav>
      <nav className="glass fixed bottom-5 lg:hidden left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-0.5 rounded-full p-1.5" aria-label="Main">
        {TABS.filter(t => t.id !== "checkin" && (deepUser || t.id === "today" || t.id === "circle" || t.id === tab || (hasStarted && t.id === "plan"))).map(t => { const I = t.icon, on = tab === t.id; return (
          <button key={t.id} onClick={() => setTab(t.id)} aria-label={t.label} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm transition ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="relative"><I className="h-4 w-4" />{t.id === "circle" && unread > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread}</span>}</span><span className="text-xs sm:text-sm">{t.label}</span>
          </button>); })}
      </nav>
    </div>
  );
}
export default Index;
