import { useMemo, useState } from "react";
import { tr } from "@/i18n";
import { RabbitFace } from "@/components/RabbitFace";
import { wornNow } from "@/components/Rabbit";
import { dkey } from "@/engine/game";
import type { GameApi } from "@/store/useGame";
import type { JournalApi } from "@/store/useJournal";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const firstSentence = (t: string) => { const s = t.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] || ""; return s.length > 140 ? s.slice(0, 137).trimEnd() + "..." : s; };
/** A short letter from the rabbit, written only from your own week: your starts and one line you wrote. Nothing is sent anywhere. */
export function WeeklyLetter({ j, game, name }: { j: JournalApi; game: GameApi; name: string }) {
  const [open, setOpen] = useState(false); const [copied, setCopied] = useState(false);
  const letter = useMemo(() => {
    const now = new Date(); const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - i); return d; });
    const per = days.map(d => ({ d, n: game.g.counts["s_" + dkey(d)] ?? 0 })); const total = per.reduce((a, b) => a + b.n, 0); const active = per.filter(p => p.n > 0).length;
    const best = [...per].sort((a, b) => b.n - a.n)[0];
    const since = Date.now() - 7 * 864e5; const entries = j.entries.filter(e => e.kind === "journal" && e.role === "user" && e.ts >= since && !/^Evening wrap-up: /.test(e.text));
    const win = entries.find(e => e.signals?.wins.length) ?? entries.slice().sort((a, b) => (b.mood ?? 0) - (a.mood ?? 0))[0];
    const first = name.split(" ")[0]; const lines: string[] = [tr("Dear {name},").replace("{name}", first), ""];
    if (total === 0) lines.push(tr("This was a quiet week, and that is okay. Nothing has withered and nothing is owed. When you are ready, one two-minute start is enough to begin again."));
    else {
      const lang = (() => { try { return { zh: "zh-CN", fa: "fa", id: "id", ne: "ne", si: "si" }[localStorage.getItem("lagomo.lang") || ""] || "en"; } catch { return "en"; } })();
      const dayName = (d: Date) => { try { return d.toLocaleDateString(lang, { weekday: "long" }); } catch { return DAYS[d.getDay()]; } };
      const head = total === 1 ? tr("This week you started once.") : active === 1 ? tr("This week you started {total} times, all on one day.") : tr("This week you started {total} times, on {active} days.");
      lines.push(`${head.replace("{total}", String(total)).replace("{active}", String(active))}${best && best.n > 1 ? " " + tr("{day} was your biggest day.").replace("{day}", dayName(best.d)) : ""} ${tr("Every one of those began as a thing you were putting off.")}`);
    }
    if (win) lines.push("", tr("You wrote: \"{text}\"").replace("{text}", firstSentence(win.text)), tr("I kept that one. It sounded like you."));
    if (game.g.streak.current >= 2) lines.push("", tr("You have shown up {n} days in a row. A rest day would not break it.").replace("{n}", String(game.g.streak.current)));
    lines.push("", tr("Next week, same plan: one tiny start, two minutes, someone in your corner."), "", tr("Your rabbit"));
    return lines.join("\n");
  }, [j.entries, game.g, name]);
  const copy = async () => { try { await navigator.clipboard.writeText(letter); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } };
  const sunday = new Date().getDay() === 0;
  return (
    <div className={`glass rounded-3xl p-5 ${sunday && !open ? "ring-2 ring-primary/40" : ""}`}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-3 text-start" aria-expanded={open}>
        <RabbitFace crop face={sunday ? "love" : "calm"} wear={wornNow()} size={44} />
        <span className="min-w-0 flex-1"><span className="block font-semibold">{tr("A letter from your rabbit")}</span><span className="block text-sm text-muted-foreground">{sunday ? tr("Your week is ready to read.") : tr("Your last seven days, in a few lines.")}</span></span>
      </button>
      {open && <div className="mt-4 space-y-3"><div className="whitespace-pre-wrap rounded-2xl bg-secondary/40 p-4 font-display text-lg leading-relaxed">{letter}</div><button onClick={copy} className="rounded-full border border-border px-4 py-1.5 text-sm hover:border-primary hover:text-primary">{copied ? tr("Copied") : tr("Copy to share")}</button></div>}
    </div>);
}
