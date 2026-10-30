import './lib/migrate'
import { captureInvite } from './lib/invite'
captureInvite();
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); (window as unknown as { __bip?: Event }).__bip = e; });
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
