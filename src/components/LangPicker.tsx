import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { LANGS, getLang, setLang, type Lang } from "@/i18n";

/** Language choice: English, 简体中文, فارسی, Bahasa Indonesia. Saved on this device. */
export function LangPicker({ className = "" }: { className?: string }) {
  const [l, setL] = useState<Lang>(getLang());
  useEffect(() => { const f = () => setL(getLang()); window.addEventListener("lagomo:lang", f); return () => window.removeEventListener("lagomo:lang", f); }, []);
  return (
    <label className={`glass relative flex h-10 w-10 items-center justify-center gap-1.5 rounded-full text-sm text-muted-foreground sm:h-auto sm:w-auto sm:justify-start sm:py-2 sm:pl-3 sm:pr-2 ${className}`} translate="no">
      <Globe className="h-4 w-4" aria-hidden="true" />
      <select aria-label="Language" value={l} onChange={e => setLang(e.target.value as Lang)} className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent text-transparent opacity-0 outline-none sm:static sm:h-auto sm:w-auto sm:appearance-auto sm:pr-1 sm:text-foreground sm:opacity-100">
        {LANGS.map(x => <option key={x.code} value={x.code}>{x.label}</option>)}
      </select>
    </label>);
}
