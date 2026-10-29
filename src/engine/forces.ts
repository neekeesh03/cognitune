import { Brain, Zap, Puzzle, Anchor, Weight, Waves, type LucideIcon } from "lucide-react";
import type { VarKey, Verdict } from "./model";
export const FORCE: Record<VarKey, { color: string; icon: LucideIcon; title: string; blurb: string }> = {
  Primode: { color: "var(--f-primode)", icon: Zap, title: "Getting started", blurb: "Could you begin right now?" },
  CAP: { color: "var(--f-cap)", icon: Brain, title: "Why it matters", blurb: "How much it matters" },
  Flexion: { color: "var(--f-flexion)", icon: Puzzle, title: "Right size", blurb: "Task vs. your state" },
  Anchory: { color: "var(--f-anchory)", icon: Anchor, title: "Focus", blurb: "Staying on one thing" },
  Grain: { color: "var(--f-grain)", icon: Weight, title: "Heaviness", blurb: "How sticky it feels" },
  Slip: { color: "var(--f-slip)", icon: Waves, title: "Mind wandering", blurb: "Mind bouncing around" },
};
/** colour for a force, e.g. fc(FORCE.CAP.color, .2) */
export const fc = (color: string, a = 1) => `hsl(${color} / ${a})`;
export const VERDICT_STYLE: Record<Verdict, { color: string; headline: string; sub: string }> = {
  ready: { color: "var(--v-ready)", headline: "You're ready.", sub: "The gate is open. Start now while it is." },
  borderline: { color: "var(--v-borderline)", headline: "Almost there.", sub: "Start small and expect some wobble." },
  "not-ready": { color: "var(--v-notready)", headline: "Not yet.", sub: "Change one thing first, then check again." },
};
