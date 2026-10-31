import { useState } from "react";
import { Lock } from "lucide-react";
import { RabbitFace, WARDROBE, type Wear } from "@/components/RabbitFace";
import { wornNow } from "@/components/Rabbit";

/** Outfits for the rabbit, earned by starting things. Once unlocked, always yours. */
export function Wardrobe({ starts }: { starts: number }) {
  const [wear, setWear] = useState<Wear>(wornNow);
  const pick = (w: Wear) => { setWear(w); try { localStorage.setItem("lagomo.rabbit.wear", w); } catch { /* ignore */ } };
  const next = WARDROBE.find(w => w.at > starts);
  return (
    <div className="glass rounded-3xl p-5">
      <div className="font-semibold">Your rabbit's wardrobe</div>
      <p className="text-sm text-muted-foreground">{next ? `${next.at - starts} more start${next.at - starts === 1 ? "" : "s"} for the ${next.name.toLowerCase()}. ` : "You have every outfit. "}Nothing here is ever taken away.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {WARDROBE.map(w => { const have = starts >= w.at; return (
          <button key={w.id} disabled={!have} onClick={() => pick(w.id)} aria-pressed={wear === w.id} className={`relative flex flex-col items-center rounded-2xl border p-2 text-xs transition ${wear === w.id ? "border-primary bg-primary/10" : "border-border"} ${have ? "hover:border-primary/60" : "opacity-50"}`}>
            <RabbitFace crop face={wear === w.id ? "happy" : "calm"} wear={w.id} size={56} title={w.name} />
            <span className="mt-0.5">{w.name}</span>{!have && <span className="mt-0.5 flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" />{w.at} starts</span>}
          </button>); })}
      </div>
    </div>);
}
