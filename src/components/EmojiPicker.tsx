import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const SETS: { id: string; label: string; icon: string; list: string }[] = [
  { id: "smile", label: "Smileys", icon: "😊", list: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤧 😷 🤒 🤕 🤑 🤠 😈 👻 💀 🤖 👽 💩" },
  { id: "hands", label: "People", icon: "👋", list: "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💪 🦾 🧠 👀 👁️ 🫂 🙋 🙆 🙅 🤷 🤦 🙇 💁 🧘 🏃 🚶 💃 🕺 🧑‍💻 🧑‍🎓 🧑‍🍳 🧑‍🎨" },
  { id: "heart", label: "Hearts", icon: "❤️", list: "❤️ 🧡 💛 💚 🩵 💙 💜 🤎 🖤 🩶 🤍 💖 💗 💓 💞 💕 💘 💝 💟 ❣️ 💔 ❤️‍🔥 ❤️‍🩹 💋 ✨ 🌟 ⭐ 💫 🔥 💥 💯 🎉 🎊" },
  { id: "animal", label: "Animals", icon: "🐰", list: "🐰 🐇 🐶 🐱 🐭 🐹 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦉 🦋 🐌 🐞 🐢 🐙 🐬 🐳 🦄 🐝 🌸 🌷 🌻 🌼 🌱 🌿 🍀 🌳 🌵 🍄 🌈 ☀️ 🌙 ⭐ ☁️ 🌧️ ⛄ 🌊" },
  { id: "food", label: "Food", icon: "☕", list: "☕ 🍵 🧋 🥤 🍎 🍌 🍓 🍉 🍑 🥑 🥕 🍞 🥐 🧇 🥞 🍳 🍕 🍔 🍟 🌮 🍜 🍣 🍙 🍚 🥗 🍪 🍩 🍫 🍰 🧁 🍦 🍿 🥟" },
  { id: "work", label: "Study & work", icon: "📚", list: "📚 📖 📝 ✏️ 🖊️ 📒 📓 📎 📌 📅 🗓️ ⏰ ⏱️ ⏳ ⌛ 💻 🖥️ ⌨️ 🎧 📱 💡 🔍 📊 📈 ✅ ☑️ ✔️ ❌ ⭕ 🎯 🏆 🥇 🏅 🎓 🧩 🎨 🎵 🎶 🏃 🧹 🧺 🛏️ 🚿 🧘" },
  { id: "symbol", label: "Symbols", icon: "💬", list: "💬 💭 🗯️ ❓ ❗ ‼️ ⁉️ 💤 🆗 🆒 🆕 🔜 ➡️ ⬅️ ⬆️ ⬇️ 🔁 🔄 ➕ ➖ ✖️ 💲 ♻️ 🚀 ⚡ 🌀 🎈 🎁 🔔 🔕 📣 🙈 🙉 🙊" },
];
const RKEY = "lagomo.emoji.recent";
const recent = (): string[] => { try { return JSON.parse(localStorage.getItem(RKEY) || "[]"); } catch { return []; } };
export const QUICK_REACTIONS = ["❤️", "😂", "👍", "🔥", "🎉", "🐰"];

/** True when a message is only a few emojis (shown big, like other chat apps). */
export function onlyEmoji(s: string) {
  const t = s.trim(); if (!t || t.length > 24) return false;
  try { return /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s)+$/u.test(t) && (t.match(/\p{Extended_Pictographic}/gu) || []).length <= 3; } catch { return false; }
}

/** A small emoji panel. Picks are inserted where the cursor is. */
export function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false); const [tab, setTab] = useState(() => (recent().length ? "recent" : "smile")); const [rec, setRec] = useState<string[]>(recent);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const pick = (e: string) => { const r = [e, ...rec.filter(x => x !== e)].slice(0, 24); setRec(r); try { localStorage.setItem(RKEY, JSON.stringify(r)); } catch { /* ignore */ } onPick(e); };
  const list = tab === "recent" ? rec : (SETS.find(s => s.id === tab)?.list.split(" ") ?? []);
  return (
    <div ref={box} className="relative">
      <button type="button" aria-label="Add an emoji" aria-expanded={open} onClick={() => setOpen(o => !o)} className="rounded-full p-2.5 text-muted-foreground hover:text-foreground"><Smile className="h-5 w-5" /></button>
      {open && (
        <div role="dialog" aria-label="Emojis" className="absolute bottom-12 start-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border border-border bg-popover p-2 shadow-xl">
          <div className="mb-1 flex gap-0.5 overflow-x-auto border-b border-border pb-1" translate="no">
            {rec.length > 0 && <button type="button" aria-label="Recently used" onClick={() => setTab("recent")} className={`rounded-xl px-2 py-1 text-lg ${tab === "recent" ? "bg-primary/15" : ""}`}>🕘</button>}
            {SETS.map(s => <button key={s.id} type="button" aria-label={s.label} title={s.label} onClick={() => setTab(s.id)} className={`rounded-xl px-2 py-1 text-lg ${tab === s.id ? "bg-primary/15" : ""}`}>{s.icon}</button>)}
          </div>
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto" translate="no">
            {list.map((e, i) => <button key={e + i} type="button" onClick={() => pick(e)} className="rounded-lg p-1 text-xl leading-none hover:bg-foreground/[.07]" aria-label={e}>{e}</button>)}
          </div>
        </div>)}
    </div>);
}
