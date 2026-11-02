// A small GPT (nanoGPT architecture) written from scratch in plain JavaScript, with hand-written backpropagation,
// because PyTorch cannot run in this environment. Same design as nanoGPT's model.py: learned token + position embeddings,
// pre-LayerNorm blocks (no bias), causal multi-head self-attention, 4x MLP, final LayerNorm, output weights tied to the token embedding.
// One difference: GELU uses the tanh approximation (the browser runtime uses the same one).
export function layout(cfg) {
  const { V, T, C, L } = cfg; const o = {}; let n = 0; const add = (k, size) => { o[k] = n; n += size; };
  add("wte", V * C); add("wpe", T * C);
  for (let l = 0; l < L; l++) { add(`g1_${l}`, C); add(`qkv_${l}`, C * 3 * C); add(`proj_${l}`, C * C); add(`g2_${l}`, C); add(`fc_${l}`, C * 4 * C); add(`fp_${l}`, 4 * C * C); }
  add("gf", C); o.total = n; return o;
}
export const countParams = cfg => layout(cfg).total;
export function initParams(cfg, rand) {
  const o = layout(cfg), p = new Float32Array(o.total); const { V, T, C, L } = cfg;
  const g = () => { let u = 0, v = 0; while (!u) u = rand(); v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const fill = (k, n, sd) => { for (let i = 0; i < n; i++) p[o[k] + i] = g() * sd; };
  fill("wte", V * C, 0.02); fill("wpe", T * C, 0.02);
  for (let l = 0; l < L; l++) { p.fill(1, o[`g1_${l}`], o[`g1_${l}`] + C); p.fill(1, o[`g2_${l}`], o[`g2_${l}`] + C); fill(`qkv_${l}`, C * 3 * C, 0.02); fill(`proj_${l}`, C * C, 0.02 / Math.sqrt(2 * L)); fill(`fc_${l}`, C * 4 * C, 0.02); fill(`fp_${l}`, 4 * C * C, 0.02 / Math.sqrt(2 * L)); }
  p.fill(1, o.gf, o.gf + C); return p;
}
// C(n x m) += A(n x k) B(k x m)
function mm(A, B, Cc, n, k, m) { for (let i = 0; i < n; i++) { const ai = i * k, ci = i * m; for (let p = 0; p < k; p++) { const a = A[ai + p]; if (a === 0) continue; const bp = p * m; for (let j = 0; j < m; j++) Cc[ci + j] += a * B[bp + j]; } } }
// dA(n x k) += dC(n x m) B^T   where B is (k x m)
function mmBT(dC, B, dA, n, k, m) { for (let i = 0; i < n; i++) { const di = i * m, ai = i * k; for (let p = 0; p < k; p++) { const bp = p * m; let s = 0; for (let j = 0; j < m; j++) s += dC[di + j] * B[bp + j]; dA[ai + p] += s; } } }
// dB(k x m) += A^T(k x n) dC(n x m)
function mmAT(A, dC, dB, n, k, m) { for (let i = 0; i < n; i++) { const ai = i * k, di = i * m; for (let p = 0; p < k; p++) { const a = A[ai + p]; if (a === 0) continue; const bp = p * m; for (let j = 0; j < m; j++) dB[bp + j] += a * dC[di + j]; } } }
const K0 = Math.sqrt(2 / Math.PI);
const gelu = x => 0.5 * x * (1 + Math.tanh(K0 * (x + 0.044715 * x * x * x)));
const dgelu = x => { const u = K0 * (x + 0.044715 * x * x * x), t = Math.tanh(u); return 0.5 * (1 + t) + 0.5 * x * (1 - t * t) * K0 * (1 + 3 * 0.044715 * x * x); };
function lnFwd(x, g, y, xh, rs, n, C) { for (let i = 0; i < n; i++) { const b = i * C; let mu = 0; for (let j = 0; j < C; j++) mu += x[b + j]; mu /= C; let v = 0; for (let j = 0; j < C; j++) { const d = x[b + j] - mu; v += d * d; } const r = 1 / Math.sqrt(v / C + 1e-5); rs[i] = r; for (let j = 0; j < C; j++) { const h = (x[b + j] - mu) * r; xh[b + j] = h; y[b + j] = h * g[j]; } } }
function lnBwd(dy, g, xh, rs, dx, dg, n, C) { for (let i = 0; i < n; i++) { const b = i * C; let a = 0, c = 0; for (let j = 0; j < C; j++) { const dh = dy[b + j] * g[j]; dg[j] += dy[b + j] * xh[b + j]; a += dh; c += dh * xh[b + j]; } a /= C; c /= C; const r = rs[i]; for (let j = 0; j < C; j++) { const dh = dy[b + j] * g[j]; dx[b + j] += r * (dh - a - xh[b + j] * c); } } }

/** Forward + backward on one sequence. ids: token ids (length n+1). mask[t] = 1 where the target ids[t+1] counts for the loss.
 *  Adds into grad (if given) and returns the summed loss and the number of counted targets. */
export function lossAndGrad(cfg, P, grad, ids, mask) {
  const { V, C, L, H } = cfg; const o = layout(cfg); const n = ids.length - 1; const hs = C / H; const sc = 1 / Math.sqrt(hs);
  const F = n * C; const ar = k => new Float32Array(k);
  const X = [ar(F)], act = [];
  for (let t = 0; t < n; t++) for (let j = 0; j < C; j++) X[0][t * C + j] = P[o.wte + ids[t] * C + j] + P[o.wpe + t * C + j];
  for (let l = 0; l < L; l++) {
    const a = { xh1: ar(F), r1: ar(n), a1: ar(F), qkv: ar(n * 3 * C), att: ar(H * n * n), yc: ar(F), h2: ar(F), xh2: ar(F), r2: ar(n), a2: ar(F), f: ar(n * 4 * C), g: ar(n * 4 * C), out: ar(F) };
    const x = X[l], g1 = P.subarray(o[`g1_${l}`], o[`g1_${l}`] + C), g2 = P.subarray(o[`g2_${l}`], o[`g2_${l}`] + C);
    lnFwd(x, g1, a.a1, a.xh1, a.r1, n, C); mm(a.a1, P.subarray(o[`qkv_${l}`]), a.qkv, n, C, 3 * C);
    for (let h = 0; h < H; h++) for (let t = 0; t < n; t++) {
      const qo = t * 3 * C + h * hs, ab = (h * n + t) * n; let mx = -1e30;
      for (let s = 0; s <= t; s++) { const ko = s * 3 * C + C + h * hs; let d = 0; for (let j = 0; j < hs; j++) d += a.qkv[qo + j] * a.qkv[ko + j]; d *= sc; a.att[ab + s] = d; if (d > mx) mx = d; }
      let z = 0; for (let s = 0; s <= t; s++) { const e = Math.exp(a.att[ab + s] - mx); a.att[ab + s] = e; z += e; } for (let s = 0; s <= t; s++) a.att[ab + s] /= z;
      for (let s = 0; s <= t; s++) { const w = a.att[ab + s], vo = s * 3 * C + 2 * C + h * hs; for (let j = 0; j < hs; j++) a.yc[t * C + h * hs + j] += w * a.qkv[vo + j]; }
    }
    const pr = ar(F); mm(a.yc, P.subarray(o[`proj_${l}`]), pr, n, C, C); for (let i = 0; i < F; i++) a.h2[i] = x[i] + pr[i];
    lnFwd(a.h2, g2, a.a2, a.xh2, a.r2, n, C); mm(a.a2, P.subarray(o[`fc_${l}`]), a.f, n, C, 4 * C); for (let i = 0; i < a.f.length; i++) a.g[i] = gelu(a.f[i]);
    const mo = ar(F); mm(a.g, P.subarray(o[`fp_${l}`]), mo, n, 4 * C, C); for (let i = 0; i < F; i++) a.out[i] = a.h2[i] + mo[i];
    act.push(a); X.push(a.out);
  }
  const xf = X[L], zf = ar(F), xhf = ar(F), rf = ar(n); lnFwd(xf, P.subarray(o.gf, o.gf + C), zf, xhf, rf, n, C);
  let loss = 0, cnt = 0; const dz = ar(F), wte = P.subarray(o.wte, o.wte + V * C); const lg = new Float32Array(V);
  for (let t = 0; t < n; t++) {
    if (!mask[t]) continue; let mx = -1e30; for (let v = 0; v < V; v++) { let d = 0; const wb = v * C, zb = t * C; for (let j = 0; j < C; j++) d += zf[zb + j] * wte[wb + j]; lg[v] = d; if (d > mx) mx = d; }
    let z = 0; for (let v = 0; v < V; v++) { lg[v] = Math.exp(lg[v] - mx); z += lg[v]; } const y = ids[t + 1]; loss += -Math.log(lg[y] / z + 1e-12); cnt++;
    if (grad) for (let v = 0; v < V; v++) { const dl = lg[v] / z - (v === y ? 1 : 0); if (dl === 0) continue; const wb = v * C, zb = t * C; for (let j = 0; j < C; j++) { dz[zb + j] += dl * wte[wb + j]; grad[o.wte + wb + j] += dl * zf[zb + j]; } }
  }
  if (!grad) return { loss, cnt };
  let dx = ar(F); lnBwd(dz, P.subarray(o.gf, o.gf + C), xhf, rf, dx, grad.subarray(o.gf, o.gf + C), n, C);
  for (let l = L - 1; l >= 0; l--) {
    const a = act[l], dh2 = ar(F), dg = ar(n * 4 * C), df = ar(n * 4 * C), da2 = ar(F);
    dh2.set(dx); // residual
    mmAT(a.g, dx, grad.subarray(o[`fp_${l}`]), n, 4 * C, C); mmBT(dx, P.subarray(o[`fp_${l}`]), dg, n, 4 * C, C);
    for (let i = 0; i < df.length; i++) df[i] = dg[i] * dgelu(a.f[i]);
    mmAT(a.a2, df, grad.subarray(o[`fc_${l}`]), n, C, 4 * C); mmBT(df, P.subarray(o[`fc_${l}`]), da2, n, C, 4 * C);
    lnBwd(da2, P.subarray(o[`g2_${l}`], o[`g2_${l}`] + C), a.xh2, a.r2, dh2, grad.subarray(o[`g2_${l}`], o[`g2_${l}`] + C), n, C);
    const dyc = ar(F); mmAT(a.yc, dh2, grad.subarray(o[`proj_${l}`]), n, C, C); mmBT(dh2, P.subarray(o[`proj_${l}`]), dyc, n, C, C);
    const dqkv = ar(n * 3 * C);
    for (let h = 0; h < H; h++) for (let t = 0; t < n; t++) {
      const ab = (h * n + t) * n, qo = t * 3 * C + h * hs; const datt = new Float32Array(t + 1);
      for (let s = 0; s <= t; s++) { const vo = s * 3 * C + 2 * C + h * hs; let d = 0; for (let j = 0; j < hs; j++) { d += dyc[t * C + h * hs + j] * a.qkv[vo + j]; dqkv[vo + j] += a.att[ab + s] * dyc[t * C + h * hs + j]; } datt[s] = d; }
      let dot = 0; for (let s = 0; s <= t; s++) dot += datt[s] * a.att[ab + s];
      for (let s = 0; s <= t; s++) { const ds = a.att[ab + s] * (datt[s] - dot) * sc, ko = s * 3 * C + C + h * hs; for (let j = 0; j < hs; j++) { dqkv[qo + j] += ds * a.qkv[ko + j]; dqkv[ko + j] += ds * a.qkv[qo + j]; } }
    }
    const da1 = ar(F); mmAT(a.a1, dqkv, grad.subarray(o[`qkv_${l}`]), n, C, 3 * C); mmBT(dqkv, P.subarray(o[`qkv_${l}`]), da1, n, C, 3 * C);
    const dxn = ar(F); dxn.set(dh2); lnBwd(da1, P.subarray(o[`g1_${l}`], o[`g1_${l}`] + C), a.xh1, a.r1, dxn, grad.subarray(o[`g1_${l}`], o[`g1_${l}`] + C), n, C); dx = dxn;
  }
  for (let t = 0; t < n; t++) for (let j = 0; j < C; j++) { const d = dx[t * C + j]; grad[o.wte + ids[t] * C + j] += d; grad[o.wpe + t * C + j] += d; }
  return { loss, cnt };
}
