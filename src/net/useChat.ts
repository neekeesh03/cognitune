// Two-way in-app chat between people. Peer-to-peer (WebRTC) using public signalling, so no account, server or API key is needed.
// Both people must be online at the same time for messages to travel; anything sent while they are away waits and is delivered when they return.
import { useCallback, useEffect, useRef, useState } from "react";
import { joinRoom } from "trystero";
import type { PeopleApi, Msg, Person } from "@/store/usePeople";
import { getBlob, putBlob } from "@/net/blobs";

const APP_ID = "cognitune-chat-v1";
type Room = ReturnType<typeof joinRoom>;
interface Link { room: Room; peers: Set<string>; send: (m: Msg) => void; sendFile: (m: Msg, blob: Blob) => void; typing: (b: boolean) => void; join: (sid: string) => void }
export interface ChatEvents { onIncoming?: (p: Person, m: Msg) => void; onSessionJoin?: (p: Person, sessionId: string) => void }
export const MAX_FILE = 15_000_000;

export function useChat(api: PeopleApi, ev: ChatEvents = {}) {
  const links = useRef<Map<string, Link>>(new Map());
  const evRef = useRef(ev); evRef.current = ev;
  const [online, setOnline] = useState<Record<string, boolean>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, number>>({});
  const flag = (set: React.Dispatch<React.SetStateAction<Record<string, boolean>>>, id: string, v: boolean) => set(s => (s[id] === v ? s : { ...s, [id]: v }));

  const connect = useCallback((p: Person) => {
    const pid = p.id;
    const room = joinRoom({ appId: APP_ID, password: p.roomId }, p.roomId);
    const peers = new Set<string>();
    const msgA = room.makeAction("msg"), ackA = room.makeAction<string>("ack"), typA = room.makeAction<boolean>("typ"), fileA = room.makeAction("file"), sesA = room.makeAction<string>("ses");
    const person = () => api.ref.current.find(x => x.id === pid);
    const transmit = (m: Msg) => { msgA.send(m as never); };
    const transmitFile = async (m: Msg, blob: Blob) => { await fileA.send(blob, { metadata: { msg: m } as never, onProgress: (pct: number) => setProgress(s => ({ ...s, [m.id]: pct })) }); setProgress(s => { const { [m.id]: _, ...r } = s; return r; }); };
    const flush = async () => {
      const pp = person(); if (!pp) return;
      for (const m of pp.thread) if (m.from !== "them" && m.delivered === false) {
        if (m.kind === "file" && m.file) { const b = await getBlob(m.file.id); if (b) transmitFile(m, b); } else transmit(m);
      }
    };
    room.onPeerJoin = (peerId: string) => { peers.add(peerId); flag(setOnline, pid, true); api.patchPerson(pid, { everConnected: true }); setTimeout(flush, 400); };
    room.onPeerLeave = (peerId: string) => { peers.delete(peerId); if (!peers.size) { flag(setOnline, pid, false); flag(setTyping, pid, false); } };
    const receive = (m: Msg) => {
      const pp = person(); if (!pp) return; const exists = pp.thread.some(t => t.id === m.id);
      ackA.send(m.id);
      if (exists) return;
      const mine: Msg = { ...m, from: m.from === "tune" ? "tune" : "them", delivered: true };
      api.addMsg(pid, mine); evRef.current.onIncoming?.(pp, mine);
    };
    msgA.onMessage = (data) => receive(data as unknown as Msg);
    fileA.onMessage = async (data, ctx) => { const m = (ctx.metadata as unknown as { msg?: Msg } | undefined)?.msg; if (!m?.file) return; await putBlob(m.file.id, new Blob([data as unknown as BlobPart], { type: m.file.type })); receive(m); };
    ackA.onMessage = (id) => api.patchMsg(pid, id, { delivered: true });
    typA.onMessage = (b) => { flag(setTyping, pid, b); if (b) setTimeout(() => flag(setTyping, pid, false), 4000); };
    sesA.onMessage = (sid) => { const pp = person(); if (pp) evRef.current.onSessionJoin?.(pp, sid); };
    links.current.set(pid, { room, peers, send: transmit, sendFile: transmitFile, typing: b => typA.send(b), join: sid => sesA.send(sid) });
  }, [api]);

  // keep one room open per person
  useEffect(() => {
    const ids = new Set(api.people.map(p => p.id));
    api.people.forEach(p => { if (!links.current.has(p.id)) connect(p); });
    links.current.forEach((l, id) => { if (!ids.has(id)) { l.room.leave(); links.current.delete(id); } });
  }, [api.people, connect]);
  useEffect(() => () => { links.current.forEach(l => l.room.leave()); links.current.clear(); }, []);

  const send = useCallback((pid: string, m: Omit<Msg, "id" | "ts" | "delivered" | "from"> & { from?: Msg["from"] }) => {
    const msg = api.addMsg(pid, { ...m, from: m.from ?? "me", delivered: false });
    const l = links.current.get(pid); if (l?.peers.size) l.send(msg); return msg;
  }, [api]);
  const sendFile = useCallback(async (pid: string, file: File, text = "") => {
    if (file.size > MAX_FILE) throw new Error("too-big");
    const id = crypto.randomUUID(); await putBlob(id, file);
    const msg = api.addMsg(pid, { from: "me", kind: "file", text, file: { id, name: file.name, type: file.type || "application/octet-stream", size: file.size }, delivered: false });
    const l = links.current.get(pid); if (l?.peers.size) l.sendFile(msg, file); return msg;
  }, [api]);
  const setTypingTo = useCallback((pid: string, b: boolean) => { const l = links.current.get(pid); if (l?.peers.size) l.typing(b); }, []);
  const joinSession = useCallback((pid: string, sid: string) => links.current.get(pid)?.join(sid), []);
  return { online, typing, progress, send, sendFile, setTypingTo, joinSession };
}
export type ChatApi = ReturnType<typeof useChat>;
