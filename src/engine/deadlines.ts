// Finds dates in pasted text such as a syllabus or a list of assignments. Plain rules, no AI, nothing leaves the device.
export interface Found { title: string; due: string }
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const pad = (n: number) => String(n).padStart(2, "0");
const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const valid = (y: number, m: number, d: number) => { const t = new Date(y, m, d); return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d; };
/** Pick the year: a date that already passed this year is taken as next year, unless a year was written. */
function resolve(m: number, d: number, y: number | undefined, now: Date): string | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = y ?? now.getFullYear(); if (!valid(year, m, d)) return null;
  if (y === undefined && new Date(year, m, d) < today) { if ((+today - +new Date(year, m, d)) / 864e5 <= 45) return null; year += 1; if (!valid(year, m, d)) return null; }
  if (y !== undefined && new Date(year, m, d) < today) return null;
  return key(new Date(year, m, d));
}
const PATTERNS: { re: RegExp; get: (m: RegExpExecArray) => [number, number, number | undefined] }[] = [
  { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, get: m => [+m[2] - 1, +m[3], +m[1]] },
  { re: new RegExp(`\\b${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"), get: m => [MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2], m[3] ? +m[3] : undefined] },
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\.?(?:,?\\s+(\\d{4}))?\\b`, "i"), get: m => [MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), +m[1], m[3] ? +m[3] : undefined] },
];
export function findDeadlines(text: string, now = new Date()): Found[] {
  const out: Found[] = []; const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim(); if (!line || line.length > 300) continue;
    for (const { re, get } of PATTERNS) {
      const m = re.exec(line); if (!m) continue;
      const [mo, d, y] = get(m); if (mo < 0) continue; const due = resolve(mo, d, y, now); if (!due) continue;
      let title = (line.slice(0, m.index) + " " + line.slice(m.index + m[0].length)).replace(/^[\s\-–—•*·:;,.()\d]+(?=[A-Za-z])/, "").replace(/\b(due|deadline|by|on|until|submit(?:ted)?(?: by)?)\b\s*[:\-–—]?\s*$/i, "").replace(/[\s\-–—:;,.(]+$/g, "").replace(/\s+/g, " ").trim();
      if (title.length < 2) title = "Deadline";
      if (title.length > 80) title = title.slice(0, 77).trimEnd() + "...";
      const k = title.toLowerCase() + "|" + due; if (seen.has(k)) break; seen.add(k); out.push({ title, due }); break;
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due)).slice(0, 30);
}
