import { useEffect, useState, useCallback } from "react";
import type { CheckIn } from "@/engine/analytics";
const KEY = "cognitune.history.v2"; // stored only in this browser
export function useHistory() {
  const [h, setH] = useState<CheckIn[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(h)); }, [h]);
  const add = useCallback((c: CheckIn) => setH(p => [...p, c]), []);
  const update = useCallback((id: string, patch: Partial<CheckIn>) => setH(p => p.map(x => (x.id === id ? { ...x, ...patch } : x))), []);
  const clear = useCallback(() => setH([]), []);
  const remove = useCallback((id: string) => setH(p => p.filter(x => x.id !== id)), []);
  return { history: h, add, update, clear, remove };
}
