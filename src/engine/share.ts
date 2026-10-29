import type { Person } from "@/store/usePeople";

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
export const smsLink = (phone: string, text: string) => `sms:${phone}?&body=${encodeURIComponent(text)}`;
export const mailLink = (email: string, subject: string, text: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;

export const NUDGES = (task: string) => [
  `I'm about to start "${task}". Want to work alongside me for 25 minutes?`,
  `Quick check: I said I'd do "${task}" today. Can you ask me later if I did?`,
  `I just finished a small step on "${task}". Tiny win, but I wanted to tell someone.`,
  `Having a hard time starting "${task}". Could you send me a quick "you've got this"?`,
];
export async function shareNative(text: string, file?: File) {
  const data: ShareData = { text, ...(file ? { files: [file] } : {}) };
  if (navigator.share && (!file || (navigator.canShare && navigator.canShare(data)))) { try { await navigator.share(data); return true; } catch { return false; } }
  return false;
}
export function dataUrlToFile(dataUrl: string, name: string, type: string) {
  const [, b64] = dataUrl.split(","); const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], name, { type });
}
/** Draws a branded win card to a PNG blob. */
export async function winCard(opts: { title: string; line: string; streak: number; level: string }): Promise<Blob> {
  try { await document.fonts.load("700 80px 'Inter Tight'"); } catch { /* ignore */ }
  const W = 1080, H = 1080, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#346747"); bg.addColorStop(1, "#101E17"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.8, H * 0.2, 20, W * 0.8, H * 0.2, 520); glow.addColorStop(0, "rgba(219,131,42,0.55)"); glow.addColorStop(1, "rgba(219,131,42,0)"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const lav = g.createRadialGradient(W * 0.15, H * 0.9, 20, W * 0.15, H * 0.9, 480); lav.addColorStop(0, "rgba(183,167,217,0.5)"); lav.addColorStop(1, "rgba(183,167,217,0)"); g.fillStyle = lav; g.fillRect(0, 0, W, H);
  g.fillStyle = "#F2F7F3"; g.font = "600 44px 'Inter Tight', sans-serif"; g.fillText("Cognitune", 80, 120);
  g.font = "700 120px 'Inter Tight', sans-serif"; const words = opts.title.split(" "); let line = "", y = 420;
  words.forEach(w => { const t = line + w + " "; if (g.measureText(t).width > 900 && line) { g.fillText(line, 80, y); line = w + " "; y += 130; } else line = t; }); g.fillText(line, 80, y);
  g.font = "500 48px 'Inter Tight', sans-serif"; g.fillStyle = "#C0DAC6"; g.fillText(opts.line, 80, y + 100);
  g.fillStyle = "#DB832A"; g.font = "700 64px 'Inter Tight', sans-serif"; g.fillText(`${opts.streak} day streak`, 80, 940);
  g.fillStyle = "#B7A7D9"; g.font = "500 40px 'Inter Tight', sans-serif"; g.fillText(opts.level, 80, 1000);
  return new Promise(res => c.toBlob(b => res(b!), "image/png"));
}
export const personColor = (i: number) => ["var(--f-primode)", "var(--f-flexion)", "var(--f-grain)", "var(--f-cap)", "var(--f-anchory)"][i % 5];
export type { Person };
