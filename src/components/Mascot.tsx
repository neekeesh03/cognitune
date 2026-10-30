import { Avatar } from "@/components/Avatar";
import type { AvatarSpec } from "@/engine/avatar";

/** The Lagomo rabbit. Fixed look (Bunny species, lavender body) so the brand always has one face. */
export const TUNE_SPEC: AvatarSpec = { s: 1, p: 3, e: 0, m: 0, a: 0, c: 0 };
export function Mascot({ size = 36 }: { size?: number }) {
  return <Avatar spec={TUNE_SPEC} size={size} title="Lagomo the rabbit" />;
}

/** Wordmark: the "go" inside Lagomo is picked out in the brand colour. */
export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={className}>La<span className="text-primary">go</span>mo</span>;
}
