import type { Lang } from "./index";
// Sentences from the psychology lens that carry the person's own numbers. Written by AI, not yet checked by native speakers.
// Longer paragraphs are split into sentences by lookup() in index.ts, so each pattern here covers one sentence.
export type Ex = Partial<Record<Lang, (m: RegExpExecArray, T: (s: string) => string) => string>>;
const s = (n: string) => (+n === 1 ? "" : "s");
void s;

export const EXTRA14: [RegExp, Ex][] = [
  [/^Day (\d+) since your first start\.$/, { zh: m => `距离你第一次开始已过 ${m[1]} 天。`, fa: m => `روز ${m[1]} از اولین شروع تو.`, id: m => `Hari ke-${m[1]} sejak awalan pertamamu.`, ne: m => `तपाईंको पहिलो सुरुवातदेखि दिन ${m[1]}।` }],
  [/^You started on (\d+) of the last 28 days( and you are on a (\d+)-day run)?\.$/, {
    zh: m => `最近 28 天里你有 ${m[1]} 天开始了${m[3] ? `，目前连续 ${m[3]} 天` : ""}。`,
    fa: m => `در ۲۸ روز گذشته ${m[1]} روز شروع کردی${m[3] ? ` و ${m[3]} روز پشت‌سرهم ادامه داری` : ""}.`,
    id: m => `Kamu mulai pada ${m[1]} dari 28 hari terakhir${m[3] ? ` dan sedang berturut-turut ${m[3]} hari` : ""}.`,
    ne: m => `पछिल्ला २८ दिनमध्ये तपाईंले ${m[1]} दिन सुरु गर्नुभयो${m[3] ? ` र लगातार ${m[3]} दिनको क्रम चलिरहेको छ` : ""}।` }],
  [/^(\d+)% of starts fall in one 3-hour window \(from (\d+):00\), a steady cue\.$/, {
    zh: m => `${m[1]}% 的开始集中在一个 3 小时的时段（从 ${m[2]}:00 起），这是稳定的提示。`,
    fa: m => `${m[1]}٪ از شروع‌ها در یک بازهٔ ۳ ساعته (از ${m[2]}:00) قرار دارد، یک نشانهٔ پایدار.`,
    id: m => `${m[1]}% awalan jatuh dalam satu jendela 3 jam (mulai ${m[2]}:00), sebuah pemicu yang stabil.`,
    ne: m => `${m[1]}% सुरुवात एउटै ३ घण्टाको समयमा (${m[2]}:00 बाट) पर्छ, जुन स्थिर संकेत हो।` }],
  [/^Missing a day did not reset the curve, so (keep it light|you are past the median)\.$/, {
    zh: m => `漏掉一天并没有让曲线归零，所以${m[1] === "keep it light" ? "保持轻松就好" : "你已经超过了中位数"}。`,
    fa: m => `جاافتادن یک روز منحنی را صفر نکرد، پس ${m[1] === "keep it light" ? "سبک و آرام ادامه بده" : "تو از میانه گذشته‌ای"}.`,
    id: m => `Melewatkan satu hari tidak mengatur ulang kurva, jadi ${m[1] === "keep it light" ? "santai saja" : "kamu sudah melewati median"}.`,
    ne: m => `एक दिन छुट्दा रेखा सुरुबाट सुरु भएन, त्यसैले ${m[1] === "keep it light" ? "हल्का रूपमा जारी राख्नुहोस्" : "तपाईं औसत समय पार गरिसक्नुभयो"}।` }],
  [/^"When (.+), I will (.+)\."$/, {
    zh: (m, T) => `“当${T(m[1])}，我就${T(m[2])}。”`,
    fa: (m, T) => `«وقتی ${T(m[1])}، ${T(m[2])}.»`,
    id: (m, T) => `“Saat ${T(m[1])}, aku akan ${T(m[2])}.”`,
    ne: (m, T) => `“${T(m[1])}, ${T(m[2])}।”` }],
  [/^You started within 3 hours of (\d+):00 on (\d+) of (\d+) days \((\d+)% of all your starts\)\.$/, {
    zh: m => `在 ${m[1]}:00 之后的 3 小时内，你在 ${m[3]} 天里的 ${m[2]} 天开始了（占你全部开始的 ${m[4]}%）。`,
    fa: m => `در ۳ ساعت پس از ${m[1]}:00 در ${m[2]} روز از ${m[3]} روز شروع کردی (${m[4]}٪ از همهٔ شروع‌هایت).`,
    id: m => `Kamu mulai dalam 3 jam setelah ${m[1]}:00 pada ${m[2]} dari ${m[3]} hari (${m[4]}% dari semua awalanmu).`,
    ne: m => `${m[1]}:00 पछिका ३ घण्टाभित्र तपाईंले ${m[3]} मध्ये ${m[2]} दिन सुरु गर्नुभयो (तपाईंका सबै सुरुवातको ${m[4]}%)।` }],
  [/^You started (\d+) times together and (\d+) alone, on (\d+) and (\d+) different days\.$/, {
    zh: m => `你一起开始了 ${m[1]} 次，单独开始了 ${m[2]} 次，分别在 ${m[3]} 天和 ${m[4]} 天。`,
    fa: m => `${m[1]} بار با هم و ${m[2]} بار تنها شروع کردی، در ${m[3]} و ${m[4]} روز متفاوت.`,
    id: m => `Kamu mulai bersama ${m[1]} kali dan sendirian ${m[2]} kali, pada ${m[3]} dan ${m[4]} hari berbeda.`,
    ne: m => `तपाईंले ${m[1]} पटक सँगै र ${m[2]} पटक एक्लै सुरु गर्नुभयो, क्रमशः ${m[3]} र ${m[4]} फरक दिनमा।` }],
  [/^You said you finished (\d+)% of shared starts and (\d+)% of solo ones\.$/, {
    zh: m => `你说共同开始的完成了 ${m[1]}%，单独开始的完成了 ${m[2]}%。`,
    fa: m => `گفتی ${m[1]}٪ از شروع‌های مشترک و ${m[2]}٪ از شروع‌های تنها را تمام کردی.`,
    id: m => `Kamu bilang menyelesaikan ${m[1]}% awalan bersama dan ${m[2]}% awalan sendirian.`,
    ne: m => `तपाईंले सँगै सुरु गरेकामध्ये ${m[1]}% र एक्लै सुरु गरेकामध्ये ${m[2]}% पूरा गरेको भन्नुभयो।` }],
  [/^(\d+)% of your starts are on a Monday \(chance would be about 14%\)( and (\d+) fell in the first three days of a month)?\.$/, {
    zh: m => `你有 ${m[1]}% 的开始在周一（随机情况下约 14%）${m[3] ? `，另有 ${m[3]} 次在每月前三天` : ""}。`,
    fa: m => `${m[1]}٪ از شروع‌هایت دوشنبه است (شانس حدود ۱۴٪ است)${m[3] ? ` و ${m[3]} مورد در سه روز اول ماه بود` : ""}.`,
    id: m => `${m[1]}% awalanmu jatuh pada hari Senin (kebetulan sekitar 14%)${m[3] ? ` dan ${m[3]} jatuh pada tiga hari pertama bulan` : ""}.`,
    ne: m => `तपाईंका ${m[1]}% सुरुवात सोमबार पर्छन् (संयोगले करिब १४%)${m[3] ? ` र ${m[3]} वटा महिनाका पहिलो तीन दिनमा परे` : ""}।` }],
  [/^You've had (\d+) gaps? of 2\+ days and you came back after a median of (\d+) days?\.$/, {
    zh: m => `你有过 ${m[1]} 次 2 天以上的间断，平均隔 ${m[2]} 天就回来了。`,
    fa: m => `${m[1]} بار وقفهٔ ۲ روز یا بیشتر داشته‌ای و به‌طور میانه پس از ${m[2]} روز برگشتی.`,
    id: m => `Kamu pernah jeda 2+ hari sebanyak ${m[1]} kali dan kembali setelah median ${m[2]} hari.`,
    ne: m => `तपाईंले २+ दिनको ${m[1]} पटक अन्तर लिनुभयो र औसत ${m[2]} दिनपछि फर्कनुभयो।` }],
  [/^It's been (\d+) days now, and today's start is the whole job\.$/, {
    zh: m => `已经 ${m[1]} 天了，今天只要开始就是全部任务。`,
    fa: m => `الان ${m[1]} روز شده و شروع امروز تمام کار است.`,
    id: m => `Sudah ${m[1]} hari, dan memulai hari ini adalah seluruh tugasnya.`,
    ne: m => `अहिले ${m[1]} दिन भयो, र आजको सुरुवात नै पूरा काम हो।` }],
  [/^After good sleep you started on (\d+)% of days, after poor sleep (\d+)%\.$/, {
    zh: m => `睡得好之后你有 ${m[1]}% 的日子开始了，睡得差之后是 ${m[2]}%。`,
    fa: m => `بعد از خواب خوب در ${m[1]}٪ از روزها شروع کردی و بعد از خواب بد ${m[2]}٪.`,
    id: m => `Setelah tidur nyenyak kamu mulai pada ${m[1]}% hari, setelah tidur buruk ${m[2]}%.`,
    ne: m => `राम्रो निद्रापछि तपाईंले ${m[1]}% दिन सुरु गर्नुभयो, कमजोर निद्रापछि ${m[2]}%।` }],
  [/^When it felt heavy you started on (\d+)% of days, when it felt light (\d+)%\.$/, {
    zh: m => `觉得沉重时你有 ${m[1]}% 的日子开始了，觉得轻松时是 ${m[2]}%。`,
    fa: m => `وقتی سنگین بود در ${m[1]}٪ از روزها شروع کردی و وقتی سبک بود ${m[2]}٪.`,
    id: m => `Saat terasa berat kamu mulai pada ${m[1]}% hari, saat terasa ringan ${m[2]}%.`,
    ne: m => `भारी लाग्दा तपाईंले ${m[1]}% दिन सुरु गर्नुभयो, हल्का लाग्दा ${m[2]}%।` }],
  [/^You started on (\d+) days in the last 7\.$/, {
    zh: m => `最近 7 天里你有 ${m[1]} 天开始了。`, fa: m => `در ۷ روز گذشته ${m[1]} روز شروع کردی.`, id: m => `Kamu mulai pada ${m[1]} hari dalam 7 hari terakhir.`, ne: m => `पछिल्ला ७ दिनमा तपाईंले ${m[1]} दिन सुरु गर्नुभयो।` }],
  [/^(\d+) of 3 start days in the last 7\.$/, {
    zh: m => `最近 7 天里 3 个开始日完成了 ${m[1]} 个。`, fa: m => `${m[1]} از ۳ روز شروع در ۷ روز گذشته.`, id: m => `${m[1]} dari 3 hari mulai dalam 7 hari terakhir.`, ne: m => `पछिल्ला ७ दिनमा ३ सुरु दिनमध्ये ${m[1]}।` }],
  [/^(\d+) to go\.$/, { zh: m => `还差 ${m[1]} 天。`, fa: m => `${m[1]} تا مانده.`, id: m => `${m[1]} lagi.`, ne: m => `${m[1]} बाँकी।` }],
  [/^(\d+)% of your dated starts happened in the last 2 days and (\d+)% a week or more ahead\.$/, {
    zh: m => `你在有截止日期的任务上，${m[1]}% 的开始发生在最后 2 天，${m[2]}% 提前了一周或更久。`,
    fa: m => `${m[1]}٪ از شروع‌هایت روی کارهای تاریخ‌دار در ۲ روز آخر بود و ${m[2]}٪ یک هفته یا بیشتر زودتر.`,
    id: m => `${m[1]}% awalanmu pada tugas bertanggal terjadi dalam 2 hari terakhir dan ${m[2]}% seminggu atau lebih lebih awal.`,
    ne: m => `म्याद भएका कामका ${m[1]}% सुरुवात अन्तिम २ दिनमा भए र ${m[2]}% एक हप्ता वा बढी अगाडि।` }],
  [/^(\d+) more starts? to draw it\.$/, { zh: m => `再开始 ${m[1]} 次就能画出来。`, fa: m => `${m[1]} شروع دیگر تا بتوانم آن را بکشم.`, id: m => `${m[1]} awalan lagi untuk menggambarnya.`, ne: m => `यसलाई बनाउन ${m[1]} सुरुवात थप चाहिन्छ।` }],
  [/^(\d+) more starts? to compare Mondays with other days\.$/, { zh: m => `再开始 ${m[1]} 次就能比较周一和其他日子。`, fa: m => `${m[1]} شروع دیگر تا دوشنبه‌ها با روزهای دیگر مقایسه شود.`, id: m => `${m[1]} awalan lagi untuk membandingkan Senin dengan hari lain.`, ne: m => `सोमबारलाई अन्य दिनसँग तुलना गर्न ${m[1]} सुरुवात थप चाहिन्छ।` }],
  [/^(\d+) more starts? on tasks with a due date\.$/, { zh: m => `再有 ${m[1]} 次在有截止日期的任务上开始。`, fa: m => `${m[1]} شروع دیگر روی کارهای دارای تاریخ.`, id: m => `${m[1]} awalan lagi pada tugas yang punya tenggat.`, ne: m => `म्याद भएका कामहरूमा ${m[1]} सुरुवात थप चाहिन्छ।` }],
];

