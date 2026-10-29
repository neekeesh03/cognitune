import { useCallback, useEffect, useMemo, useState } from "react";
import type { Entry } from "@/engine/profile";
import { buildProfile } from "@/engine/profile";
import { analyze } from "@/engine/text";
import type { CheckIn } from "@/engine/analytics";

const KE = "cognitune.entries.v1", KS = "cognitune.settings.v1";
interface Settings { name: string; resolved: string[]; shuffle: Record<string, number> }
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; } };
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function useJournal(history: CheckIn[]) {
  const [entries, setEntries] = useState<Entry[]>(() => load(KE, []));
  const [settings, setSettings] = useState<Settings>(() => load(KS, { name: "", resolved: [], shuffle: {} }));
  useEffect(() => { localStorage.setItem(KE, JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem(KS, JSON.stringify(settings)); }, [settings]);
  const profile = useMemo(() => buildProfile(entries, history, settings.resolved), [entries, history, settings.resolved]);

  const addUser = useCallback((text: string, kind: "journal" | "chat", extra: Partial<Entry> = {}) => {
    const e: Entry = { id: crypto.randomUUID(), ts: Date.now(), kind, role: "user", text, signals: analyze(text), ...extra };
    setEntries(p => [...p, e]); return e;
  }, []);
  const addFriend = useCallback((text: string, meta?: Entry["meta"]) => { const e: Entry = { id: crypto.randomUUID(), ts: Date.now(), kind: "chat", role: "friend", text, meta }; setEntries(p => [...p, e]); return e; }, []);
  const remove = useCallback((id: string) => setEntries(p => p.filter(e => e.id !== id)), []);
  const clear = useCallback(() => setEntries([]), []);
  const set = useCallback((patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch })), []);
  const resolve = useCallback((t: string) => setSettings(s => ({ ...s, resolved: [...s.resolved, t] })), []);
  const shuffleToday = settings.shuffle[dayKey()] ?? 0;
  const reshuffle = useCallback(() => setSettings(s => ({ ...s, shuffle: { ...s.shuffle, [dayKey()]: (s.shuffle[dayKey()] ?? 0) + 1 } })), []);
  return { entries, settings, profile, addUser, addFriend, remove, clear, set, resolve, shuffleToday, reshuffle };
}
export type JournalApi = ReturnType<typeof useJournal>;
