import type { VarKey, FailureMode } from "./model";
export interface Move { title: string; how: string; minutes: number }
export const LEVER_MOVES: Record<VarKey, Move[]> = {
  Primode: [
    { title: "Define the first physical action", how: "Write the literal first 30 seconds (open file, type heading). A concrete gate beats a vague goal.", minutes: 2 },
    { title: "If-then trigger", how: "Say: 'When I finish this sip/sit down, I open the doc.' Then do exactly that.", minutes: 1 },
  ],
  CAP: [
    { title: "Name the cost of not starting", how: "Write one sentence on what slips if this stays untouched today.", minutes: 2 },
    { title: "Make it visible to someone", how: "Tell one person what you will deliver and by when.", minutes: 2 },
  ],
  Flexion: [
    { title: "Resize the task to your state", how: "Cut to the smallest version you can do at current energy, e.g. outline, not draft.", minutes: 3 },
    { title: "Switch task type", how: "If it is analytic and you feel flat, pick a mechanical sub-step first.", minutes: 1 },
  ],
  Anchory: [
    { title: "Single-tab, phone away", how: "Close everything but the task. Put the phone out of reach for 10 minutes.", minutes: 2 },
    { title: "Anchor sound or timer", how: "Start a 10-minute timer; your only job is to stay until it rings.", minutes: 1 },
  ],
  Grain: [
    { title: "Brain-dump the heaviness", how: "Two minutes of writing what feels sticky about it. Naming it lowers its weight.", minutes: 2 },
    { title: "Two-minute entry", how: "Commit only to 2 minutes. Lower the entry cost, not the standard.", minutes: 2 },
  ],
  Slip: [
    { title: "Park the drifts", how: "Keep a scrap list; every stray thought goes there instead of being followed.", minutes: 1 },
    { title: "Short movement reset", how: "Walk or stretch for 3 minutes, then re-run the check-in.", minutes: 3 },
  ],
};
export const MODE_MOVES: Record<string, Move> = {
  inertia: { title: "Make the start tiny", how: "Pick one very small first action. Do not add pressure; it will not help here.", minutes: 2 },
  falsestart: { title: "Re-scope before starting", how: "Choose a version of the task that matches your current state.", minutes: 3 },
  friction: { title: "Make it lighter first", how: "Break the task into a 10-minute unit and remove one source of friction.", minutes: 5 },
  slip: { title: "Use short timed sprints", how: "Work in 10-minute sprints with a scrap list for drifting thoughts.", minutes: 10 },
  latent: { title: "Clear one thing from your head", how: "Write down every pending thing in your head, pick one to schedule, then return.", minutes: 5 },
};
export const _types = null as unknown as FailureMode;
