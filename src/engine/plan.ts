export interface Step { id: string; text: string; done: boolean; doneAt?: number }
export interface Task { id: string; title: string; steps: Step[]; createdAt: number; doneAt?: number }
export interface BlockFile { id: string; name: string; type: string; size: number }
/** A planned block. note, links and files are the things you will need ("bring along"); remind is minutes before the start (0 = at the start). All of it stays on this device. */
export interface Block { id: string; title: string; day: string; start: number; dur: number; done?: boolean; taskId?: string; note?: string; links?: string[]; files?: BlockFile[]; remind?: number; notified?: boolean; series?: string; sharedId?: string }
export type Repeat = "none" | "daily" | "weekdays" | "weekly";
/** A repeating plan. Real blocks are made from it a few weeks ahead, so the calendar, reminders and timer work the same as for any block. */
export interface Series { id: string; title: string; start: number; dur: number; rule: Exclude<Repeat, "none">; anchor: string; skip: string[]; note?: string; links?: string[]; files?: BlockFile[]; remind?: number }
export const repeatLabel = (r: Repeat) => ({ none: "Does not repeat", daily: "Every day", weekdays: "Every weekday", weekly: "Every week" }[r]);
const parseDayKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** The days (as YYYY-MM-DD) from today for the next `ahead` days on which the series happens. */
export function seriesDays(s: Series, todayKey: string, ahead = 21): string[] {
  const out: string[] = []; const a = parseDayKey(s.anchor); const t = parseDayKey(todayKey);
  for (let i = 0; i <= ahead; i++) { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i, 12); const k = keyOf(d); if (d < a) continue; const wd = d.getDay();
    if (s.rule === "weekdays" && (wd === 0 || wd === 6)) continue; if (s.rule === "weekly" && wd !== a.getDay()) continue; if (s.skip.includes(k)) continue; out.push(k); }
  return out;
}
export const blockStartMs = (b: Block) => { const [y, m, d] = b.day.split("-").map(Number); return new Date(y, m - 1, d, 0, b.start, 0, 0).getTime(); };
export const hasResources = (b: Block) => !!(b.note || b.links?.length || b.files?.length);
export const safeUrl = (s: string): string | null => { let t = s.trim(); if (!t) return null; if (!/^https?:\/\//i.test(t)) t = "https://" + t; try { const u = new URL(t); return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? u.toString() : null; } catch { return null; } };
export const uid = () => crypto.randomUUID();

const TEMPLATES: { re: RegExp; steps: string[] }[] = [
  { re: /write|essay|report|paper|section|draft|blog|thesis/, steps: ["Open the document", "Write one messy sentence", "List 3 bullet points of what to cover", "Write for 10 minutes without editing", "Save it and stand up"] },
  { re: /study|learn|read|revise|exam|course|lecture/, steps: ["Put the book or notes in front of you", "Read just the first page or slide", "Write down 3 things you remember", "Do 10 minutes, then a short break", "Write one question you still have"] },
  { re: /email|reply|message|call|text/, steps: ["Open the message", "Write just the first line", "Write the one thing you need to say", "Read once and send"] },
  { re: /clean|tidy|laundry|dish|room|organi[sz]e/, steps: ["Put on a song", "Pick up 5 things", "Do one surface only", "Do 10 minutes, then decide", "Take out the rubbish or put one load on"] },
  { re: /exercise|workout|run|gym|walk|yoga/, steps: ["Put your shoes or kit on", "Do 2 minutes of movement", "Do a 10-minute version", "Stretch for a minute"] },
  { re: /code|build|fix|bug|design|app|project/, steps: ["Open the project", "Write down the very next step", "Do the smallest possible change", "Run it or look at it", "Note where you stopped"] },
];
const GENERIC = ["Open or set out what you need", "Do the first 2 minutes only", "Write down the next step", "Do one 10-minute chunk", "Note where you stopped"];
export function suggestSteps(title: string): Step[] {
  const t = title.toLowerCase();
  const m = TEMPLATES.find(x => x.re.test(t));
  return (m ? m.steps : GENERIC).map(text => ({ id: uid(), text, done: false }));
}

export const fmtTime = (min: number) => { const h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? "pm" : "am"; return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${ap}`; };
const stamp = (day: string, min: number) => day.replace(/-/g, "") + "T" + String(Math.floor(min / 60)).padStart(2, "0") + String(min % 60).padStart(2, "0") + "00";

export function googleLink(b: Block) {
  const p = new URLSearchParams({ action: "TEMPLATE", text: b.title, dates: `${stamp(b.day, b.start)}/${stamp(b.day, b.start + b.dur)}`, details: ["Planned with Lagomo", b.note, ...(b.links ?? [])].filter(Boolean).join("\n") });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
export function icsFor(blocks: Block[]) {
  const esc = (s: string) => s.replace(/[,;\\]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lagomo//EN", ...blocks.flatMap(b => ["BEGIN:VEVENT", `UID:${b.id}@lagomo`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART:${stamp(b.day, b.start)}`, `DTEND:${stamp(b.day, b.start + b.dur)}`, `SUMMARY:${esc(b.title)}`, ...(b.note || b.links?.length ? [`DESCRIPTION:${esc([b.note, ...(b.links ?? [])].filter(Boolean).join("\n"))}`] : []), "END:VEVENT"]), "END:VCALENDAR"];
  return lines.join("\r\n");
}
export function download(name: string, text: string, type = "text/plain") {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
