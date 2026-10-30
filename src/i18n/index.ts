import { ROWS1 } from "./entries1";
import { ROWS2 } from "./entries2";
import { ROWS3 } from "./entries3";
import { ROWS4 } from "./entries4";

export type Lang = "en" | "zh" | "fa" | "id";
export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "zh", label: "简体中文", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
  { code: "id", label: "Bahasa Indonesia", dir: "ltr" },
];
const KEY = "lagomo.lang";
type Tr = (s: string) => string;
type Pattern = [RegExp, Record<Exclude<Lang, "en">, (m: RegExpExecArray, T: Tr) => string>];
const IDX = { zh: 1, fa: 2, id: 3 } as const;

const entries: Record<Exclude<Lang, "en">, Record<string, string>> = { zh: {}, fa: {}, id: {} };
for (const row of [...ROWS1, ...ROWS2, ...ROWS3, ...ROWS4]) for (const l of ["zh", "fa", "id"] as const) entries[l][row[0]] = row[IDX[l]];

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const GREET: Record<string, Record<Exclude<Lang, "en">, string>> = {
  "Good morning": { zh: "早上好", fa: "صبح بخیر", id: "Selamat pagi" },
  Hi: { zh: "你好", fa: "سلام", id: "Hai" },
  "Good evening": { zh: "晚上好", fa: "عصر بخیر", id: "Selamat malam" },
};
const STATE: Record<string, Record<Exclude<Lang, "en">, string>> = {
  working: { zh: "正在专注", fa: "در حال کار", id: "sedang bekerja" },
  finished: { zh: "已完成", fa: "تمام کرد", id: "selesai" },
  "stepped away": { zh: "暂时离开", fa: "کمی دور شد", id: "menjauh sebentar" },
  here: { zh: "在这里", fa: "اینجاست", id: "ada di sini" },
  "not here yet": { zh: "还没来", fa: "هنوز نیامده", id: "belum datang" },
};
// Sentences with names, numbers or times in them.
const PATTERNS: Pattern[] = [
  [/^(Good morning|Hi|Good evening), (.+)\.$/, { zh: m => `${GREET[m[1]].zh}，${m[2]}。`, fa: m => `${GREET[m[1]].fa}، ${m[2]}\u200F.`, id: m => `${GREET[m[1]].id}, ${m[2]}.` }],
  [/^You planned to hop in (.+)\.$/, { zh: (m, T) => `你计划在${T(cap(m[1]))}开始。`, fa: (m, T) => `برنامه داشتی ${T(cap(m[1]))} شروع کنی.`, id: (m, T) => `Kamu berencana mulai ${lower(T(cap(m[1])))}.` }],
  [/^Planned: (.+)\. Easy\.$/, { zh: (m, T) => `已计划：${T(cap(m[1]))}。很轻松。`, fa: (m, T) => `برنامه‌ریزی شد: ${T(cap(m[1]))}. آسان.`, id: (m, T) => `Direncanakan: ${lower(T(cap(m[1])))}. Mudah.` }],
  [/^(.+) is working too$/, { zh: m => `${m[1]} 也在专注`, fa: m => `${m[1]} هم دارد کار می‌کند`, id: m => `${m[1]} juga sedang bekerja` }],
  [/^(.+) finished$/, { zh: m => `${m[1]} 完成了`, fa: m => `${m[1]} تمام کرد`, id: m => `${m[1]} selesai` }],
  [/^(.+) stepped away$/, { zh: m => `${m[1]} 暂时离开了`, fa: m => `${m[1]} کمی دور شد`, id: m => `${m[1]} menjauh sebentar` }],
  [/^(.+) is here$/, { zh: m => `${m[1]} 在这里`, fa: m => `${m[1]} اینجاست`, id: m => `${m[1]} ada di sini` }],
  [/^Waiting for (.+)\.\.\.$/, { zh: m => `正在等 ${m[1]}…`, fa: m => `منتظر ${m[1]}…`, id: m => `Menunggu ${m[1]}…` }],
  [/^(.+) (working|finished|stepped away|here|not here yet)$/, { zh: m => `${m[1]} ${STATE[m[2]].zh}`, fa: m => `${m[1]} ${STATE[m[2]].fa}`, id: m => `${m[1]} ${STATE[m[2]].id}` }],
  [/^Active (\d+) min ago$/, { zh: m => `${m[1]} 分钟前在线`, fa: m => `${m[1]} دقیقه پیش فعال بود`, id: m => `Aktif ${m[1]} menit lalu` }],
  [/^Active (\d+) h ago$/, { zh: m => `${m[1]} 小时前在线`, fa: m => `${m[1]} ساعت پیش فعال بود`, id: m => `Aktif ${m[1]} jam lalu` }],
  [/^Active (\d+) days ago$/, { zh: m => `${m[1]} 天前在线`, fa: m => `${m[1]} روز پیش فعال بود`, id: m => `Aktif ${m[1]} hari lalu` }],
  [/^(\d+) min ago$/, { zh: m => `${m[1]} 分钟前`, fa: m => `${m[1]} دقیقه پیش`, id: m => `${m[1]} menit lalu` }],
  [/^(\d+) h ago$/, { zh: m => `${m[1]} 小时前`, fa: m => `${m[1]} ساعت پیش`, id: m => `${m[1]} jam lalu` }],
  [/^· together (\d+)\/7 days$/, { zh: m => `· 本周一起 ${m[1]}/7 天`, fa: m => `· با هم ${m[1]} از ۷ روز`, id: m => `· bersama ${m[1]}/7 hari` }],
  [/^You and (.+) started together (\d+) days? this week$/, { zh: m => `本周你和 ${m[1]} 一起开始了 ${m[2]} 天`, fa: m => `این هفته تو و ${m[1]} ${m[2]} روز با هم شروع کردید`, id: m => `Minggu ini kamu dan ${m[1]} mulai bersama ${m[2]} hari` }],
  [/^Getting started · (\d) of 3$/, { zh: m => `新手上路 · ${m[1]}/3`, fa: m => `شروع کار · ${m[1]} از ۳`, id: m => `Memulai · ${m[1]} dari 3` }],
  [/^(\d+) more minutes$/, { zh: m => `再来 ${m[1]} 分钟`, fa: m => `${m[1]} دقیقه دیگر`, id: m => `${m[1]} menit lagi` }],
  [/^(\d+) people started today$/, { zh: m => `今天已有 ${m[1]} 人开始`, fa: m => `امروز ${m[1]} نفر شروع کرده‌اند`, id: m => `${m[1]} orang sudah mulai hari ini` }],
  [/^@(.+) invited you\. Sign up and you will be friends\.$/, { zh: m => `@${m[1]} 邀请了你。注册后你们就是好友。`, fa: m => `@${m[1]} تو را دعوت کرده. ثبت‌نام کن تا دوست شوید.`, id: m => `@${m[1]} mengundangmu. Daftar dan kalian akan berteman.` }],
  [/^(\d+) new messages$/, { zh: m => `${m[1]} 条新消息`, fa: m => `${m[1]} پیام تازه`, id: m => `${m[1]} pesan baru` }],
  [/^(.+) hopped in$/, { zh: m => `${m[1]} 开始了`, fa: m => `${m[1]} شروع کرد`, id: m => `${m[1]} sudah mulai` }],
  [/^(.+) cheered you on$/, { zh: m => `${m[1]} 为你加油`, fa: m => `${m[1]} تشویقت کرد`, id: m => `${m[1]} menyemangatimu` }],
  [/^Focusing with (.+)$/, { zh: m => `和 ${m[1]} 一起专注`, fa: m => `تمرکز با ${m[1]}`, id: m => `Fokus bersama ${m[1]}` }],
  [/^Chat with (.+)$/, { zh: m => `与 ${m[1]} 聊天`, fa: m => `گفتگو با ${m[1]}`, id: m => `Obrolan dengan ${m[1]}` }],
  [/^Report (.+)$/, { zh: m => `举报 ${m[1]}`, fa: m => `گزارش ${m[1]}`, id: m => `Laporkan ${m[1]}` }],
  [/^Remove (.+)$/, { zh: m => `移除 ${m[1]}`, fa: m => `حذف ${m[1]}`, id: m => `Hapus ${m[1]}` }],
  [/^Message (.+)\.\.\.$/, { zh: m => `给 ${m[1]} 发消息…`, fa: m => `پیام به ${m[1]}…`, id: m => `Pesan untuk ${m[1]}…` }],
];

