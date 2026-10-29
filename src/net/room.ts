import { api } from "@/lib/api";
import { sealJson } from "@/lib/e2ee";
import type { Friend } from "@/store/usePeople";
/** Creates a room on the server, then sends each invited friend an end-to-end encrypted invite in your chat with them. */
export async function inviteToRoom(meId: string, friends: Friend[], dur: number) {
  const sid = crypto.randomUUID();
  const ok = friends.filter(f => f.pk);
  if (!ok.length) throw new Error("Your friends need to sign in once to turn on private messaging first.");
  await api("room-create", { body: { sid, inv: ok.map(f => f.id) } });
  await Promise.all(ok.map(async f => { const enc = await sealJson(meId, f.pk!, { text: `Let's work side by side in The Corner for ${dur} minutes.`, session: { id: sid, dur, room: true } }); await api("messages", { body: { to: f.id, kind: "session", enc } }); }));
  return sid;
}
