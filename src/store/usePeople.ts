import { useCallback, useEffect, useRef, useState } from "react";
export type Relation = "buddy" | "friend" | "family" | "mentor" | "teammate";
export interface FileMeta { id: string; name: string; type: string; size: number }
export interface Msg {
  id: string; ts: number; from: "me" | "them" | "tune"; kind: "text" | "file" | "session" | "tune" | "note"; text: string;
  file?: FileMeta; session?: { id: string; dur: number; status: "invited" | "joined" | "done" }; delivered?: boolean;
}
export interface Person { id: string; name: string; relation: Relation; roomId: string; thread: Msg[]; createdAt: number; lastRead: number; everConnected?: boolean }
const K = "cognitune.people.v2", OLD = "cognitune.people.v1";
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
export const newRoomId = rid;

function load(): Person[] {
  try { const v2 = localStorage.getItem(K); if (v2) return JSON.parse(v2); } catch { /* fall through */ }
  try { // migrate v1
    const old = JSON.parse(localStorage.getItem(OLD) || "[]");
    return old.map((p: { id: string; name: string; relation: Relation; createdAt: number; thread?: { id: string; ts: number; dir: string; text: string }[] }) => ({
      id: p.id, name: p.name, relation: p.relation, roomId: rid(), createdAt: p.createdAt, lastRead: Date.now(),
      thread: (p.thread || []).map(m => ({ id: m.id, ts: m.ts, from: m.dir === "reply" ? "them" : "me", kind: m.dir === "note" ? "note" : "text", text: m.text, delivered: true })),
    }));
  } catch { return []; }
}
export function usePeople() {
  const [people, setP] = useState<Person[]>(load);
  const ref = useRef(people); ref.current = people;
  useEffect(() => { try { localStorage.setItem(K, JSON.stringify(people)); } catch { /* storage full */ } }, [people]);
  const add = useCallback((p: { name: string; relation: Relation; roomId?: string }) => {
    const x: Person = { id: crypto.randomUUID(), name: p.name, relation: p.relation, roomId: p.roomId ?? rid(), thread: [], createdAt: Date.now(), lastRead: Date.now() };
    setP(a => [...a, x]); return x;
  }, []);
  const remove = useCallback((id: string) => setP(a => a.filter(p => p.id !== id)), []);
  /** Adds a message once (deduped by id). Returns false if it already existed. */
  const addMsg = useCallback((pid: string, m: Omit<Msg, "id" | "ts"> & { id?: string; ts?: number }) => {
    const msg: Msg = { ...m, id: m.id ?? crypto.randomUUID(), ts: m.ts ?? Date.now() };
    if (ref.current.find(p => p.id === pid)?.thread.some(t => t.id === msg.id)) return msg;
    setP(a => a.map(p => p.id === pid ? { ...p, thread: [...p.thread, msg].sort((x, y) => x.ts - y.ts) } : p)); return msg;
  }, []);
  const patchMsg = useCallback((pid: string, mid: string, patch: Partial<Msg>) => setP(a => a.map(p => p.id === pid ? { ...p, thread: p.thread.map(t => t.id === mid ? { ...t, ...patch } : t) } : p)), []);
  const patchPerson = useCallback((pid: string, patch: Partial<Person>) => setP(a => a.map(p => p.id === pid ? { ...p, ...patch } : p)), []);
  const markRead = useCallback((pid: string) => setP(a => a.map(p => p.id === pid ? { ...p, lastRead: Date.now() } : p)), []);
  return { people, ref, add, remove, addMsg, patchMsg, patchPerson, markRead };
}
export type PeopleApi = ReturnType<typeof usePeople>;
export const unread = (p: Person) => p.thread.filter(m => m.from !== "me" && m.ts > p.lastRead).length;
