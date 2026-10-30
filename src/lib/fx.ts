// Tiny event bus for celebratory effects (confetti + toast). No dependencies.
export const burst = () => window.dispatchEvent(new CustomEvent("lagomo:burst"));
export const toast = (title: string, sub?: string) => window.dispatchEvent(new CustomEvent("lagomo:toast", { detail: { title, sub } }));
