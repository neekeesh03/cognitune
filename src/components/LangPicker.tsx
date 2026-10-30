import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { LANGS, getLang, setLang, type Lang } from "@/i18n";

/** Language choice: English, 简体中文, فارسی, Bahasa Indonesia. Saved on this device. */
export function LangPicker({ className = "" }: { className?: string }) {
  const [l, setL] = useState<Lang>(getLang());
  useEffect(() => { const f = () => setL(getLang()); window.addEventListener("lagomo:lang", f); return () => window.removeEventListener("lagomo:lang", f); }, []);
  return (
    <label className={`glass flex items-center gap-1.5 rounded-full py-2 pl-3 pr-2 text-sm text-muted-foreground ${className}`} translate="no">
      <Globe className="h-4 w-4" aria-hidden="true" />
      <select aria-label="Language" value={l} onChange={e => setLang(e.target.value as Lang)} className="cursor-pointer bg-transparent pr-1 text-foreground outline-none">
        {LANGS.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}
      </select>
    </label>);
}