let lang: Lang = "en";
export const getLang = () => lang;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
function lookup(s: string): string | null {
  if (lang === "en") return null;
  const k = norm(s); if (!k) return null;
  const hit = entries[lang][k]; if (hit) return hit;
  const L = lang;
  for (const [re, fns] of PATTERNS) { const m = re.exec(k); if (m) return fns[L](m, x => lookup(x) ?? x); }
  return null;
}
/** Translate a string made in code (toasts, notifications). Unknown text stays as is. */
export const tr = (s: string): string => lookup(s) ?? s;

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "SELECT", "OPTION"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const textOrig = new WeakMap<Node, string>(); const textLast = new WeakMap<Node, string>();
const attrOrig = new WeakMap<Element, Record<string, string>>(); const attrLast = new WeakMap<Element, Record<string, string>>();
const SKIP_ATTR = new Set(["SCRIPT", "STYLE"]);
const skippedAttr = (el: Element) => SKIP_ATTR.has(el.tagName) || !!el.closest('[translate="no"]');
const skipped = (n: Node) => { const el = n.nodeType === 1 ? (n as Element) : n.parentElement; return !el || SKIP.has(el.tagName) || !!el.closest('[translate="no"]'); };

function applyText(n: Text) {
  if (skipped(n)) return;
  const cur = n.nodeValue ?? ""; if (textLast.get(n) === cur) return;
  textOrig.set(n, cur);
  const t = lookup(cur);
  if (t) { const out = (cur.match(/^\s*/)![0]) + t + (cur.match(/\s*$/)![0]); textLast.set(n, out); n.nodeValue = out; } else textLast.delete(n);
}
function applyAttrs(el: Element) {
  if (skippedAttr(el)) return;
  const orig = attrOrig.get(el) ?? {}; const last = attrLast.get(el) ?? {};
  for (const a of ATTRS) {
    const cur = el.getAttribute(a); if (cur == null || last[a] === cur) continue;
    orig[a] = cur; const t = lookup(cur);
    if (t) { last[a] = t; el.setAttribute(a, t); } else delete last[a];
  }
  attrOrig.set(el, orig); attrLast.set(el, last);
}
function walk(root: Node) {
  if (root.nodeType === 3) { applyText(root as Text); return; }
  if (root.nodeType !== 1) return;
  if (skippedAttr(root as Element)) return;
  applyAttrs(root as Element);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = tw.nextNode();
  while (n) { if (n.nodeType === 3) applyText(n as Text); else applyAttrs(n as Element); n = tw.nextNode(); }
}
/** After a language change: put every text back to its English original, then translate again. */
function refreshAll() {
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n = tw.nextNode();
  while (n) {
    if (n.nodeType === 3) {
      const t = n as Text; const o = textOrig.get(t);
      if (o !== undefined && textLast.get(t) === t.nodeValue) { t.nodeValue = o; textLast.delete(t); }
      applyText(t);
    } else {
      const el = n as Element; const o = attrOrig.get(el); const l = attrLast.get(el);
      if (o && l) for (const a of Object.keys(l)) if (el.getAttribute(a) === l[a]) { el.setAttribute(a, o[a]); delete l[a]; }
      applyAttrs(el);
    }
    n = tw.nextNode();
  }
}
function setHtml() { const meta = LANGS.find(l => l.code === lang)!; document.documentElement.lang = lang; document.documentElement.dir = meta.dir; }
function detect(): Lang {
  try { const s = localStorage.getItem(KEY) as Lang | null; if (s && LANGS.some(l => l.code === s)) return s; } catch { /* ignore */ }
  const n = (navigator.language || "en").toLowerCase();
  return n.startsWith("zh") ? "zh" : n.startsWith("fa") ? "fa" : n.startsWith("id") || n.startsWith("in") ? "id" : "en";
}
export function setLang(l: Lang) {
  lang = l; try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  setHtml(); refreshAll(); window.dispatchEvent(new Event("lagomo:lang"));
}
export function initI18n() {
  lang = detect(); setHtml();
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === "childList") m.addedNodes.forEach(walk);
      else if (m.type === "characterData") applyText(m.target as Text);
      else if (m.type === "attributes") applyAttrs(m.target as Element);
    }
  });
  const start = () => { obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS }); walk(document.body); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
}
