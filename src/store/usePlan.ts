import { useCallback, useEffect, useState } from "react";
import { Block, Task, uid } from "@/engine/plan";
import { deleteBlockFile } from "@/lib/blockfiles";
const KT = "lagomo.tasks.v1", KB = "lagomo.blocks.v1";
const load = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
export function usePlan() {
  const [tasks, setT] = useState<Task[]>(() => load<Task>(KT)); const [blocks, setB] = useState<Block[]>(() => load<Block>(KB));
  useEffect(() => { localStorage.setItem(KT, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(KB, JSON.stringify(blocks)); }, [blocks]);
  const addTask = useCallback((t: Omit<Task, "id" | "createdAt">) => { const x = { ...t, id: uid(), createdAt: Date.now() }; setT(a => [x, ...a]); return x; }, []);
  const patchTask = useCallback((id: string, f: (t: Task) => Task) => setT(a => a.map(t => t.id === id ? f(t) : t)), []);
  const removeTask = useCallback((id: string) => setT(a => a.filter(t => t.id !== id)), []);
  const addBlock = useCallback((b: Omit<Block, "id">) => { const x = { ...b, id: uid() }; setB(a => [...a, x]); return x; }, []);
  const patchBlock = useCallback((id: string, p: Partial<Block>) => setB(a => a.map(b => b.id === id ? { ...b, ...p } : b)), []);
  const removeBlock = useCallback((id: string) => setB(a => { a.find(b => b.id === id)?.files?.forEach(f => deleteBlockFile(f.id)); return a.filter(b => b.id !== id); }), []);
  return { tasks, blocks, addTask, patchTask, removeTask, addBlock, patchBlock, removeBlock };
}
export type PlanApi = ReturnType<typeof usePlan>;
