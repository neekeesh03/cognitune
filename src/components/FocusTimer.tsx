import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Pause, Play, X } from "lucide-react";
import { LofiPanel } from "@/components/LofiPanel";
import { Mascot } from "@/components/Mascot";
import { AfterStart } from "@/components/AfterStart";
import { GuestSave } from "@/components/GuestStart";
import { Celebration } from "@/components/Celebration";
import { ResourceList } from "@/components/BringAlong";
import { hasResources, type Block } from "@/engine/plan";
import { Avatar } from "@/components/Avatar";
import { useBuddy, useRoom, roomCheer, type Buddy } from "@/net/useBuddy";
import { CHEER_EMOJI } from "@/store/useHops";
import type { AvatarSpec } from "@/engine/avatar";

interface Props { color: string; task: string; onStarted: () => void; onClose: () => void; onDone?: () => void; minutes?: number; autoStart?: boolean; buddy?: Buddy & { avatar: AvatarSpec }; hasFriends?: boolean; username?: string; guest?: { onSave: () => void }; extra?: ReactNode; cele?: { sparks?: number; streak?: number; me?: AvatarSpec }; resources?: Block }
const PRESETS = [{ m: 2, label: "2 min entry" }, { m: 10, label: "10 min sprint" }, { m: 25, label: "25 min block" }];
/** Shown on top of everything, so the nav bar and header never overlap the timer. */
export function FocusTimer(p: Props) { return createPortal(<FocusTimerInner {...p} />, document.body); }
function FocusTimerInner({ color, task, onStarted, onClose, onDone, minutes, autoStart, buddy, hasFriends, username, guest, extra, cele, resources }: Props) {
  const start = (minutes ?? 2) * 60;
  const [total, setTotal] = useState(start);
  const [left, setLeft] = useState(start);
  const [run, setRun] = useState(!!autoStart);
  const [done, setDone] = useState(false);
  const [how, setHow] = useState<string | null>(null);
  const fired = useRef(false); const doneFired = useRef(false); const [celeSeen, setCeleSeen] = useState(false);
  const more = (m: number) => { setTotal(m * 60); setLeft(m * 60); setDone(false); setHow(null); setRun(true); };
  const mineState = done ? "done" : run ? "working" : "waiting";
  const isRoom = !!buddy?.room;
  const buddyState = useBuddy(isRoom ? undefined : buddy, mineState);
  const members = useRoom(isRoom ? buddy!.sid : undefined, mineState);
  const seenCheer = useRef<Record<string, number>>({}); const [floats, setFloats] = useState<Record<string, string>>({}); const [mineFloat, setMineFloat] = useState("");
  useEffect(() => { members.forEach(m => { if (m.e && m.et && m.et > (seenCheer.current[m.id] || 0)) { seenCheer.current[m.id] = m.et; setFloats(f => ({ ...f, [m.id]: m.e! })); window.setTimeout(() => setFloats(f => { const n = { ...f }; delete n[m.id]; return n; }), 2600); } }); }, [members]);
  const cheerRoom = (e: string) => { if (!isRoom) return; setMineFloat(e); window.setTimeout(() => setMineFloat(""), 2600); roomCheer(buddy!.sid, mineState, e); };
  const roomDone = isRoom && members.length > 0 && members.every(m => m.state === "done");
  const roomLine = (m: { name: string; state: string }) => m.state === "working" ? "working" : m.state === "done" ? "finished" : m.state === "left" ? "stepped away" : m.state === "waiting" ? "here" : "not here yet";
  const first = buddy?.name.split(" ")[0] ?? "";
  const buddyLine = !buddy || isRoom ? "" : buddyState === "working" ? `${first} is working too` : buddyState === "done" ? `${first} finished` : buddyState === "left" ? `${first} stepped away` : buddyState === "waiting" ? `${first} is here` : `Waiting for ${first}...`;
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setLeft(l => { if (l <= 1) { clearInterval(id); setRun(false); setDone(true); setTimeout(() => { if (!doneFired.current) { doneFired.current = true; onDone?.(); } }, 0); return 0; } return l - 1; }), 1000);
    return () => clearInterval(id);
  }, [run]);
  useEffect(() => { if (run && !fired.current) { fired.current = true; onStarted(); } }, [run, onStarted]);
  const size = 260, r = 112, c = 2 * Math.PI * r, frac = left / total;
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  if (done && !celeSeen) return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-xl animate-rise">
      <Celebration minutes={Math.max(1, Math.round(total / 60))} sparks={cele?.sparks} streak={cele?.streak} me={cele?.me} buddy={buddy && !isRoom ? buddy.avatar : undefined}
        title={roomDone ? "Everyone finished!" : buddy && !isRoom && buddyState === "done" ? "You both finished!" : undefined} onContinue={() => setCeleSeen(true)} />
    </div>);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto py-8 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto bg-background/95 backdrop-blur-xl animate-rise">
      <button aria-label="Close" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:text-foreground"><X /></button>
      <p className="mb-1 text-xs uppercase tracking-[0.25em] text-muted-foreground">Focus</p>
      <h2 className={`${buddy ? "mb-4" : "mb-8"} max-w-sm px-6 text-center text-3xl`}>{task || "Your task"}</h2>
      {!buddy && !done && <div className="mb-6 flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5 text-sm" role="status"><span className={run ? "animate-pulse" : ""}><Mascot size={28} /></span>Lagomo is here with you</div>}
      {resources && hasResources(resources) && !done && <div className="mb-5 w-full max-w-sm px-6"><div className="mb-1 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Bring along</div><ResourceList b={resources} /></div>}
      {isRoom && <div className="mb-6 flex max-w-sm flex-wrap items-center justify-center gap-2" role="status">{members.length === 0 && <span className="rounded-full bg-secondary/70 px-3 py-1.5 text-sm">Waiting for friends to join the quiet room...</span>}{members.map(m => <span key={m.id} title={`${m.name}: ${roomLine(m)}`} className="flex items-center gap-1.5 rounded-full bg-secondary/70 px-2.5 py-1 text-xs"><span className={`relative ${m.state === "working" ? "animate-pulse" : m.state === "none" || m.state === "left" ? "opacity-40" : ""}`}><Avatar spec={m.avatar} size={26} />{floats[m.id] && <span className="cheer-up pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 text-xl" aria-hidden="true" translate="no">{floats[m.id]}</span>}</span>{m.name.split(" ")[0]} {roomLine(m)}</span>)}<span className="text-xs text-muted-foreground">· quiet by design</span></div>}
      {isRoom && !done && <div className="relative mb-5 flex items-center gap-1 rounded-full bg-secondary/60 p-1" role="group" aria-label="Send a cheer to the room" translate="no">{CHEER_EMOJI.map(e => <button key={e} onClick={() => cheerRoom(e)} aria-label={`Cheer ${e}`} className="rounded-full px-2 py-1 text-xl leading-none transition hover:scale-125">{e}</button>)}{mineFloat && <span className="cheer-up pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-2xl" aria-hidden="true">{mineFloat}</span>}</div>}
      {buddy && !isRoom && <div className="mb-6 flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5 text-sm" role="status"><span className={buddyState === "working" ? "animate-pulse" : ""}><Avatar spec={buddy.avatar} size={28} /></span>{buddyLine}<span className="text-xs text-muted-foreground">· quiet by design</span></div>}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground) / .1)" strokeWidth="14" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`hsl(${color})`} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} style={{ transition: "stroke-dasharray 1s linear", filter: `drop-shadow(0 0 10px hsl(${color} / .6))` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-7xl tabular-nums">{done ? "Done" : `${mm}:${ss}`}</div>
          <div className="mt-1 text-xs text-muted-foreground">{done ? (roomDone ? "Everyone in the quiet room finished." : isRoom ? "You started. That is the hard part." : buddy && buddyState === "done" ? "You both finished." : buddy ? "You started. That is the hard part." : "You started. That is the hard part.") : run ? "Just stay with it" : "Press start"}</div>
        </div>
      </div>
      {!minutes && !run && !done && left === total && (
        <div className="mt-8 flex gap-2">{PRESETS.map(p => <button key={p.m} onClick={() => { setTotal(p.m * 60); setLeft(p.m * 60); }} className={`rounded-full border px-4 py-1.5 text-sm transition ${total === p.m * 60 ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{p.label}</button>)}</div>
      )}
      {!done && <div className="mt-6 w-full max-w-sm px-6"><LofiPanel compact /></div>}
      {done && !how && !guest && <div className="mt-6 text-center"><p className="mb-2 text-sm text-muted-foreground">How did it go?</p><div className="flex flex-wrap justify-center gap-2">{[["Did it", "Nice. That counts."], ["Got going", "Starting was the hard part. You did it."], ["Not today", "That is okay. You showed up, and tomorrow is a fresh start."]].map(([k, v]) => <button key={k} onClick={() => setHow(v)} className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-primary hover:text-primary">{k}</button>)}</div></div>}
      {done && how && <p className="mt-6 max-w-xs text-center text-sm" role="status">{how}</p>}
      {done && guest && <GuestSave onSave={guest.onSave} onLater={onClose} />}
      {done && !guest && extra && how && <div className="mt-4">{extra}</div>}
      {done && !isRoom && !guest && <AfterStart onMore={more} hasFriends={!!hasFriends} username={username ?? ""} />}
      <div className="mt-8 flex gap-3">
        {!done && <Button variant="hero" size="lg" className="rounded-full px-10" onClick={() => setRun(r => !r)}>{run ? <><Pause className="mr-2 h-4 w-4" />Pause</> : <><Play className="mr-2 h-4 w-4" />{left === total ? "Start" : "Resume"}</>}</Button>}
        {done && !guest && <Button variant="hero" size="lg" className="rounded-full px-10" onClick={onClose}>Back</Button>}
      </div>
    </div>
  );
}
