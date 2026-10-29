import { useEffect, useRef, useState } from "react";
import { Activity, CalendarCheck, Heart, Home, LogOut, MessageCircle, Moon, Sprout, Sun } from "lucide-react";
import { CheckInTab } from "@/components/CheckInTab";
import { TodayTab } from "@/components/TodayTab";
import { TuneTab } from "@/components/TuneTab";
import { PlanTab } from "@/components/PlanTab";
import { AnnounceBanner } from "@/components/AnnounceBanner";
import { CircleTab } from "@/components/CircleTab";
import { MeTab } from "@/components/MeTab";
import { FxHost } from "@/components/FxHost";
import { FocusTimer } from "@/components/FocusTimer";
import { AuthScreen } from "@/components/AuthScreen";
import { UnlockScreen } from "@/components/UnlockScreen";
import { MeetFriend } from "@/components/MeetFriend";
import { PulseCard } from "@/components/PulseCard";
import { track } from "@/lib/track";
import { Avatar } from "@/components/Avatar";
import { useHistory } from "@/store/useHistory";
import { useJournal } from "@/store/useJournal";
import { useGame } from "@/store/useGame";
import { usePlan } from "@/store/usePlan";
import { usePeople, totalUnread } from "@/store/usePeople";
import { useAuth, type AuthApi, type User } from "@/store/useAuth";
import { useCalendar } from "@/store/useCalendar";
import { useFeedback } from "@/store/useFeedback";
import { itemsForDay } from "@/engine/calendar";
import { toast } from "@/lib/fx";
import { suggestSteps, uid } from "@/engine/plan";
import { dkey } from "@/engine/game";
import type { Action } from "@/engine/dialogue";

const TABS = [
  { id: "today", label: "Today", icon: Home },
  { id: "plan", label: "Plan", icon: CalendarCheck },
  { id: "tune", label: "Tune", icon: MessageCircle },
  { id: "checkin", label: "Check-in", icon: Activity },
  { id: "circle", label: "Circle", icon: Heart },
  { id: "me", label: "Me", icon: Sprout },
] as const;
type Tab = (typeof TABS)[number]["id"];

const useTheme = () => {
  const [dark, setDark] = useState(() => localStorage.getItem("cognitune.theme") === "dark");
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("cognitune.theme", dark ? "dark" : "light"); }, [dark]);
  return [dark, setDark] as const;
};

