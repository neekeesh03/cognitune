import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { AvatarEditor } from "@/components/AvatarEditor";
import { api } from "@/lib/api";
import { avatarKey, randomAvatar, type AvatarSpec } from "@/engine/avatar";
import type { AuthApi } from "@/store/useAuth";

// Shown once, right after the account is made. Everyone already has a friend picked for them; this lets them change it.
export function MeetFriend({ auth }: { auth: AuthApi }) {
  const user = auth.user!; const [av, setAv] = useState<AvatarSpec>(user.avatar); const [edit, setEdit] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(""); setBusy(true);
    try { if (avatarKey(av) !== avatarKey(user.avatar)) { const r = await api<{ user: typeof user }>("profile", { body: { avatar: av } }); auth.updateUser(r.user); } auth.finishOnboarding(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">Nice to meet you, {user.name.split(" ")[0]}.</p>
      <h1 className="mt-1 text-4xl leading-tight">Meet your friend.</h1>
      <p className="mt-2 max-w-xs text-muted-foreground">This is how you will show up in Lagomo. Keep it, or make it yours.</p>
      <div className="my-6"><Avatar spec={av} size={150} /></div>
      {!edit ? (
        <div className="w-full space-y-3">
          <Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={busy} onClick={save}>Looks good</Button>
          <div className="flex gap-3">
            <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={() => setAv(randomAvatar())}>Surprise me</Button>
            <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={() => setEdit(true)}>Customise</Button>
          </div>
        </div>
      ) : (
        <div className="glass w-full space-y-3 rounded-3xl p-4"><AvatarEditor value={av} onChange={setAv} /><Button variant="hero" className="h-12 w-full rounded-2xl text-base" disabled={busy} onClick={save}>Done</Button></div>
      )}
      {err && <p role="alert" className="mt-3 text-sm text-destructive">{err}</p>}
      <p className="mt-4 text-xs text-muted-foreground">Every friend is one of a kind. You can change this any time in Me.</p>
    </div>);
}
