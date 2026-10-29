import { ChevronLeft, ChevronRight, Shuffle } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AV_RANGE, PALETTES, SPECIES, randomAvatar, type AvatarSpec } from "@/engine/avatar";

const step = (v: number, n: number, d: number) => (v + d + n) % n;
export function AvatarEditor({ value, onChange }: { value: AvatarSpec; onChange: (a: AvatarSpec) => void }) {
  const Row = ({ label, k, text }: { label: string; k: keyof AvatarSpec; text: string }) => (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-foreground/[.05] px-2 py-1.5 text-sm">
      <button aria-label={`Previous ${label}`} className="rounded-full p-1.5 hover:bg-foreground/10" onClick={() => onChange({ ...value, [k]: step(value[k], AV_RANGE[k], -1) })}><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-center"><span className="text-xs text-muted-foreground">{label}</span><br />{text}</span>
      <button aria-label={`Next ${label}`} className="rounded-full p-1.5 hover:bg-foreground/10" onClick={() => onChange({ ...value, [k]: step(value[k], AV_RANGE[k], 1) })}><ChevronRight className="h-4 w-4" /></button>
    </div>);
  return (
    <div className="space-y-3">
      <div className="flex flex-col items-center gap-2"><Avatar spec={value} size={120} title="Your avatar" />
        <button onClick={() => onChange(randomAvatar())} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm hover:bg-foreground/5"><Shuffle className="h-4 w-4" />Surprise me</button></div>
      <div className="grid grid-cols-2 gap-2">
        <Row label="Friend" k="s" text={SPECIES[value.s]} /><Row label="Colour" k="p" text={`Style ${value.p + 1}`} />
        <Row label="Eyes" k="e" text={`Style ${value.e + 1}`} /><Row label="Smile" k="m" text={`Style ${value.m + 1}`} />
        <Row label="Extra" k="a" text={value.a === 0 ? "None" : `Style ${value.a}`} /><Row label="Cheeks" k="c" text={`Style ${value.c + 1}`} />
      </div>
      <p className="text-center text-xs text-muted-foreground">Every avatar is one of a kind. If someone already has yours, we will ask you to tweak it.</p>
    </div>);
}
