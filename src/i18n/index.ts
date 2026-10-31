import { ROWS1 } from "./entries1";
import { ROWS2 } from "./entries2";
import { ROWS3 } from "./entries3";
import { ROWS4 } from "./entries4";
import { ROWS5 } from "./entries5";
import { ROWS6 } from "./entries6";
import { ROWS7 } from "./entries7";
import { ROWS8 } from "./entries8";
import { ROWS9 } from "./entries9";
import { ROWS10 } from "./entries10";
import { ROWS11 } from "./entries11";
import { ROWS12 } from "./entries12";
import * as SI from "./lang_si";
import * as DZ from "./lang_dz";
import * as NE from "./lang_ne";

export type Lang = "en" | "zh" | "fa" | "id" | "si" | "dz" | "ne";
type Old = "zh" | "fa" | "id"; type New = "si" | "dz" | "ne";
export const LANGS: { code: Lang; label: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "zh", label: "简体中文", dir: "ltr" },
  { code: "fa", label: "فارسی", dir: "rtl" },
  { code: "id", label: "Bahasa Indonesia", dir: "ltr" },
  { code: "ne", label: "नेपाली", dir: "ltr" },
  { code: "si", label: "සිංහල", dir: "ltr" },
  { code: "dz", label: "རྫོང་ཁ", dir: "ltr" },
];
const KEY = "lagomo.lang";
type Tr = (s: string) => string;
type Pattern = [RegExp, Record<Old, (m: RegExpExecArray, T: Tr) => string>];
const IDX = { zh: 1, fa: 2, id: 3 } as const;

