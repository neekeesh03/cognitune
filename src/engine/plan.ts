export interface Step { id: string; text: string; done: boolean; doneAt?: number }
export interface Task { id: string; title: string; steps: Step[]; createdAt: number; doneAt?: number }
export interface Block { id: string; title: string; day: string; start: number; dur: number; done?: boolean; taskId?: string }
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
  const p = new URLSearchParams({ action: "TEMPLATE", text: b.title, dates: `${stamp(b.day, b.start)}/${stamp(b.day, b.start + b.dur)}`, details: "Planned with Lagomo" });
  return "https://calendar.google.com/calendar/render?" + p.toString();
}
export function icsFor(blocks: Block[]) {
  const esc = (s: string) => s.replace(/[,;\\]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lagomo//EN", ...blocks.flatMap(b => ["BEGIN:VEVENT", `UID:${b.id}@lagomo`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART:${stamp(b.day, b.start)}`, `DTEND:${stamp(b.day, b.start + b.dur)}`, `SUMMARY:${esc(b.title)}`, "END:VEVENT"]), "END:VCALENDAR"];
  return lines.join("\r\n");
}
export function download(name: string, text: string, type = "text/plain") {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
