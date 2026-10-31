/** Lagomo the rabbit with many faces, like a friend whose mood you can read at a glance. Brand colours only. */
export type Face = "calm" | "happy" | "proud" | "sleepy" | "curious" | "cheer" | "cosy" | "love" | "wink" | "gentle" | "sparkle" | "sleep";
export type Wear = "none" | "scarf" | "glasses" | "flower" | "cap" | "crown";
export const FACES: Face[] = ["calm", "happy", "proud", "curious", "cheer", "cosy", "love", "wink", "gentle", "sparkle", "sleepy", "sleep"];
/** Outfits are earned by starting things and are never taken away. */
export const WARDROBE: { id: Wear; name: string; at: number }[] = [
  { id: "none", name: "Plain", at: 0 }, { id: "scarf", name: "Cosy scarf", at: 3 }, { id: "glasses", name: "Study glasses", at: 7 },
  { id: "flower", name: "Spring flower", at: 15 }, { id: "cap", name: "Starter cap", at: 30 }, { id: "crown", name: "Tiny crown", at: 60 },
];
const lav = "hsl(var(--f-grain))", lavDark = "hsl(259 32% 52%)", ink = "hsl(var(--foreground))", blush = "hsl(var(--warning) / .55)", gold = "hsl(var(--warning))";
const arc = (x: number, up: boolean) => <path d={`M${x} 96 q8 ${up ? -10 : 10} 16 0`} stroke={ink} strokeWidth="5" fill="none" strokeLinecap="round" />;
const dot = (x: number, r = 6) => <g><circle cx={x} cy="96" r={r} fill={ink} /><circle cx={x + 2} cy="93" r="2" fill="#fff" /></g>;
const star = (x: number) => <path d={`M${x} 86 l3 7 7 1 -5 5 2 8 -7 -4 -7 4 2 -8 -5 -5 7 -1z`} fill={gold} />;
const heart = (x: number) => <path d={`M${x} 106 c-12 -9 -12 -20 -3 -20 q3 0 3 4 q0 -4 3 -4 c9 0 9 11 -3 20z`} fill="hsl(var(--destructive))" />;
function eyes(f: Face) {
  switch (f) {
    case "happy": case "cheer": case "proud": return <>{arc(78, true)}{arc(106, true)}</>;
    case "sleepy": case "cosy": case "sleep": return <>{arc(78, false)}{arc(106, false)}</>;
    case "curious": return <>{dot(86, 8)}{dot(114, 8)}<path d="M104 80 q10 -6 18 -1" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" /></>;
    case "love": return <>{heart(86)}{heart(114)}</>;
    case "wink": return <>{dot(86)}{arc(106, true)}</>;
    case "sparkle": return <>{star(86)}{star(114)}</>;
    case "gentle": return <>{dot(86)}{dot(114)}<path d="M76 84 q9 -5 16 0 M108 84 q9 -5 16 0" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".7" /></>;
    default: return <>{dot(86)}{dot(114)}</>;
  }
}
function mouth(f: Face) {
  switch (f) {
    case "cheer": case "proud": return <><path d="M88 110 q12 20 24 0 z" fill={ink} /><path d="M94 116 q6 7 12 0" fill="hsl(var(--warning) / .8)" /></>;
    case "happy": case "wink": case "love": case "sparkle": return <path d="M90 112 q10 12 20 0" stroke={ink} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    case "curious": return <ellipse cx="100" cy="116" rx="5" ry="6" fill={ink} />;
    case "sleepy": case "sleep": return <path d="M94 118 q6 4 12 0" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />;
    case "gentle": return <path d="M92 116 q8 6 16 0" stroke={ink} strokeWidth="4" fill="none" strokeLinecap="round" />;
    default: return <path d="M91 113 q9 9 18 0" stroke={ink} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
  }
}
function outfit(w: Wear) {
  switch (w) {
    case "scarf": return <g><path d="M70 142 q30 14 60 0 l-4 14 q-26 10 -52 0z" fill="hsl(var(--primary))" /><path d="M120 150 l8 26 10 -3 -6 -26z" fill="hsl(var(--primary))" /></g>;
    case "glasses": return <g stroke={ink} strokeWidth="3.5" fill="hsl(var(--background) / .25)"><circle cx="86" cy="96" r="13" /><circle cx="114" cy="96" r="13" /><path d="M99 96 h2" /></g>;
    case "flower": return <g transform="translate(128 62)">{[0, 72, 144, 216, 288].map(a => <ellipse key={a} cx="0" cy="-9" rx="6" ry="9" fill="hsl(var(--destructive) / .75)" transform={`rotate(${a})`} />)}<circle r="5" fill={gold} /></g>;
    case "cap": return <g><path d="M58 76 q42 -44 84 0 z" fill="hsl(var(--primary))" /><rect x="54" y="72" width="92" height="8" rx="4" fill="hsl(var(--primary))" /><circle cx="100" cy="46" r="5" fill={gold} /></g>;
    case "crown": return <path d="M72 62 l10 -22 10 14 8 -20 8 20 10 -14 10 22z" fill={gold} stroke="hsl(var(--warning) / .6)" strokeWidth="2" />;
    default: return null;
  }
}
/** `crop` shows just the head and ears, for small spots like the Today card or a widget. */
export function RabbitFace({ face = "calm", wear = "none", size = 120, crop = false, title }: { face?: Face; wear?: Wear; size?: number; crop?: boolean; title?: string }) {
  const up = face === "cheer" || face === "proud";
  return (
    <svg viewBox={crop ? "40 -4 120 160" : "0 0 200 230"} width={size} height={crop ? size * 1.33 : size * 1.15} role="img" aria-label={title ?? "Lagomo the rabbit"} className="overflow-visible">
      <ellipse cx="80" cy="34" rx="15" ry="38" fill={lav} /><ellipse cx="80" cy="38" rx="7" ry="26" fill="hsl(var(--warning) / .35)" />
      <ellipse cx="120" cy="34" rx="15" ry="38" fill={lav} transform={face === "curious" ? "rotate(10 120 70)" : face === "sleepy" || face === "sleep" ? "rotate(18 120 70)" : undefined} /><ellipse cx="120" cy="38" rx="7" ry="26" fill="hsl(var(--warning) / .35)" transform={face === "curious" ? "rotate(10 120 70)" : face === "sleepy" || face === "sleep" ? "rotate(18 120 70)" : undefined} />
      {!crop && <>
        {up ? <><path d="M74 146 L40 102" stroke={lav} strokeWidth="16" strokeLinecap="round" /><circle cx="38" cy="99" r="11" fill={lav} /><path d="M126 146 L160 102" stroke={lav} strokeWidth="16" strokeLinecap="round" /><circle cx="162" cy="99" r="11" fill={lav} /></>
          : <><path d="M72 150 L58 186" stroke={lav} strokeWidth="16" strokeLinecap="round" /><path d="M128 150 L142 186" stroke={lav} strokeWidth="16" strokeLinecap="round" /></>}
        <ellipse cx="100" cy="170" rx="38" ry="42" fill={lav} /><ellipse cx="100" cy="176" rx="22" ry="27" fill="hsl(var(--background))" opacity=".85" />
        <ellipse cx="82" cy="212" rx="15" ry="9" fill={lavDark} /><ellipse cx="118" cy="212" rx="15" ry="9" fill={lavDark} /></>}
      <circle cx="100" cy="98" r="44" fill={lav} />
      {eyes(face)}
      {face !== "sleepy" && face !== "sleep" && <><circle cx="74" cy="110" r="7" fill={blush} /><circle cx="126" cy="110" r="7" fill={blush} /></>}
      {(face === "sleepy" || face === "sleep" || face === "cosy") && <><circle cx="74" cy="110" r="7" fill={blush} /><circle cx="126" cy="110" r="7" fill={blush} /></>}
      {mouth(face)}
      {face === "sleep" && <text x="138" y="62" fontSize="22" fill={ink} opacity=".6" fontWeight="700">z<tspan fontSize="16" dx="4" dy="-12">z</tspan></text>}
      {outfit(wear)}
    </svg>);
}
