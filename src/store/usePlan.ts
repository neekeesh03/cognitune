import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/fx";
import { tr } from "@/i18n";
import { Block, Repeat, Series, Task, blockStartMs, seriesDays, uid } from "@/engine/plan";
import { deleteBlockFile } from "@/lib/blockfiles";
const KT = "lagomo.tasks.v1", KB = "lagomo.blocks.v1", KS = "lagomo.series.v1";
const load = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export function usePlan() {
  const [tasks, setT] = useState<Task[]>(() => load<Task>(KT)); const [blocks, setB] = useState<Block[]>(() => load<Block>(KB)); const [series, setS] = useState<Series[]>(() => load<Series>(KS));
  const blocksRef = useRef(blocks); blocksRef.current = blocks; const seriesRef = useRef(series); seriesRef.current = series;
  const trash = useRef<{ b: Block; timer: number } | null>(null);
  useEffect(() => { localStorage.setItem(KT, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(KB, JSON.stringify(blocks)); }, [blocks]);
  useEffect(() => { localStorage.setItem(KS, JSON.stringify(series)); }, [series]);
  // Keep the next three weeks of every repeating plan filled in. Runs on open, when a series changes, and when you come back to the app.
  useEffect(() => {
    const fill = () => setB(cur => {
      const add: Block[] = []; const t = todayKey();
      for (const s of series) for (const day of seriesDays(s, t)) if (!cur.some(b => b.series === s.id && b.day === day) && !add.some(b => b.series === s.id && b.day === day))
        add.push({ id: uid(), title: s.title, day, start: s.start, dur: s.dur, series: s.id, note: s.note, links: s.links, files: s.files, remind: s.remind });
      return add.length ? [...cur, ...add] : cur;
    });
    fill(); const on = () => { if (!document.hidden) fill(); }; document.addEventListener("visibilitychange", on); return () => document.removeEventListener("visibilitychange", on);
  }, [series]);
  const addTask = useCallback((t: Omit<Task, "id" | "createdAt">) => { const x = { ...t, id: uid(), createdAt: Date.now() }; setT(a => [x, ...a]); return x; }, []);
  const patchTask = useCallback((id: string, f: (t: Task) => Task) => setT(a => a.map(t => t.id === id ? f(t) : t)), []);
  const removeTask = useCallback((id: string) => setT(a => a.filter(t => t.id !== id)), []);
  /** Adds a block. With a repeat rule it also starts a series, and the other days are filled in right away. */
  const addBlock = useCallback((b: Omit<Block, "id">, repeat: Repeat = "none") => {
    const x: Block = { ...b, id: uid() };
    if (repeat !== "none") { const sid = uid(); x.series = sid; setS(a => [...a, { id: sid, title: b.title, start: b.start, dur: b.dur, rule: repeat, anchor: b.day, skip: [], note: b.note, links: b.links, files: b.files, remind: b.remind }]); }
    setB(a => [...a, x]); return x;
  }, []);
  const patchBlock = useCallback((id: string, p: Partial<Block>) => setB(a => a.map(b => b.id === id ? { ...b, ...p } : b)), []);
  // Files are shared by every day of a series, so one is only deleted when nothing else uses it.
  const dropFiles = (b: Block | undefined, rest: Block[], rs: Series[]) => b?.files?.forEach(f => { if (!rest.some(o => o.files?.some(x => x.id === f.id)) && !rs.some(o => o.files?.some(x => x.id === f.id))) deleteBlockFile(f.id); });
  /** Deletes a block, but keeps it (and its photos) for 15 seconds so it can be brought back with Undo. */
  const finishTrash = useCallback(() => { const t = trash.current; if (!t) return; window.clearTimeout(t.timer); trash.current = null; dropFiles(t.b, blocksRef.current, seriesRef.current); }, []);
  const removeBlock = useCallback((id: string, quiet = false) => {
    const b = blocksRef.current.find(x => x.id === id); if (!b) return;
    finishTrash();
    if (b.series) setS(a => a.map(s => s.id === b.series ? { ...s, skip: [...s.skip, b.day] } : s));
    setB(blocksRef.current.filter(x => x.id !== id));
    trash.current = { b, timer: window.setTimeout(finishTrash, 15000) };
    if (quiet) { const t = trash.current; if (t) { window.clearTimeout(t.timer); trash.current = null; dropFiles(t.b, blocksRef.current.filter(x => x.id !== id), seriesRef.current); } return; }
    toast(b.title, tr("Deleted"), { label: "Undo", url: "/?undo=1" });
  }, [finishTrash]);
  const undoRemove = useCallback(() => {
    const t = trash.current; if (!t) return; window.clearTimeout(t.timer); trash.current = null;
    const { b } = t; setB(a => (a.some(x => x.id === b.id) ? a : [...a, b]));
    if (b.series) setS(a => a.map(s => s.id === b.series ? { ...s, skip: s.skip.filter(d => d !== b.day) } : s));
    toast(b.title, tr("Restored"));
  }, []);
  /** Stops a repeating plan. Days already done or already started stay. */
  const stopSeries = useCallback((sid: string) => {
    const now = Date.now(); const gone = blocks.filter(b => b.series === sid && !b.done && blockStartMs(b) > now);
    const rest = blocks.filter(b => !gone.includes(b)); const rs = series.filter(s => s.id !== sid);
    setS(rs); setB(rest.map(b => (b.series === sid ? { ...b, series: undefined } : b))); gone.forEach(b => dropFiles(b, rest, rs));
  }, [blocks, series]);
  return { tasks, blocks, series, addTask, patchTask, removeTask, addBlock, patchBlock, removeBlock, undoRemove, stopSeries };
}
export type PlanApi = ReturnType<typeof usePlan>;
