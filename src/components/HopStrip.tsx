import { Avatar } from "@/components/Avatar";
import type { Friend } from "@/store/usePeople";
import type { HopsApi } from "@/store/useHops";

const ago = (ts: number) => { const m = Math.max(1, Math.round((Date.now() - ts) / 60000)); return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };

/** Friends who hopped in today. One line each, one cheer button. No feed. */
export function HopStrip({ friends, hops }: { friends: Friend[]; hops: HopsApi }) {
  const list = friends.filter(f => hops.hops[f.id]).sort((a, b) => hops.hops[b.id] - hops.hops[a.id]).slice(0, 5);
  if (!list.length) return null;
  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Hopped in today</div>
      <div className="space-y-2">
        {list.map(f => (
          <div key={f.id} className="flex items-center gap-3 text-sm">
            <Avatar spec={f.avatar} size={36} />
            <div className="min-w-0 flex-1"><b>{f.name}</b> hopped in <span className="text-muted-foreground">{ago(hops.hops[f.id])}</span></div>
            <button disabled={!!hops.cheered[f.id]} onClick={() => hops.cheer(f.id)} className="rounded-full bg-primary/15 px-3 py-1.5 text-primary disabled:opacity-60">{hops.cheered[f.id] ? "Cheered" : "Cheer"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
