import { useMemo, useState } from "react";
import { Bell, Check, ChevronLeft, ChevronRight, Paperclip, Repeat, Users } from "lucide-react";
import { dayKey, fmtClock, itemsForDay } from "@/engine/calendar";
import { hasResources } from "@/engine/plan";
import type { PlanApi } from "@/store/usePlan";
import type { CalendarApi } from "@/store/useCalendar";

const monday = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1 - ((d.getDay() + 6) % 7), 12); return x; };

/** Seven days at a glance. Tap a day to open it in the Day planner. */
export function WeekView({ plan, cal, onOpenDay }: { plan: PlanApi; cal: CalendarApi; onOpenDay: (day: string) => void }) {
  const [offset, setOffset] = useState(0); const today = dayKey(new Date());
  const days = useMemo(() => { const m = monday(new Date()); return Array.from({ length: 7 }, (_, i) => new Date(m.getFullYear(), m.getMonth(), m.getDate() + offset * 7 + i, 12)); }, [offset]);
  const range = `${days[0].toLocaleDateString([], { month: "short", day: "numeric" })} to ${days[6].toLocaleDateString([], { month: "short", day: "numeric" })}`;
  const all = days.map(d => itemsForDay(dayKey(d), plan.blocks, cal.events));
  const total = all.reduce((n, a) => n + a.filter(i => i.kind === "block").length, 0), withFriends = all.reduce((n, a) => n + a.filter(i => i.kind === "block" && plan.blocks.find(b => b.id === i.blockId)?.sharedId).length, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button aria-label="Previous week" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => setOffset(o => o - 1)}><ChevronLeft /></button>
        <div className="text-center"><div className="text-xl font-semibold" translate="no">{range}</div>
          <div className="text-xs text-muted-foreground">{total === 0 ? "Nothing planned yet" : `${total} planned${withFriends ? `, ${withFriends} with friends` : ""}`}{offset !== 0 && <> · <button className="underline-offset-2 hover:underline" onClick={() => setOffset(0)}>This week</button></>}</div></div>
        <button aria-label="Next week" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => setOffset(o => o + 1)}><ChevronRight /></button>
      </div>
      <div className="space-y-2">
        {days.map((d, n) => { const k = dayKey(d); const items = all[n]; const isToday = k === today; const past = k < today;
          return (
            <div key={k} className={`glass rounded-3xl p-3 ${isToday ? "ring-2 ring-primary/50" : ""} ${past ? "opacity-70" : ""}`}>
              <button className="flex w-full items-center justify-between text-start" onClick={() => { onOpenDay(k); }} aria-label={d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}>
                <span className="font-semibold">{d.toLocaleDateString([], { weekday: "short" })} <span className="text-muted-foreground" translate="no">{d.getDate()}</span>{isToday && <span className="ms-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Today</span>}</span>
                <span className="text-xs text-muted-foreground">{items.length === 0 ? "Free" : `${items.length} ${items.length === 1 ? "thing" : "things"}`}</span>
              </button>
              {items.length > 0 && <div className="mt-2 space-y-1.5">{items.map(i => { const b = i.kind === "block" ? plan.blocks.find(x => x.id === i.blockId) : undefined; return (
                <button key={i.kind + i.id} onClick={() => onOpenDay(k)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm ${i.kind === "ext" ? "bg-foreground/[.04]" : "bg-primary/10"} ${i.done ? "opacity-60" : ""}`}>
                  <span className="w-16 shrink-0 text-xs text-muted-foreground" translate="no">{i.allDay ? "All day" : fmtClock(i.start)}</span>
                  <span className={`min-w-0 flex-1 truncate ${i.done ? "line-through" : ""}`} translate="no" dir="auto">{i.title}</span>
                  <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                    {b?.sharedId && <Users className="h-3.5 w-3.5" aria-label="Planned with a friend" />}
                    {b?.series && <Repeat className="h-3.5 w-3.5" aria-label="Repeats" />}
                    {b && hasResources(b) && <Paperclip className="h-3.5 w-3.5" aria-label="Resources attached" />}
                    {b?.remind != null && !b.done && <Bell className="h-3.5 w-3.5" aria-label="Reminder on" />}
                    {i.done && <Check className="h-4 w-4 text-primary" />}
                  </span>
                </button>); })}</div>}
            </div>); })}
      </div>
    </div>);
}