const Index = () => {
  const auth = useAuth(); useTheme();
  if (auth.loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-12 w-12 animate-morph" style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} /></div>;
  if (!auth.user) return <><FxHost /><AuthScreen auth={auth} /></>;
  if (auth.locked) return <UnlockScreen auth={auth} />;
  if (auth.needsAvatar) return <><FxHost /><MeetFriend auth={auth} /></>;
  return <Shell auth={auth} user={auth.user} />;
};

function Shell({ auth, user }: { auth: AuthApi; user: User }) {
  const { history, add, update, clear, remove } = useHistory();
  const j = useJournal(history); const game = useGame(); const plan = usePlan(); const cal = useCalendar(plan.blocks); const fb = useFeedback();
  const agenda = itemsForDay(dkey(), plan.blocks, cal.events);
  const [tab, setTab] = useState<Tab>("today"); const [openId, setOpenId] = useState<string | null>(null);
  const [live, setLive] = useState<{ title: string; dur: number; solo?: boolean } | null>(null);
  const [dark, setDark] = useTheme();
  const tabRef = useRef(tab); tabRef.current = tab; const openRef = useRef(openId); openRef.current = openId;
  const people = usePeople(true, f => { if (!(tabRef.current === "circle" && openRef.current === f.id)) toast(f.name, f.last?.text.slice(0, 60) ?? "New message"); });
  const unread = totalUnread(people.friends);
  useEffect(() => { track("app_open", undefined, true); }, []);
  useEffect(() => { const n = ({ tune: "tab_tune", circle: "tab_circle", plan: "tab_plan", checkin: "tab_checkin" } as Record<string, "tab_tune" | "tab_circle" | "tab_plan" | "tab_checkin">)[tab]; if (n) track(n, undefined, true); }, [tab]);
  const onTuneAction = (a: Action) => {
    if (a.type === "timer") setLive({ title: a.task, dur: a.minutes, solo: true });
    else if (a.type === "task") { plan.addTask({ title: a.title, steps: suggestSteps(a.title) }); toast("Added to Plan", a.title); }
    else if (a.type === "tasks") { a.items.forEach(t => plan.addTask({ title: t, steps: [] })); toast("Saved to Plan", `${a.items.length} things`); }
    else if (a.type === "block") { plan.addBlock({ title: a.title, day: dkey(), start: a.start, dur: a.dur }); toast("Booked in Plan", a.title); }
    else if (a.type === "earn") game.earn(a.kind === "started" ? "started" : a.kind === "task" ? "task" : "journal", { early: new Date().getHours() < 9 });
    else if (a.type === "goto") setTab(a.tab as Tab);
  };
  void uid;
  const lastTask = history[history.length - 1]?.task && history[history.length - 1].task !== "Untitled" ? history[history.length - 1].task : plan.tasks.find(t => !t.doneAt)?.title ?? "";
  void lastTask;
  return (
    <div className="min-h-screen pb-28">
      <FxHost />
      <AnnounceBanner />
      <PulseCard />
      {live && <FocusTimer color="var(--f-flexion)" task={live.title} minutes={live.dur} autoStart onStarted={() => { track("timer_start"); if (!live.solo) track("together_start"); }} onDone={() => { track("timer_done"); game.earn(live.solo ? "timer" : "buddy"); }} onClose={() => setLive(null)} />}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 animate-morph" style={{ background: "radial-gradient(circle at 35% 30%, hsl(var(--primary)), hsl(var(--primary) / .3))" }} />
          <span className="text-2xl font-semibold tracking-tight">Cognitune</span>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="Switch between light and dark" onClick={() => setDark(!dark)} className="glass rounded-full p-2.5 text-muted-foreground hover:text-foreground">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <button aria-label="Log out" title="Log out" onClick={() => { if (confirm("Log out of Cognitune on this device?")) auth.logout(); }} className="glass flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Log out</span></button>
          <button aria-label="Your profile" onClick={() => setTab("me")}><Avatar spec={user.avatar} size={40} ring /></button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl overflow-x-clip px-5 pt-8">
        {tab === "today" && <TodayTab j={j} go={t => setTab(t as Tab)} game={game} plan={plan} agenda={agenda} />}
        {tab === "plan" && <PlanTab plan={plan} game={game} history={history} cal={cal} />}
        {tab === "tune" && <TuneTab j={j} earnChat={() => game.earn("chat")} earnJournal={() => game.earn("journal")} onAction={onTuneAction} fb={fb} />}
        <div className={tab === "checkin" ? "" : "hidden"}><CheckInTab history={history} profile={j.profile} onSave={c => { add(c); game.earn("checkin"); track("checkin"); }} onStarted={id => { update(id, { started: true }); game.earn("started", { early: new Date().getHours() < 9 }); track("timer_start"); }} onDone={() => { game.earn("timer"); track("timer_done"); }} /></div>
        {tab === "circle" && <CircleTab people={people} game={game} me={user} openId={openId} setOpenId={setOpenId} startSession={(name, dur) => setLive({ title: `Focusing with ${name}`, dur })} />}
        {tab === "me" && <MeTab fb={fb} auth={auth} game={game} profile={j.profile} history={history} onFollowUp={(id, s) => update(id, { started: s })} onClear={() => { clear(); j.clear(); }} onDelete={remove} />}
      </main>
      <nav className="glass fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 gap-0.5 rounded-full p-1.5" aria-label="Main">
        {TABS.map(t => { const I = t.icon, on = tab === t.id; return (
          <button key={t.id} onClick={() => setTab(t.id)} aria-label={t.label} aria-current={on ? "page" : undefined} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm transition ${on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="relative"><I className="h-4 w-4" />{t.id === "circle" && unread > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread}</span>}</span><span className={on ? "" : "hidden lg:inline"}>{t.label}</span>
          </button>); })}
      </nav>
    </div>
  );
}
export default Index;
