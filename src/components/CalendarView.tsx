import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, Link2, Paperclip, Plus, RefreshCw, Trash2, Unplug } from "lucide-react";
import { BringAlongEditor, BringAlongToggle, ResourceList, draftOf, draftToBlock, emptyDraft, type Draft } from "@/components/BringAlong";
import { alertState } from "@/lib/push";
import { deleteBlockFile } from "@/lib/blockfiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalItem, dayKey, dotsFor, fmtClock, itemsForDay, monthGrid, parseDay } from "@/engine/calendar";
import { fmtTime, hasResources } from "@/engine/plan";
import type { PlanApi } from "@/store/usePlan";
import type { CalendarApi } from "@/store/useCalendar";
import type { GameApi } from "@/store/useGame";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]; const DURS = [15, 25, 45, 60, 90];
export function CalendarView({ plan, cal, game }: { plan: PlanApi; cal: CalendarApi; game: GameApi }) {
  const today = dayKey(new Date()); const [sel, setSel] = useState(today); const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [draft, setDraft] = useState<Draft>(emptyDraft); const [openId, setOpenId] = useState<string | null>(null); const [ed, setEd] = useState<Draft | null>(null); const [alertsOn, setAlertsOn] = useState<boolean | undefined>(undefined); useEffect(() => { alertState().then(s => setAlertsOn(s === "on")); }, []);
  const [title, setTitle] = useState(""); const [start, setStart] = useState(10 * 60); const [dur, setDur] = useState(25); const [open, setOpen] = useState(false); const [link, setLink] = useState(""); const [copied, setCopied] = useState(false);
  const grid = useMemo(() => monthGrid(month.y, month.m), [month]); const dots = useMemo(() => dotsFor(grid, plan.blocks, cal.events), [grid, plan.blocks, cal.events]);
  const items = useMemo(() => itemsForDay(sel, plan.blocks, cal.events), [sel, plan.blocks, cal.events]);
  const nav = (n: number) => setMonth(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const add = () => { if (!title.trim()) return; plan.addBlock({ title: title.trim(), day: sel, start, dur, ...draftToBlock(draft) }); setTitle(""); setDraft(emptyDraft()); };
  const feedUrl = cal.token ? `${location.origin}/api/cal-feed?t=${cal.token}` : "";
  const subscribe = cal.token ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent("webcal://" + location.host + "/api/cal-feed?t=" + cal.token)}` : "";
  const copy = async () => { await navigator.clipboard?.writeText(feedUrl).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const title_ = parseDay(sel).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between"><button aria-label="Previous month" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => nav(-1)}><ChevronLeft /></button>
          <div className="text-center"><div className="text-xl font-semibold">{new Date(month.y, month.m, 1).toLocaleDateString([], { month: "long", year: "numeric" })}</div><button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => { const d = new Date(); setMonth({ y: d.getFullYear(), m: d.getMonth() }); setSel(today); }}>Jump to today</button></div>
          <button aria-label="Next month" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => nav(1)}><ChevronRight /></button></div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{WEEK.map(w => <div key={w}>{w}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">{grid.map(d => { const k = dayKey(d), inM = d.getMonth() === month.m, dd = dots[k]; return (
          <button key={k} onClick={() => setSel(k)} aria-label={d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })} aria-pressed={sel === k} className={`flex h-12 flex-col items-center justify-center rounded-2xl text-sm transition ${sel === k ? "bg-primary text-primary-foreground" : k === today ? "border border-primary text-foreground" : "hover:bg-foreground/5"} ${inM ? "" : "opacity-35"}`}>
            {d.getDate()}<span className="mt-0.5 flex h-1.5 gap-0.5">{dd?.mine > 0 && <i className={`h-1.5 w-1.5 rounded-full ${sel === k ? "bg-primary-foreground" : "bg-primary"}`} />}{dd?.ext > 0 && <i className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--f-grain))" }} />}</span></button>); })}</div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-primary" />Planned in Lagomo</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: "hsl(var(--f-grain))" }} />From your calendar</span></div>
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-3 text-lg font-semibold">{title_}{sel === today && <span className="ml-2 text-sm font-normal text-muted-foreground">Today</span>}</div>
        {items.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nothing on this day yet. Add one small block below.</p> : (
          <div className="space-y-2">{items.map((i: CalItem) => (
            <div key={i.kind + i.id}><div className={`flex items-center gap-3 rounded-2xl border p-3 ${i.kind === "ext" ? "border-border bg-foreground/[.03]" : "border-primary/40 bg-primary/5"} ${i.done ? "opacity-60" : ""}`}>
              <div className="w-20 shrink-0 text-xs text-muted-foreground">{i.allDay ? "All day" : `${fmtClock(i.start)}`}</div>
              <div className="min-w-0 flex-1"><div className={`truncate font-medium ${i.done ? "line-through" : ""}`}>{i.title}</div><div className="text-xs text-muted-foreground">{i.kind === "ext" ? "From your calendar" : "Planned in Lagomo"}{!i.allDay && ` · until ${fmtClock(i.end)}`}</div></div>
              {i.kind === "block" && i.blockId && <div className="flex gap-1">
                <button aria-label="Bring along" className="relative rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => { const b = plan.blocks.find(x => x.id === i.blockId); if (!b) return; setOpenId(openId === b.id ? null : b.id); setEd(null); }}><Paperclip className="h-4 w-4" />{(() => { const b = plan.blocks.find(x => x.id === i.blockId); return b && (hasResources(b) || b.remind != null) ? <i className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" /> : null; })()}</button>
                <button aria-label={i.done ? "Mark not done" : "Mark done"} className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => { plan.patchBlock(i.blockId!, { done: !i.done }); if (!i.done) game.earn("block"); }}><Check className="h-4 w-4" /></button>
                <button aria-label="Delete block" className="rounded-full p-2 text-muted-foreground hover:text-foreground" onClick={() => plan.removeBlock(i.blockId!)}><Trash2 className="h-4 w-4" /></button></div>}
            </div>
            {i.kind === "block" && i.blockId && openId === i.blockId && (() => { const b = plan.blocks.find(x => x.id === i.blockId); if (!b) return null; return (
              <div className="mt-2 space-y-2 px-1">
                {b.remind != null && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" />{b.remind === 0 ? "Reminder at the start" : b.remind === 60 ? "Reminder 1 hour before" : `Reminder ${b.remind} min before`}</p>}
                {ed ? <><BringAlongEditor d={ed} set={setEd} alertsOn={alertsOn} /><div className="flex gap-2"><Button size="sm" variant="hero" className="rounded-full" onClick={() => { plan.patchBlock(b.id, { note: undefined, links: undefined, files: undefined, remind: undefined, ...draftToBlock(ed), notified: false }); setEd(null); }}>Save</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={() => { const keep = new Set((b.files ?? []).map(f => f.id)); ed.files.filter(f => !keep.has(f.id)).forEach(f => deleteBlockFile(f.id)); setEd(null); }}>Cancel</Button></div></>
                  : <><ResourceList b={b} /><Button size="sm" variant="outline" className="rounded-full" onClick={() => setEd(draftOf(b))}><Paperclip className="mr-1 h-3.5 w-3.5" />{hasResources(b) || b.remind != null ? "Edit" : "Bring along"}</Button></>}
              </div>); })()}
            </div>))}</div>)}
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="flex gap-2"><Input className="h-10 rounded-2xl bg-secondary/60" placeholder={`Plan something for ${sel === today ? "today" : "this day"}`} value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} /><Button className="rounded-2xl" variant="hero" disabled={!title.trim()} onClick={add}><Plus className="h-4 w-4" /></Button></div>
          <div className="flex flex-wrap items-center gap-2"><select aria-label="Start time" value={start} onChange={e => setStart(Number(e.target.value))} className="h-9 rounded-2xl border border-border bg-secondary/60 px-3 text-sm">{Array.from({ length: 34 }, (_, i) => 360 + i * 30).map(m => <option key={m} value={m}>{fmtTime(m)}</option>)}</select>
            {DURS.map(d => <button key={d} onClick={() => setDur(d)} className={`rounded-full border px-3 py-1 text-xs ${dur === d ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{d} min</button>)}</div>
          <BringAlongToggle d={draft} set={setDraft} />
        </div>
      </div>

      <div className="glass rounded-3xl p-4">
        <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}><span className="flex items-center gap-2 text-lg font-semibold"><Link2 className="h-5 w-5" />Connect Google Calendar</span><span className="text-xs text-muted-foreground">{cal.url ? "Connected" : cal.feed ? "Sending" : "Not connected"}{open ? " ▲" : " ▼"}</span></button>
        {open && (
          <div className="mt-4 space-y-5 text-sm">
            <div className="space-y-2">
              <div className="font-semibold">1. See your Google Calendar here</div>
              <p className="text-muted-foreground">In Google Calendar, open Settings, pick your calendar, scroll to "Integrate calendar", and copy the <b>Secret address in iCal format</b>. Paste it here. It stays on this device, and events are read-only.</p>
              <a className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline" href="https://calendar.google.com/calendar/u/0/r/settings" target="_blank" rel="noreferrer">Open Google Calendar settings <ExternalLink className="h-3.5 w-3.5" /></a>
              {cal.url ? (
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{cal.events.length} events loaded{cal.fetched ? ` · updated ${new Date(cal.fetched).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</span>
                  <Button size="sm" variant="outline" className="rounded-full" disabled={cal.busy} onClick={() => cal.refresh()}><RefreshCw className={`mr-1 h-3.5 w-3.5 ${cal.busy ? "animate-spin" : ""}`} />Refresh</Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={cal.disconnect}><Unplug className="mr-1 h-3.5 w-3.5" />Disconnect</Button></div>
              ) : (
                <div className="flex gap-2"><Input className="h-10 rounded-2xl bg-secondary/60" placeholder="Paste the secret iCal address" value={link} onChange={e => setLink(e.target.value)} /><Button variant="hero" className="rounded-full" disabled={!link.trim() || cal.busy} onClick={async () => { await cal.connect(link); setLink(""); }}>{cal.busy ? "Loading..." : "Connect"}</Button></div>)}
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <div className="font-semibold">2. Show your Lagomo plans in Google Calendar</div>
              <p className="text-muted-foreground">Turn this on to get a private calendar link. Add it to Google Calendar once, and your planned blocks appear there. Google refreshes added calendars every few hours, so changes are not instant.</p>
              {!cal.feed ? <Button variant="hero" className="rounded-full" onClick={cal.enableFeed}>Turn on my calendar link</Button> : (
                <div className="space-y-2"><div className="truncate rounded-2xl bg-foreground/[.05] px-3 py-2 text-xs text-muted-foreground">{feedUrl}</div>
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="hero" className="rounded-full" asChild><a href={subscribe} target="_blank" rel="noreferrer">Add to Google Calendar</a></Button><Button size="sm" variant="outline" className="rounded-full" onClick={copy}>{copied ? <><Check className="mr-1 h-3.5 w-3.5" />Copied</> : <><Copy className="mr-1 h-3.5 w-3.5" />Copy link</>}</Button><Button size="sm" variant="ghost" className="rounded-full" onClick={cal.disableFeed}>Turn off</Button></div>
                  <p className="text-xs text-muted-foreground">Anyone with this link can see your block titles, so keep it private. Turning it off stops the link working.</p></div>)}
            </div>
            {cal.error && <p role="alert" className="text-destructive">{cal.error}</p>}
            <p className="text-xs text-muted-foreground">Outlook and iCloud calendar links work for step 1 too. Two-way live sync with Google needs a Google sign-in, which we have not set up yet.</p>
          </div>)}
      </div>
    </div>
  );
}
