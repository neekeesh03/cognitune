import { PALETTES, type AvatarSpec } from "@/engine/avatar";

const INK = "#101E17";
// face center (x,y), top-of-head point for accessories
const FACE: Record<number, { x: number; y: number; tx: number; ty: number }> = {
  0: { x: 50, y: 58, tx: 50, ty: 26 }, 1: { x: 50, y: 64, tx: 50, ty: 38 }, 2: { x: 50, y: 58, tx: 50, ty: 28 }, 3: { x: 50, y: 66, tx: 50, ty: 38 }, 4: { x: 50, y: 52, tx: 50, ty: 24 },
  5: { x: 50, y: 58, tx: 50, ty: 30 }, 6: { x: 50, y: 52, tx: 50, ty: 22 }, 7: { x: 50, y: 68, tx: 50, ty: 26 }, 8: { x: 50, y: 64, tx: 50, ty: 20 }, 9: { x: 50, y: 58, tx: 50, ty: 30 },
};

function Body({ s, b, i }: { s: number; b: string; i: string }) {
  switch (s) {
    case 0: return <><polygon points="24,36 28,10 46,28" fill={b} /><polygon points="76,36 72,10 54,28" fill={b} /><polygon points="29,31 31,18 40,27" fill={i} /><polygon points="71,31 69,18 60,27" fill={i} /><circle cx="50" cy="58" r="31" fill={b} /></>;
    case 1: return <><ellipse cx="37" cy="30" rx="8.5" ry="23" fill={b} /><ellipse cx="63" cy="30" rx="8.5" ry="23" fill={b} /><ellipse cx="37" cy="30" rx="4" ry="15" fill={i} /><ellipse cx="63" cy="30" rx="4" ry="15" fill={i} /><ellipse cx="50" cy="64" rx="29" ry="27" fill={b} /></>;
    case 2: return <><circle cx="25" cy="32" r="12" fill={b} /><circle cx="75" cy="32" r="12" fill={b} /><circle cx="25" cy="32" r="5.5" fill={i} /><circle cx="75" cy="32" r="5.5" fill={i} /><circle cx="50" cy="58" r="31" fill={b} /><ellipse cx="50" cy="69" rx="14" ry="10.5" fill={i} /></>;
    case 3: return <><ellipse cx="50" cy="66" rx="35" ry="26" fill={b} /><circle cx="31" cy="40" r="13" fill={b} /><circle cx="69" cy="40" r="13" fill={b} /><circle cx="31" cy="40" r="7" fill={i} /><circle cx="69" cy="40" r="7" fill={i} /></>;
    case 4: return <><polygon points="22,38 26,12 44,28" fill={b} /><polygon points="78,38 74,12 56,28" fill={b} /><ellipse cx="50" cy="58" rx="31" ry="34" fill={b} /><ellipse cx="50" cy="74" rx="19" ry="17" fill={i} /></>;
    case 5: return <><path d="M19 42 L26 10 L44 30 Q50 28 56 30 L74 10 L81 42 Q86 66 50 84 Q14 66 19 42Z" fill={b} /><path d="M26 62 Q50 92 74 62 Q50 70 26 62Z" fill={i} /></>;
    case 6: return <path d="M21 82 V50 a29 29 0 0 1 58 0 V82 l-9.7 -8 -9.7 8 -9.6 -8 -9.7 8 -9.7 -8 -9.6 8Z" fill={b} />;
    case 7: return <><rect x="34" y="50" width="32" height="38" rx="15" fill={i} /><path d="M12 54 a38 32 0 0 1 76 0 Z" fill={b} /><circle cx="30" cy="40" r="5" fill={i} /><circle cx="52" cy="32" r="6" fill={i} /><circle cx="70" cy="44" r="4" fill={i} /></>;
    case 8: return <path d="M50 12 C70 36 82 48 82 64 a32 32 0 0 1 -64 0 C18 48 30 36 50 12Z" fill={b} />;
    default: return <><circle cx="32" cy="62" r="20" fill={b} /><circle cx="52" cy="50" r="25" fill={b} /><circle cx="70" cy="62" r="20" fill={b} /><rect x="32" y="60" width="40" height="22" fill={b} /></>;
  }
}
function Eyes({ e, x, y, s }: { e: number; x: number; y: number; s: number }) {
  const ey = s === 3 ? 40 : y - 2, ex = s === 3 ? 18 : 13, big = s === 4 ? 1.35 : 1;
  const L = x - ex, R = x + ex;
  if (s === 3) { return <><circle cx="31" cy="40" r="4.2" fill={INK} /><circle cx="69" cy="40" r="4.2" fill={INK} /><circle cx="32.5" cy="38.5" r="1.3" fill="#fff" /><circle cx="70.5" cy="38.5" r="1.3" fill="#fff" /></>; }
  switch (e) {
    case 0: return <><circle cx={L} cy={ey} r={3.4 * big} fill={INK} /><circle cx={R} cy={ey} r={3.4 * big} fill={INK} /></>;
    case 1: return <><circle cx={L} cy={ey} r={5 * big} fill={INK} /><circle cx={R} cy={ey} r={5 * big} fill={INK} /><circle cx={L + 1.6} cy={ey - 1.8} r={1.7} fill="#fff" /><circle cx={R + 1.6} cy={ey - 1.8} r={1.7} fill="#fff" /></>;
    case 2: return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none"><path d={`M${L - 4} ${ey + 2} Q${L} ${ey - 5} ${L + 4} ${ey + 2}`} /><path d={`M${R - 4} ${ey + 2} Q${R} ${ey - 5} ${R + 4} ${ey + 2}`} /></g>;
    case 3: return <g stroke={INK} strokeWidth="2.8" strokeLinecap="round"><path d={`M${L - 4} ${ey} H${L + 4}`} /><path d={`M${R - 4} ${ey} H${R + 4}`} /></g>;
    case 4: return <g fill={INK}><path d={`M${L} ${ey - 5} l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4z`} /><path d={`M${R} ${ey - 5} l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4 -3.6 -3.6 -1.4 3.6 -1.4z`} /></g>;
    default: return <><circle cx={L} cy={ey} r={3.6} fill={INK} /><path d={`M${R - 4} ${ey + 1} Q${R} ${ey - 5} ${R + 4} ${ey + 1}`} stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" /></>;
  }
}
function Mouth({ m, x, y }: { m: number; x: number; y: number }) {
  const my = y + 10; const st = { stroke: INK, strokeWidth: 2.6, strokeLinecap: "round" as const, fill: "none" };
  switch (m) {
    case 0: return <path d={`M${x - 6} ${my} Q${x} ${my + 7} ${x + 6} ${my}`} {...st} />;
    case 1: return <path d={`M${x - 8} ${my} Q${x - 4} ${my + 6} ${x} ${my} Q${x + 4} ${my + 6} ${x + 8} ${my}`} {...st} />;
    case 2: return <path d={`M${x - 6} ${my - 1} H${x + 6} Q${x + 5} ${my + 8} ${x} ${my + 8} Q${x - 5} ${my + 8} ${x - 6} ${my - 1}Z`} fill={INK} />;
    case 3: return <ellipse cx={x} cy={my + 2} rx={2.8} ry={3.4} fill={INK} />;
    default: return <path d={`M${x - 5} ${my + 1} Q${x} ${my + 3} ${x + 6} ${my - 1}`} {...st} />;
  }
}
function Cheeks({ c, x, y, color }: { c: number; x: number; y: number; color: string }) {
  const cy = y + 6;
  if (c === 0) return <><circle cx={x - 21} cy={cy} r="4.6" fill={color} opacity=".75" /><circle cx={x + 21} cy={cy} r="4.6" fill={color} opacity=".75" /></>;
  if (c === 1) return <g fill={color}><circle cx={x - 22} cy={cy - 1} r="1.4" /><circle cx={x - 18} cy={cy + 2} r="1.4" /><circle cx={x - 24} cy={cy + 3} r="1.4" /><circle cx={x + 22} cy={cy - 1} r="1.4" /><circle cx={x + 18} cy={cy + 2} r="1.4" /><circle cx={x + 24} cy={cy + 3} r="1.4" /></g>;
  if (c === 2) return <g fill={color} opacity=".85"><path d={`M${x - 24} ${cy} q3 -5 5 -1 q2 -4 5 1 q-5 6 -5 6 q0 0 -5 -6z`} /><path d={`M${x + 14} ${cy} q3 -5 5 -1 q2 -4 5 1 q-5 6 -5 6 q0 0 -5 -6z`} /></g>;
  return null;
}
function Acc({ a, tx, ty, color, accent }: { a: number; tx: number; ty: number; color: string; accent: string }) {
  switch (a) {
    case 1: return <g><ellipse cx={tx - 6} cy={ty - 6} rx="8" ry="4" fill="#447D58" transform={`rotate(-30 ${tx - 6} ${ty - 6})`} /><ellipse cx={tx + 6} cy={ty - 8} rx="8" ry="4" fill="#689F7A" transform={`rotate(25 ${tx + 6} ${ty - 8})`} /></g>;
    case 2: return <g transform={`translate(${tx + 22} ${ty + 6})`}><path d="M0 0 L-9 -6 V6Z M0 0 L9 -6 V6Z" fill="#DB832A" /><circle r="3" fill="#F8EACD" /></g>;
    case 3: return <g transform={`translate(${tx - 24} ${ty + 4})`}>{[0, 72, 144, 216, 288].map(d => <circle key={d} cx={5 * Math.cos(d * Math.PI / 180)} cy={5 * Math.sin(d * Math.PI / 180)} r="3.6" fill="#B7A7D9" />)}<circle r="2.8" fill="#DB832A" /></g>;
    case 4: return <g><path d={`M${tx - 20} ${ty + 6} a20 17 0 0 1 40 0Z`} fill="#346747" /><rect x={tx - 21} y={ty + 4} width="42" height="6" rx="3" fill="#2A523A" /><circle cx={tx} cy={ty - 11} r="4.5" fill="#DB832A" /></g>;
    case 5: return null; // glasses drawn with eyes
    case 6: return <path d={`M${tx + 20} ${ty - 6} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z`} fill="#E29F3D" />;
    case 7: return <g><path d={`M${tx} ${ty + 2} V${ty - 12}`} stroke={color} strokeWidth="2.4" strokeLinecap="round" /><circle cx={tx} cy={ty - 14} r="4" fill={accent} /></g>;
    default: return null;
  }
}

export function Avatar({ spec, size = 48, ring = false, title }: { spec: AvatarSpec; size?: number; ring?: boolean; title?: string }) {
  const pal = PALETTES[spec.p % PALETTES.length]; const f = FACE[spec.s % 10];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={title || "Avatar"} className="shrink-0 rounded-full" style={{ background: pal.bg, boxShadow: ring ? "0 0 0 3px hsl(var(--primary))" : undefined }}>
      <g transform="translate(0 4)"><Body s={spec.s % 10} b={pal.body} i={pal.inner} />
        <Cheeks c={spec.c} x={f.x} y={f.y} color={pal.cheek} /><Eyes e={spec.e} x={f.x} y={f.y} s={spec.s % 10} /><Mouth m={spec.m} x={f.x} y={f.y} />
        {spec.a === 5 && <g stroke={INK} strokeWidth="2" fill="none"><circle cx={f.x - 13} cy={f.y - 2} r="8" /><circle cx={f.x + 13} cy={f.y - 2} r="8" /><path d={`M${f.x - 5} ${f.y - 2} H${f.x + 5}`} /></g>}
        <Acc a={spec.a} tx={f.tx} ty={f.ty} color={pal.body} accent={pal.cheek} />
      </g>
    </svg>
  );
}