/** Plain sentences (no numbers) that the lens builds from parts. [English, zh, fa, id, ne] */
export const ROWS15: [string, string, string, string, string][] = [
  ["No steady window yet, which is normal early on.", "还没有稳定的时段，这在早期很正常。", "هنوز بازهٔ ثابتی نیست و این در ابتدا طبیعی است.", "Belum ada jendela yang stabil, itu wajar di awal.", "अहिलेसम्म स्थिर समय छैन, सुरुमा यो सामान्य हो।"],
  ["People in the habit study took a median of 66 days (18 to 254).", "习惯研究中的人们平均用了 66 天（18 到 254 天）。", "در پژوهش عادت، میانهٔ زمان ۶۶ روز بود (از ۱۸ تا ۲۵۴).", "Orang dalam studi kebiasaan membutuhkan median 66 hari (18 sampai 254).", "बानी अध्ययनमा मानिसहरूलाई औसत ६६ दिन लाग्यो (१८ देखि २५४)।"],
  ["Start a few times and I will check how often it fires.", "多开始几次，我会检查它多久触发一次。", "چند بار شروع کن تا ببینم چند وقت یک‌بار فعال می‌شود.", "Mulailah beberapa kali dan aku akan memeriksa seberapa sering ia berhasil.", "केही पटक सुरु गर्नुहोस्, म यो कति पटक काम गर्छ जाँच गर्छु।"],
  ["You respond to new beginnings.", "你对新的开始有反应。", "تو به آغازهای تازه واکنش نشان می‌دهی.", "Kamu responsif terhadap awal yang baru.", "तपाईं नयाँ सुरुवातमा राम्रो प्रतिक्रिया दिनुहुन्छ।"],
  ["Mondays are not your thing, so don't wait for them.", "周一不是你的强项，所以别等它。", "دوشنبه‌ها مال تو نیستند، پس منتظرشان نمان.", "Hari Senin bukan gayamu, jadi jangan menunggunya.", "सोमबार तपाईंको लागि होइन, त्यसैले पर्खनुपर्दैन।"],
  ["No clear fresh-start pull in your data.", "你的数据里没有明显的“新开始”拉力。", "در داده‌های تو کشش روشنی به شروع تازه دیده نمی‌شود.", "Tidak ada tarikan awal baru yang jelas di datamu.", "तपाईंको डेटामा नयाँ सुरुवातको स्पष्ट तान देखिँदैन।"],
  ["You haven't had a gap of 2 or more days yet.", "你还没有出现过 2 天以上的间断。", "هنوز وقفهٔ ۲ روز یا بیشتر نداشته‌ای.", "Kamu belum pernah jeda 2 hari atau lebih.", "तपाईंले अहिलेसम्म २ वा बढी दिनको अन्तर लिनुभएको छैन।"],
  ["When you do, a restart counts the same as any start.", "到时候，重新开始和任何开始一样算数。", "وقتی پیش آمد، شروع دوباره مثل هر شروعی حساب می‌شود.", "Saat itu terjadi, memulai ulang dihitung sama seperti awalan lain.", "त्यस्तो भयो भने फेरि सुरु गर्नु पनि अन्य सुरुवात जत्तिकै गनिन्छ।"],
  ["That is a skill.", "这是一种能力。", "این یک مهارت است.", "Itu sebuah keterampilan.", "यो एउटा सीप हो।"],
  ["Goal reached, anything more is a bonus.", "目标达成，再多就是额外奖励。", "به هدف رسیدی، هر چیز بیشتر جایزه است.", "Target tercapai, lebihnya adalah bonus.", "लक्ष्य पूरा भयो, थप जे गरे पनि बोनस हो।"],
  ["One more and the week is done.", "再来一次，这周就完成了。", "یکی دیگر و هفته تمام است.", "Satu lagi dan minggu ini selesai.", "अझ एक पटक भए हप्ता पूरा।"],
  ["work on one thing for two minutes", "花两分钟做一件事", "دو دقیقه روی یک کار کار می‌کنم", "mengerjakan satu hal selama dua menit", "दुई मिनेट एउटा काम गर्छु"],
];
