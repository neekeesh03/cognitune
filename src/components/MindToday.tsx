import { Brain } from "lucide-react";
import { useMind } from "@/store/useMind";
import { pickMind } from "@/engine/mind";
import { loadLog } from "@/lib/startlog";
import { openMind } from "@/components/MindTab";

/** One suggestion for this moment from the Mind tools (time of day, last start, what was done today). */
export function MindToday({ go }: { go: (t: string) => void }) {
  const { mind } = useMind(); const pick = pickMind(mind, loadLog().starts.map(s => s.ts));
  const woop = mind.woop[mind.woop.length - 1]; const today = woop && new Date(woop.ts).toDateString() === new Date().toDateString() ? woop : null;
  if (!pick && !today) return null;
  return (
    <div className="space-y-2">
    {today && <div className="glass rounded-3xl px-4 py-3 text-sm"><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">Your plan for today</div><div className="mt-0.5"><b>{today.wish}</b></div><div className="text-muted-foreground">{today.plan}</div></div>}
    {pick && <button onClick={() => { openMind(pick.view); go("mind"); }} className="glass flex w-full items-start gap-3 rounded-3xl p-4 text-start transition hover:shadow-lg" aria-label={`${pick.title}. ${pick.cta}`}>
      <span className="rounded-2xl bg-primary/10 p-2 text-primary"><Brain className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">Mind · for right now</span><span className="block font-semibold">{pick.title}</span><span className="block text-sm text-muted-foreground">{pick.line}</span></span>
      <span className="shrink-0 self-center rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground">{pick.cta}</span>
    </button>
    }
    </div>
  );
}
