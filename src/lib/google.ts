// "Continue with Google" button, using Google's own sign-in script. The browser gets a signed ID token and our server checks it.
let loading: Promise<void> | null = null;
export function loadGoogle(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve(); // eslint-disable-line @typescript-eslint/no-explicit-any
  return (loading ||= new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = () => res(); s.onerror = () => { loading = null; rej(new Error("Could not load Google.")); }; document.head.appendChild(s); }));
}
let cfg: Promise<string | null> | null = null;
export const googleClientId = () => (cfg ||= fetch("/api/config").then(r => r.json()).then(j => (j.googleClientId as string | null) ?? null).catch(() => null));
export async function renderGoogleButton(el: HTMLElement, clientId: string, text: "signup_with" | "signin_with", onCredential: (credential: string) => void) {
  await loadGoogle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google.accounts.id; g.initialize({ client_id: clientId, callback: (r: { credential: string }) => onCredential(r.credential), ux_mode: "popup" });
  g.renderButton(el, { type: "standard", theme: "outline", size: "large", text, shape: "pill", logo_alignment: "left", width: Math.min(380, el.clientWidth || 320) });
}
