import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface Pair { both: number; either: number; mine: number }
/** Days in the last week that you and each friend both started. Never resets, never shames. */
export function useBurrow() {
  const [pairs, setPairs] = useState<Record<string, Pair>>({}); const [starters, setStarters] = useState(0);
  const reload = useCallback(async () => { try { const r = await api<{ pairs: Record<string, Pair>; starters: number }>("burrow"); setPairs(r.pairs); setStarters(r.starters); } catch { /* offline */ } }, []);
  useEffect(() => { reload(); const t = setInterval(() => { if (!document.hidden) reload(); }, 300000); return () => clearInterval(t); }, [reload]);
  return { pairs, starters, reload };
}
export type BurrowApi = ReturnType<typeof useBurrow>;
