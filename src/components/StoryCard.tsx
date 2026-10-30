import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mascot, Wordmark } from "@/components/Mascot";
import { track } from "@/lib/track";

const KEY = "lagomo.story.v1";
/** One small card that teaches where the name comes from. Shown once, never again. */
export function StoryCard() {
  const [open, setOpen] = useState(() => !localStorage.getItem(KEY));
  if (!open) return null;
  const close = () => { localStorage.setItem(KEY, String(Date.now())); if (!localStorage.getItem("lagomo.first")) localStorage.setItem("lagomo.first", String(Date.now())); track("name_story_seen"); setOpen(false); };
  return (
    <div className="glass rounded-3xl p-5 text-center">
      <div className="mx-auto mb-2 w-fit"><Mascot size={48} /></div>
      <div className="text-2xl font-semibold"><Wordmark /> <span className="text-muted-foreground">(la-GO-mo)</span></div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground"><b className="text-foreground">lagom</b> is Swedish for "just the right amount". Add <b className="text-foreground">go</b>, and you get an app where one small start is enough. The rabbit is there because rabbits are quick starters, and they live in groups.</p>
      <Button variant="hero" className="mt-3 rounded-2xl" onClick={close}>Got it</Button>
    </div>
  );
}
