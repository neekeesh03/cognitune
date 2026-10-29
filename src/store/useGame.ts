import { useCallback, useEffect, useState } from "react";
import { BADGES, BOX_LINES, EventKind, GameState, SPARKS, STREAK_EVENTS, bumpStreak, dkey, emptyGame, levelFor } from "@/engine/game";
import { burst, toast } from "@/lib/fx";
const K = "cognitune.game.v1";
export function useGame() {
  const [g, setG] = useState<GameState>(() => { try { return { ...emptyGame(), ...JSON.parse(localStorage.getItem(K) || "{}") }; } catch { return emptyGame(); } });
  useEffect(() => { localStorage.setItem(K, JSON.stringify(g)); }, [g]);

  /** Record something good you did. Awards sparks, updates streak and badges, and celebrates. */
  const earn = useCallback((kind: EventKind, extra?: { early?: boolean; people?: number }) => {
    setG(prev => {
      let s: GameState = { ...prev, counts: { ...prev.counts, [kind]: (prev.counts[kind] || 0) + 1 } };
      const day = dkey(); let n = SPARKS[kind].n;
      if (kind === "chat" && s.counts.chat > 0 && prev.today === day && (prev.counts["chat_" + day] || 0) >= 3) n = 0; // cap chat sparks per day
      if (kind === "chat") s.counts["chat_" + day] = (prev.counts["chat_" + day] || 0) + 1;
      if (n) { s.sparks += n; s.lifetime += n; }
      let msg: string | undefined;
      if (STREAK_EVENTS.includes(kind)) { const r = bumpStreak(s, day); s = r.g; msg = r.msg; s.todayActive = true; }
      s.today = day;
      const have = new Set(s.badges); const add = (id: string) => have.add(id);
      if (kind === "started") add("first_start");
      if (extra?.early) add("early");
      if (s.streak.current >= 3) add("streak3"); if (s.streak.current >= 7) add("streak7");
      if ((s.counts.step || 0) >= 10) add("steps10"); if ((s.counts.step || 0) >= 50) add("steps50");
      if ((s.counts.journal || 0) >= 5) add("journal5"); if ((s.counts.block || 0) >= 5) add("plan5");
      if ((s.counts.buddy || 0) >= 1) add("buddy1"); if ((extra?.people ?? 0) >= 1) add("friend1");
      if (levelFor(s.lifetime).level >= 4) add("level4");
      const newB = [...have].filter(b => !prev.badges.includes(b)); s.badges = [...have];
      const lvlUp = levelFor(s.lifetime).level > levelFor(prev.lifetime).level;
      setTimeout(() => {
        if (n) toast(`+${n} sparks`, SPARKS[kind].label);
        if (msg) toast("Streak", msg);
        newB.forEach(b => { toast("New badge", BADGES.find(x => x.id === b)!.name); burst(); });
        if (lvlUp) { toast("You grew!", `Level ${levelFor(s.lifetime).level + 1}: ${levelFor(s.lifetime).name}`); burst(); }
        if (kind === "started" || kind === "task" || kind === "timer" || kind === "buddy") burst();
      }, 0);
      return s;
    });
  }, []);

  const openBox = useCallback(() => setG(prev => {
    const day = dkey(); if (prev.boxDay === day) return prev;
    const n = 3 + Math.floor(Math.random() * 8);
    setTimeout(() => { toast(`+${n} sparks`, BOX_LINES[Math.floor(Math.random() * BOX_LINES.length)]); burst(); }, 0);
    return { ...prev, boxDay: day, sparks: prev.sparks + n, lifetime: prev.lifetime + n };
  }), []);
  const claim = useCallback((id: string) => setG(prev => {
    const r = prev.rewards.find(x => x.id === id); if (!r || prev.sparks < r.cost) return prev;
    setTimeout(() => { toast("Enjoy it", r.name); burst(); }, 0);
    return { ...prev, sparks: prev.sparks - r.cost, claimed: [{ id, name: r.name, ts: Date.now() }, ...prev.claimed] };
  }), []);
  const addReward = useCallback((name: string, cost: number) => setG(p => ({ ...p, rewards: [...p.rewards, { id: crypto.randomUUID(), name, cost }] })), []);
  const removeReward = useCallback((id: string) => setG(p => ({ ...p, rewards: p.rewards.filter(r => r.id !== id) })), []);
  return { g, earn, openBox, claim, addReward, removeReward };
}
export type GameApi = ReturnType<typeof useGame>;
