import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function JoinDialog({ inviter, defaultName, onJoin, onCancel }: { inviter: string; defaultName: string; onJoin: (myName: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(defaultName);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-5 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Join a chat">
      <div className="glass animate-rise w-full max-w-sm space-y-4 rounded-3xl p-6 text-center">
        <h2 className="text-3xl">{inviter} invited you</h2>
        <p className="text-sm text-muted-foreground">Chat with {inviter} on Cognitune, share files, and work side by side. What should {inviter} call you?</p>
        <Input className="h-12 rounded-2xl bg-secondary/60" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <Button variant="hero" className="h-12 w-full rounded-2xl" disabled={!name.trim()} onClick={() => onJoin(name.trim())}>Join the chat</Button>
        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={onCancel}>Not now</button>
      </div>
    </div>);
}
