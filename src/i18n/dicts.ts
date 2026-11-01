// Loaded only when someone picks a language other than English, so English users never download these dictionaries.
import { ROWS1 } from "./entries1";
import { ROWS2 } from "./entries2";
import { ROWS3 } from "./entries3";
import { ROWS4 } from "./entries4";
import { ROWS5 } from "./entries5";
import { ROWS6 } from "./entries6";
import { ROWS7 } from "./entries7";
import { ROWS8 } from "./entries8";
import { ROWS9 } from "./entries9";
import { ROWS10 } from "./entries10";
import { ROWS11 } from "./entries11";
import { ROWS12 } from "./entries12";
import { ROWS13 } from "./entries13";
import { ROWS14, NE14 } from "./entries14";
import { EXTRA14, ROWS15 } from "./patterns14";
import * as NE2 from "./lang_ne2";
import * as SI from "./lang_si";
import * as DZ from "./lang_dz";
import * as NE from "./lang_ne";
import type { Lang } from "./index";
type New = "si" | "dz" | "ne";
const IDX = { zh: 1, fa: 2, id: 3 } as const;
export const entries: Record<Exclude<Lang, "en">, Record<string, string>> = { zh: {}, fa: {}, id: {}, si: SI.DICT, dz: DZ.DICT, ne: { ...NE.DICT, ...NE2.DICT, ...NE14 } };
export const PATS: Record<New, Record<string, string>> = { si: SI.PAT, dz: DZ.PAT, ne: NE.PAT };
for (const row of [...ROWS1, ...ROWS2, ...ROWS3, ...ROWS4, ...ROWS5, ...ROWS6, ...ROWS7, ...ROWS8, ...ROWS9, ...ROWS10, ...ROWS11, ...ROWS12, ...ROWS13, ...ROWS14]) for (const l of ["zh", "fa", "id"] as const) entries[l][row[0]] = row[IDX[l]];
for (const r of ROWS15) { entries.zh[r[0]] = r[1]; entries.fa[r[0]] = r[2]; entries.id[r[0]] = r[3]; entries.ne[r[0]] = r[4]; }
export { EXTRA14 };
