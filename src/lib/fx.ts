// Tiny event bus for celebratory effects (confetti + toast). No dependencies.
export const burst = () => window.dispatchEvent(new CustomEvent("cognitune:burst"));
export const toast = (title: string, sub?: string) => window.dispatchEvent(new CustomEvent("cognitune:toast", { detail: { title, sub } }));
