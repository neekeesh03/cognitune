import type { Block } from "./plan";
export interface ExtEvent { id: string; title: string; s: number; e: number; wall: boolean; allDay: boolean }
export interface CalItem { id: string; title: string; start: Date; end: Date; allDay: boolean; kind: "block" | "ext"; done?: boolean; blockId?: string }

const wallToLocal = (ms: number) => { const d = new Date(ms); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()); };
export function extDates(e: ExtEvent): { start: Date; end: Date } {
  const start = e.wall ? wallToLocal(e.s) : new Date(e.s); let end = e.wall ? wallToLocal(e.e) : new Date(e.e);
  if (e.allDay) end = new Date(end.getTime() - 1); return { start, end };
}
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (k: string) => new Date(k + "T12:00");

export function itemsForDay(day: string, blocks: Block[], events: ExtEvent[]): CalItem[] {
  const d0 = new Date(day + "T00:00"), d1 = new Date(day + "T23:59:59.999");
  const mine: CalItem[] = blocks.filter(b => b.day === day).map(b => ({ id: b.id, blockId: b.id, title: b.title, kind: "block", done: b.done, allDay: false, start: new Date(d0.getTime() + b.start * 60000), end: new Date(d0.getTime() + (b.start + b.dur) * 60000) }));
  const ext: CalItem[] = events.map(e => ({ e, ...extDates(e) })).filter(x => x.start <= d1 && x.end >= d0).map(x => ({ id: x.e.id, title: x.e.title, kind: "ext" as const, allDay: x.e.allDay, start: x.start, end: x.end }));
  return [...ext.filter(i => i.allDay), ...[...mine, ...ext.filter(i => !i.allDay)].sort((a, b) => a.start.getTime() - b.start.getTime())];
}
/** 6 rows x 7 columns, weeks start on Monday. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1); const lead = (first.getDay() + 6) % 7; const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
export function dotsFor(days: Date[], blocks: Block[], events: ExtEvent[]) {
  const out: Record<string, { mine: number; ext: number }> = {}; days.forEach(d => { const k = dayKey(d); out[k] = { mine: blocks.filter(b => b.day === k).length, ext: 0 }; });
  events.forEach(e => { const { start, end } = extDates(e); for (let t = new Date(start.getFullYear(), start.getMonth(), start.getDate()); t <= end && t.getTime() < start.getTime() + 14 * 864e5; t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)) { const k = dayKey(t); if (out[k]) out[k].ext++; } });
  return out;
}
export const fmtClock = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