const entries: Record<Exclude<Lang, "en">, Record<string, string>> = { zh: {}, fa: {}, id: {}, si: SI.DICT, dz: DZ.DICT, ne: NE.DICT };
const PATS: Record<New, Record<string, string>> = { si: SI.PAT, dz: DZ.PAT, ne: NE.PAT };
const PID: (string | null)[] = ["greet","planned","plannedShort","buddyWorking","buddyFinished","buddyAway","buddyHere","waitingFor","roomState","activeMin","activeH","activeD","minAgo","hAgo","togetherDays","startedTogether","gettingStarted","moreMinutes","peopleToday","invitedYou","newMessages","hoppedIn","cheered","focusingWith","chatWith","report","remove","messageTo","checkinAvg","fromWriting","firstStep","dAgo",null,"openProfile","joined","plant","planFor","driveFalls","prevPart","nextPart","style","nowFriends","requestSent","sparksEarned","focusedFor","streakDays"];
for (const row of [...ROWS1, ...ROWS2, ...ROWS3, ...ROWS4, ...ROWS5, ...ROWS6, ...ROWS7, ...ROWS8, ...ROWS9, ...ROWS10, ...ROWS11, ...ROWS12]) for (const l of ["zh", "fa", "id"] as const) entries[l][row[0]] = row[IDX[l]];

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const GREET: Record<string, Record<Old, string>> = {
  "Good morning": { zh: "早上好", fa: "صبح بخیر", id: "Selamat pagi" },
  Hi: { zh: "你好", fa: "سلام", id: "Hai" },
  "Good evening": { zh: "晚上好", fa: "عصر بخیر", id: "Selamat malam" },
};
const STATE: Record<string, Record<Old, string>> = {
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
  [/^Your last (\d+) check-ins averaged ([\d.]+), and you are (trending up|trending down|steady)(\.| ?\. Low and bumpy right now, so be gentle with yourself and keep tasks small\.)$/, {
    zh: m => `你最近 ${m[1]} 次检查的平均值是 ${m[2]}，${m[3] === "trending up" ? "而且呈上升趋势" : m[3] === "trending down" ? "而且呈下降趋势" : "而且很平稳"}${m[4] === "." ? "。" : "。目前偏低且起伏不定，请对自己温柔一点，把任务保持得小一些。"}`,
    fa: m => `میانگین ${m[1]} بررسی آخرت ${m[2]} بود، ${m[3] === "trending up" ? "و روند رو به بالا داری" : m[3] === "trending down" ? "و روند رو به پایین داری" : "و ثابت هستی"}${m[4] === "." ? "." : ". الان پایین و ناپایداری، پس با خودت مهربان باش و کارها را کوچک نگه دار."}`,
    id: m => `Rata-rata ${m[1]} cek-in terakhirmu adalah ${m[2]}, ${m[3] === "trending up" ? "dan kamu sedang naik" : m[3] === "trending down" ? "dan kamu sedang turun" : "dan kamu stabil"}${m[4] === "." ? "." : ". Sedang rendah dan naik-turun, jadi bersikaplah lembut pada dirimu dan buat tugas tetap kecil."}` }],
  [/^From your writing: this has felt (high|low|middling) lately\.$/, {
    zh: m => `来自你的文字：最近感觉${({ high: "偏高", low: "偏低", middling: "一般" } as Record<string, string>)[m[1]]}。`,
    fa: m => `از نوشته‌ات: این اخیراً ${({ high: "بالا", low: "پایین", middling: "متوسط" } as Record<string, string>)[m[1]]} بوده است.`,
    id: m => `Dari tulisanmu: belakangan ini terasa ${({ high: "tinggi", low: "rendah", middling: "sedang" } as Record<string, string>)[m[1]]}.` }],
  [/^First tiny step: (.+)$/, { zh: (m, T) => `第一个小步骤：${T(m[1])}`, fa: (m, T) => `اولین قدم کوچک: ${T(m[1])}`, id: (m, T) => `Langkah kecil pertama: ${T(m[1])}` }],
  [/^(\d+) d ago$/, { zh: m => `${m[1]} 天前`, fa: m => `${m[1]} روز پیش`, id: m => `${m[1]} hari lalu` }],
  [/^(\d+) h ago · From the Lagomo team$|^(\d+) min ago · From the Lagomo team$/, { zh: m => m[1] ? `${m[1]} 小时前 · 来自 Lagomo 团队` : `${m[2]} 分钟前 · 来自 Lagomo 团队`, fa: m => m[1] ? `${m[1]} ساعت پیش · از طرف تیم لاگومو` : `${m[2]} دقیقه پیش · از طرف تیم لاگومو`, id: m => m[1] ? `${m[1]} jam lalu · Dari tim Lagomo` : `${m[2]} menit lalu · Dari tim Lagomo` }],
  [/^Open (.+)'s profile$/, { zh: m => `打开 ${m[1]} 的资料`, fa: m => `باز کردن پروفایل ${m[1]}`, id: m => `Buka profil ${m[1]}` }],
  [/^@(.+) · Joined (.+)$/, { zh: m => `@${m[1]} · ${m[2]} 加入`, fa: m => `@${m[1]} · عضویت از ${m[2]}`, id: m => `@${m[1]} · Bergabung ${m[2]}` }],
  [/^Your plant, level (\d+)$/, { zh: m => `你的植物，第 ${m[1]} 级`, fa: m => `گیاه تو، سطح ${m[1]}`, id: m => `Tanamanmu, level ${m[1]}` }],
  [/^Plan something for (today|this day)$/, { zh: m => m[1] === "today" ? "为今天计划点什么" : "为这一天计划点什么", fa: m => m[1] === "today" ? "برای امروز چیزی برنامه‌ریزی کن" : "برای این روز چیزی برنامه‌ریزی کن", id: m => m[1] === "today" ? "Rencanakan sesuatu untuk hari ini" : "Rencanakan sesuatu untuk hari yang dipilih" }],
  [/^Drive falls below the ready line around minute (\d+)\. Plan a reset before then\.$/, { zh: m => `动力大约在第 ${m[1]} 分钟降到准备线以下。在那之前先安排一次重置。`, fa: m => `انگیزه حدود دقیقه‌ی ${m[1]} زیر خط آمادگی می‌افتد. پیش از آن یک بازنشانی برنامه‌ریزی کن.`, id: m => `Dorongan turun di bawah garis siap sekitar menit ke-${m[1]}. Rencanakan reset sebelum itu.` }],
  [/^Previous (Friend|Colour|Eyes|Smile|Extra|Cheeks)$/, { zh: (m, T) => `上一个${T(m[1])}`, fa: (m, T) => `${T(m[1])} قبلی`, id: (m, T) => `${T(m[1])} sebelumnya` }],
  [/^Next (Friend|Colour|Eyes|Smile|Extra|Cheeks)$/, { zh: (m, T) => `下一个${T(m[1])}`, fa: (m, T) => `${T(m[1])} بعدی`, id: (m, T) => `${T(m[1])} berikutnya` }],
  [/^Style (\d+)$/, { zh: m => `样式 ${m[1]}`, fa: m => `سبک ${m[1]}`, id: m => `Gaya ${m[1]}` }],
  [/^You and @(.+) are now friends\.$/, { zh: m => `你和 @${m[1]} 现在是好友了。`, fa: m => `تو و @${m[1]} اکنون دوست هستید.`, id: m => `Kamu dan @${m[1]} kini berteman.` }],
  [/^Request sent to @(.+)\.$/, { zh: m => `已向 @${m[1]} 发送请求。`, fa: m => `درخواست برای @${m[1]} فرستاده شد.`, id: m => `Permintaan terkirim ke @${m[1]}.` }],
  [/^\+(\d+) sparks$/, { zh: m => `+${m[1]} 火花`, fa: m => `+${m[1]} جرقه`, id: m => `+${m[1]} percikan` }],
  [/^(\d+) min focused$/, { zh: m => `专注 ${m[1]} 分钟`, fa: m => `${m[1]} دقیقه تمرکز`, id: m => `Fokus ${m[1]} menit` }],
  [/^(\d+) days? in a row$/, { zh: m => `连续 ${m[1]} 天`, fa: m => `${m[1]} روز پشت سر هم`, id: m => `${m[1]} hari berturut-turut` }],
];


/** Sentences with numbers or names in them, for zh, fa, id and ne. Written by AI, not yet checked by native speakers. */
type Ex = Partial<Record<Lang, (m: RegExpExecArray) => string>>;
const MOODS: Record<string, string[]> = { Low: ["低落","کم‌حال","Rendah","कमजोर"], Down: ["沮丧","گرفته","Murung","उदास"], Okay: ["还行","معمولی","Biasa","ठीकै"], Good: ["不错","خوب","Baik","राम्रो"], Great: ["很棒","عالی","Hebat","धेरै राम्रो"] };
const EXTRA: [RegExp, Ex][] = [
  [/^Started (\d+) h ago$/, { zh: m => `${m[1]} 小时前开始`, fa: m => `${m[1]} ساعت پیش شروع کرد`, id: m => `Mulai ${m[1]} jam lalu`, ne: m => `${m[1]} घण्टा अघि सुरु गर्नुभयो` }],
  [/^Started (\d+) min ago$/, { zh: m => `${m[1]} 分钟前开始`, fa: m => `${m[1]} دقیقه پیش شروع کرد`, id: m => `Mulai ${m[1]} menit lalu`, ne: m => `${m[1]} मिनेट अघि सुरु गर्नुभयो` }],
  [/^(\d+) days? this week\. Every one counts\.$/, { zh: m => `本周 ${m[1]} 天。每一天都算数。`, fa: m => `${m[1]} روز در این هفته. هر کدام حساب می‌شود.`, id: m => `${m[1]} hari minggu ini. Setiap hari berarti.`, ne: m => `यो हप्ता ${m[1]} दिन। हरेक दिन गनिन्छ।` }],
  [/^(\d+) of (\d+) tiny steps$/, { zh: m => `${m[2]} 个小步骤中的 ${m[1]} 个`, fa: m => `${m[1]} از ${m[2]} قدم کوچک`, id: m => `${m[1]} dari ${m[2]} langkah kecil`, ne: m => `${m[2]} मध्ये ${m[1]} सानो कदम` }],
  [/^(\d+) sparks to the next stage$/, { zh: m => `距离下一阶段还差 ${m[1]} 火花`, fa: m => `${m[1]} جرقه تا مرحله بعد`, id: m => `${m[1]} percikan lagi ke tahap berikutnya`, ne: m => `अर्को चरणसम्म ${m[1]} स्पार्क` }],
  [/^(\d+) days? showing up$/, { zh: m => `已出现 ${m[1]} 天`, fa: m => `${m[1]} روز حضور`, id: m => `Hadir ${m[1]} hari`, ne: m => `${m[1]} दिन उपस्थित` }],
  [/^(\d+) days? started this week$/, { zh: m => `本周开始了 ${m[1]} 天`, fa: m => `${m[1]} روز شروع در این هفته`, id: m => `${m[1]} hari mulai minggu ini`, ne: m => `यो हप्ता ${m[1]} दिन सुरु गरियो` }],
  [/^(\d{1,2}(?::\d{2})?\s?(?:am|pm)?) · (\d+) min$/, { zh: m => `${m[1]} · ${m[2]} 分钟`, fa: m => `${m[1]} · ${m[2]} دقیقه`, id: m => `${m[1]} · ${m[2]} mnt`, ne: m => `${m[1]} · ${m[2]} मिनेट` }],
  [/^· (\d+) things? today$/, { zh: m => `· 今天有 ${m[1]} 件事`, fa: m => `· ${m[1]} کار برای امروز`, id: m => `· ${m[1]} hal hari ini`, ne: m => `· आज ${m[1]} वटा कुरा` }],
  [/^· (Low|Down|Okay|Good|Great)$/, { zh: m => "· " + MOODS[m[1]][0], fa: m => "· " + MOODS[m[1]][1], id: m => "· " + MOODS[m[1]][2], ne: m => "· " + MOODS[m[1]][3] }],
  [/^Evening wrap-up: (Low|Down|Okay|Good|Great)$/, { zh: m => "晚间总结：" + MOODS[m[1]][0], fa: m => "جمع‌بندی شب: " + MOODS[m[1]][1], id: m => "Rangkuman malam: " + MOODS[m[1]][2], ne: m => "साँझको सारांश: " + MOODS[m[1]][3] }],
  [/^(\d+) min$/, { zh: m => `${m[1]} 分钟`, fa: m => `${m[1]} دقیقه`, id: m => `${m[1]} mnt`, ne: m => `${m[1]} मिनेट` }],
  [/^(.+) has not turned on private messaging yet\. They need to sign in once\.$/, { zh: m => `${m[1]} 还没有开启私信。对方需要登录一次。`, fa: m => `${m[1]} هنوز پیام خصوصی را روشن نکرده است. باید یک بار وارد شود.`, id: m => `${m[1]} belum mengaktifkan pesan pribadi. Mereka perlu masuk sekali.`, ne: m => `${m[1]} ले अहिलेसम्म निजी सन्देश खोलेका छैनन्। उनीहरूले एक पटक साइन इन गर्नुपर्छ।` }],
  [/^Open chat with (.+)$/, { zh: m => `与 ${m[1]} 打开聊天`, fa: m => `باز کردن گفتگو با ${m[1]}`, id: m => `Buka obrolan dengan ${m[1]}`, ne: m => `${m[1]} सँग च्याट खोल्नुहोस्` }],
];

let lang: Lang = "en";
export const getLang = () => lang;
const norm = (s: string) => s.replace(/\s+/g, " ").trim();
function lookup(s: string): string | null {
  if (lang === "en") return null;
  const k = norm(s); if (!k) return null;
  const hit = entries[lang][k]; if (hit) return hit;
  const L = lang;
  for (const [re, fns] of EXTRA) { const f = fns[L]; if (!f) continue; const m = re.exec(k); if (m) return f(m); }
  for (let i = 0; i < PATTERNS.length; i++) {
    const [re, fns] = PATTERNS[i]; const m = re.exec(k); if (!m) continue;
    if (L === "si" || L === "dz" || L === "ne") {
      const id = PID[i]; const tpl = id ? PATS[L][id] : undefined; if (!tpl) continue;
      const T2 = (x: string) => lookup(x) ?? lookup(cap(x)) ?? x;
      return tpl.replace(/([$#])(\d)/g, (_s, kind: string, n: string) => { const v = m[+n] ?? ""; return kind === "#" ? T2(v) : v; });
    }
    return fns[L](m, x => lookup(x) ?? x);
  }
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
  return n.startsWith("zh") ? "zh" : n.startsWith("fa") ? "fa" : n.startsWith("id") || n.startsWith("in") ? "id" : n.startsWith("ne") ? "ne" : n.startsWith("si") ? "si" : n.startsWith("dz") ? "dz" : "en";
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
