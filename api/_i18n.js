// Words for push notifications, in the language each person chose. Message text itself is never included.
import { EXTRA } from "./_i18n_extra.js";
export const LANGS = ["en", "zh", "fa", "id", "si", "dz", "ne"];
const D = {
  hopped: { en: n => `${n} hopped in`, zh: n => `${n} 开始了`, fa: n => `${n} شروع کرد`, id: n => `${n} sudah mulai` },
  hopBody: { en: () => "Your turn? One small start is enough.", zh: () => "轮到你了？一个小小的开始就够了。", fa: () => "نوبت توست؟ یک شروع کوچک کافی است.", id: () => "Giliranmu? Satu langkah kecil sudah cukup." },
  cheered: { en: n => `${n} cheered you on`, zh: n => `${n} 为你加油`, fa: n => `${n} تشویقت کرد`, id: n => `${n} menyemangatimu` },
  cheerBody: { en: () => "Nice hop.", zh: () => "开始得不错。", fa: () => "شروع خوبی بود.", id: () => "Awal yang bagus." },
  frTitle: { en: () => "New friend request", zh: () => "新的好友请求", fa: () => "درخواست دوستی تازه", id: () => "Permintaan pertemanan baru" },
  frBody: { en: n => `${n} wants to be friends`, zh: n => `${n} 想和你成为朋友`, fa: n => `${n} می‌خواهد دوست شما باشد`, id: n => `${n} ingin berteman denganmu` },
  frOkTitle: { en: n => `${n} is now your friend`, zh: n => `${n} 现在是你的好友了`, fa: n => `${n} اکنون دوست توست`, id: n => `${n} kini temanmu` },
  frOkBody: { en: () => "Say hi, or hop in together.", zh: () => "打个招呼，或一起开始吧。", fa: () => "سلام کن یا با هم شروع کنید.", id: () => "Ucapkan halo, atau mulai bersama." },
  msgFile: { en: () => "Sent you a file", zh: () => "给你发了一个文件", fa: () => "یک فایل برایت فرستاد", id: () => "Mengirimimu berkas" },
  msgSession: { en: () => "Invited you to focus together", zh: () => "邀请你一起专注", fa: () => "تو را به تمرکز با هم دعوت کرد", id: () => "Mengundangmu fokus bersama" },
  msgReact: { en: () => "Reacted to your message", zh: () => "回应了你的消息", fa: () => "به پیامت واکنش نشان داد", id: () => "Menanggapi pesanmu" },
  postReact: { en: n => `${n} reacted to your post`, zh: n => `${n} 回应了你的帖子`, fa: n => `${n} به پستت واکنش نشان داد`, id: n => `${n} menanggapi postinganmu` },
  msgPlan: { en: () => "Shared a plan with you", zh: () => "和你分享了一个计划", fa: () => "یک برنامه با تو به اشتراک گذاشت", id: () => "Membagikan rencana denganmu" },
  msgPinky: { en: () => "Sent you a Pinky", zh: () => "给你发了一个小约定", fa: () => "یک قول کوچک برایت فرستاد", id: () => "Mengirimimu Pinky" },
  msgText: { en: () => "New message", zh: () => "新消息", fa: () => "پیام تازه", id: () => "Pesan baru" },
  friendHop: { en: n => `${n} already hopped in. Your turn? Two minutes is enough.`, zh: n => `${n} 已经开始了。轮到你了？两分钟就够。`, fa: n => `${n} شروع کرده است. نوبت توست؟ دو دقیقه کافی است.`, id: n => `${n} sudah mulai. Giliranmu? Dua menit sudah cukup.` },
  blockSoon: { en: () => "Your planned block is starting. Everything you attached is ready.", zh: () => "你计划的时间段要开始了。你附上的资料都准备好了。", fa: () => "بازه‌ی برنامه‌ریزی‌شده‌ات در شرف شروع است. هر چه پیوست کردی آماده است.", id: () => "Blok yang kamu rencanakan akan dimulai. Semua lampiranmu sudah siap." },
  daily0: { en: () => "One small start? Two minutes is enough.", zh: () => "来一个小小的开始？两分钟就够。", fa: () => "یک شروع کوچک؟ دو دقیقه کافی است.", id: () => "Satu langkah kecil? Dua menit sudah cukup." },
  daily1: { en: () => "Pick the smallest thing and hop in.", zh: () => "挑最小的一件事，开始吧。", fa: () => "کوچک‌ترین کار را انتخاب کن و شروع کن.", id: () => "Pilih hal terkecil dan mulai." },
  daily2: { en: () => "Just open it. That counts as a start.", zh: () => "先打开它。这就算开始。", fa: () => "فقط بازش کن. همین هم شروع حساب می‌شود.", id: () => "Cukup buka saja. Itu sudah dihitung sebagai awal." },
};
export const T = (lang, key, name = "") => { const x = EXTRA[lang] && EXTRA[lang][key]; if (x) return x.split("{n}").join(name); return (D[key][LANGS.includes(lang) ? lang : "en"] || D[key].en)(name); };
