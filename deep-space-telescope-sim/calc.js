// ===== 심우주 망원경 계산 모듈 (순수 수학, DOM/Three 무관) =====
export const SQ3 = Math.sqrt(3);
export const PHYS = { jwstArea: 25.4, hubbleArea: 4.0, massFactor: 8.8 };

// 개략 값(공개 자료 기반 근사치): 설계 전 반드시 확인 필요
export const LAUNCHERS = {
  fh:  { name: 'Falcon Heavy (페어링 5.2m)', usable: 4.6 },
  a6:  { name: 'Ariane 6 (페어링 5.4m)', usable: 4.6 },
  sls: { name: 'SLS Block 1B (페어링 8.4m)', usable: 7.5 },
  ss:  { name: 'Starship (적재함 ~8m급)', usable: 7.5 },
  ksl3:{ name: '국내 차세대 발사체(가정 · 가용폭 4.0m)', usable: 4.0 },
  ng:  { name: 'New Glenn 7m 페어링', usable: 6.4 },
  ss9: { name: 'Starship 9m 페어링(HWO 가정)', usable: 8.4 },
};

// HWO 탐색 구성(EAC) — Feinberg 등, arXiv:2601.11803 표를 개략 반영(구경은 외접 기준 환산, 근사)
export const EACS = {
  eac1: { name: 'EAC1 · 오프액시스 6m(내접), 날개형', D: 7.2, seg: 1.0, fn: 1.5, launcher: 'ng', massCap: 25 },
  eac4: { name: 'EAC4 · 오프액시스 6.5–7m, 고정 주경', D: 7.8, seg: 1.1, fn: 1.5, launcher: 'ss9', massCap: 25 },
  eac5: { name: 'EAC5 · 오프액시스 8–8.5m, 전개형', D: 9.4, seg: 1.02, fn: 1.5, launcher: 'ss9', massCap: 37.5 },
};

export const PRESETS = {
  A: { D: 6.6, seg: 1.32, fn: 1.2, delta: 7, bfrac: 0.45, lambda: 2.0, dens: 26, hole: true, launcher: 'fh' },
  B: { D: 20, seg: 1.8, fn: 1.2, delta: 7, bfrac: 0.35, lambda: 0.6, dens: 15, hole: true, launcher: 'ss' },
  C: { D: 7.2, seg: 1.0, fn: 1.5, delta: 7, bfrac: 0.35, lambda: 0.5, dens: 40, hole: false, launcher: 'ng', eac: 'eac1', massCap: 25 },
};

export const GAP = 0.02;

// 육각 분할거울 배치. 이웃 방향이 z축(열)과 평행하도록 JWST와 같은 모양.
export function hexLayout(n, s, gap, hole) {
  const p = s + gap, segs = [];
  for (let q = -n; q <= n; q++) {
    for (let r = -n; r <= n; r++) {
      const t = -q - r;
      if (Math.abs(t) > n) continue;
      if (hole && q === 0 && r === 0) continue;
      segs.push({ q, r, x: p * SQ3 / 2 * q, z: p * (r + q / 2), ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(t)) });
    }
  }
  return segs;
}

export function hexVerts(x, z, s) {
  const R = s / SQ3, v = [];
  for (let k = 0; k < 6; k++) v.push([x + R * Math.cos(k * Math.PI / 3), z + R * Math.sin(k * Math.PI / 3)]);
  return v;
}

export function apertureOf(segs, s) {
  let m = 0;
  for (const g of segs) for (const [vx, vz] of hexVerts(g.x, g.z, s)) m = Math.max(m, Math.hypot(vx, vz));
  return 2 * m;
}

export function ringsForAperture(D, s, gap, hole) {
  let best = 1;
  for (let n = 1; n <= 11; n++) {
    const d = apertureOf(hexLayout(n, s, gap, hole), s);
    if (d <= D * 1.06 || n === 1) best = n; else break;
  }
  return best;
}

export const sag = (x, z, f) => (x * x + z * z) / (4 * f);

// 광학계 구성. A/B: 카세그레인(주경 포물면 + 쌍곡면 부경), C: 오프액시스 포물면 + 초점
export function makeOptics(mode, f, Deff, deltaFrac, bfrac) {
  if (mode === 'C') return { cass: false, f, F: [0, f, 0], topY: f + 0.5 * Deff, x0: 0.72 * Deff };
  const Delta = deltaFrac * f, d = f - Delta, b = bfrac * Deff;
  const s2 = d + b, M = s2 / Delta;
  return { cass: true, f, d, Delta, b, s2, M, k: s2 - Delta, F1: [0, f, 0], F2: [0, -b, 0], topY: d + 0.5 * Deff, x0: 0 };
}

const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// (x,z)에서 입사한 평행광선 추적. 경로점 배열 반환(실패 시 null)
export function traceRay(x, z, opt) {
  const P = [x, sag(x, z, opt.f), z];
  const top = [x, opt.topY, z];
  if (!opt.cass) return [top, P, opt.F.slice()];
  const { F1, F2, k } = opt;
  const g = X => dist3(X, F2) - dist3(X, F1) - k;
  const at = t => [P[0] + (F1[0] - P[0]) * t, P[1] + (F1[1] - P[1]) * t, P[2] + (F1[2] - P[2]) * t];
  if (g(at(0)) > 0 || g(at(1)) < 0) return null;
  let lo = 0, hi = 1;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (g(at(m)) < 0) lo = m; else hi = m; }
  const X = at((lo + hi) / 2);
  return [top, P, X, F2.slice()];
}

// 부경 반경 = 모든 거울 꼭짓점에서의 반사 지점 중 최대 반경
export function secondaryRadius(segs, s, opt) {
  let m = 0;
  for (const g of segs) {
    const pts = hexVerts(g.x, g.z, s).concat([[g.x, g.z]]);
    for (const [vx, vz] of pts) {
      const path = traceRay(vx, vz, opt);
      if (path) m = Math.max(m, Math.hypot(path[2][0], path[2][2]));
    }
  }
  return Math.max(0.02, m * 1.03);
}

export function buildStats(P, segs, Deff, opt, rs) {
  const N = segs.length;
  const tile = 0.5 * SQ3 * P.seg * P.seg;
  const Atiles = N * tile;
  const obs = opt.cass ? Math.PI * rs * rs + 4 * 0.04 * Math.max(0, Deff / 2 - rs) : 0;
  const Aeff = Math.max(0, Atiles - obs);
  const lam = P.lambda * 1e-6;
  const theta = 1.22 * lam / Deff;               // rad
  const mas = theta * 206264.806 * 1000;         // 밀리초각
  const wfe = P.lambda * 1000 / 14;              // nm, Strehl≈0.8 (λ/14 rms)
  const mMirror = Atiles * P.dens;
  const mTotal = mMirror * PHYS.massFactor;
  return {
    N, Atiles, Aeff, obsFrac: Atiles > 0 ? obs / Atiles : 0, mas, wfe, mMirror, mTotal,
    vsJWST: Aeff / PHYS.jwstArea, vsHubble: Aeff / PHYS.hubbleArea,
    fEff: opt.cass ? opt.M * opt.f / Deff : opt.f / Deff, M: opt.M || 1,
  };
}

// 발사체 적합성: A(접이식)는 접힌 폭, C는 접지 않는 가정(주경 전체 폭), B는 모듈(분할거울 1장) 기준
export function fitCheck(mode, P, Deff, xh, N) {
  const usable = LAUNCHERS[P.launcher].usable;
  if (mode === 'A') {
    const w = 2 * (xh + 0.4);
    return { kind: 'fold', width: w, usable, ok: w <= usable };
  }
  if (mode === 'C') return { kind: 'rigid', width: Deff, usable, ok: Deff <= usable };
  const tooBig = P.seg + 0.2 > usable;
  const nPer = tooBig ? 0 : Math.max(1, Math.floor(0.6 * Math.PI * (usable / 2) ** 2 / (0.5 * SQ3 * P.seg * P.seg)) * 3);
  return { kind: 'asm', usable, ok: !tooBig, nPer, launches: tooBig ? Infinity : Math.ceil(N / nPer) + 1 };
}

// ===== 별 회절상(PSF) · 분할경 위상 오차 (Fraunhofer 근사: 동공 → FFT) =====
// 근거: Leboulleux 외(arXiv:2608.16479) — 분할거울 piston/tip/tilt 오차는 분할 1장의 PSF가 만드는 "저차 포락선"
//   (첫 영점 1.22·N·λ/D, N = 동공 지름 방향 분할 수)에 곱해져 나타남. Sahoo 외(arXiv:2607.28393) — 분할경 허용 오차는 pm 단위.
export function fft1(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = 2 * Math.PI / len * (inv ? 1 : -1), wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < h; k++) {
        const a = i + k, b = a + h;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

export function fft2(re, im, N, inv) {
  const rr = new Float64Array(N), ri = new Float64Array(N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) { rr[x] = re[y * N + x]; ri[x] = im[y * N + x]; }
    fft1(rr, ri, inv);
    for (let x = 0; x < N; x++) { re[y * N + x] = rr[x]; im[y * N + x] = ri[x]; }
  }
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) { rr[y] = re[y * N + x]; ri[y] = im[y * N + x]; }
    fft1(rr, ri, inv);
    for (let y = 0; y < N; y++) { re[y * N + x] = rr[y]; im[y * N + x] = ri[y]; }
  }
}

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// 동공 진폭(A)과 위상(φ, rad) 격자. segs 좌표는 동공 중심 기준(오프액시스는 호출 전에 x0를 빼 둘 것).
// o: { N, Dpx, lambdaNm, pistonNm, tiptiltNm, seed, struts, strutW }  — 오차는 모두 "파면(OPD) rms", nm
export function makePupil(segs, s, Deff, o) {
  const N = o.N || 512, dx = Deff / (o.Dpx || 160), half = s / 2, R = s / SQ3;
  const A = new Float64Array(N * N), W = new Float64Array(N * N);
  const rnd = mulberry32(o.seed == null ? 7 : o.seed);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  const k = 2 * Math.PI / o.lambdaNm;
  const nx = [Math.cos(Math.PI / 6), 0, -Math.cos(Math.PI / 6)], nz = [Math.sin(Math.PI / 6), 1, Math.sin(Math.PI / 6)];
  for (const g of segs) {
    const pis = (o.pistonNm || 0) * gauss();
    const tx = (o.tiptiltNm || 0) * gauss() / R, tz = (o.tiptiltNm || 0) * gauss() / R;  // 분할거울 모서리(외접 반경)에서의 OPD 편차 = tiptiltNm rms
    const i0 = Math.floor((g.x - R) / dx + N / 2), i1 = Math.ceil((g.x + R) / dx + N / 2);
    const j0 = Math.floor((g.z - R) / dx + N / 2), j1 = Math.ceil((g.z + R) / dx + N / 2);
    for (let j = Math.max(0, j0); j <= Math.min(N - 1, j1); j++) {
      for (let i = Math.max(0, i0); i <= Math.min(N - 1, i1); i++) {
        const px = (i - N / 2) * dx - g.x, pz = (j - N / 2) * dx - g.z;
        if (Math.abs(px * nx[0] + pz * nz[0]) > half || Math.abs(pz) > half || Math.abs(px * nx[2] + pz * nz[2]) > half) continue;
        A[j * N + i] = 1; W[j * N + i] = k * (pis + tx * px + tz * pz);
      }
    }
  }
  if (o.struts) {   // 부경 지지대 3개(120° 간격) — 그림자로 빼냄
    const w = Math.max(o.strutW || 0.1, dx) / 2;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      if (!A[j * N + i]) continue;
      const px = (i - N / 2) * dx, pz = (j - N / 2) * dx;
      for (let a = 0; a < 3; a++) {
        const th = Math.PI / 2 + a * 2 * Math.PI / 3, ux = Math.cos(th), uz = Math.sin(th);
        if (px * ux + pz * uz > 0 && Math.abs(-px * uz + pz * ux) < w) { A[j * N + i] = 0; break; }
      }
    }
  }
  return { N, A, W, dx };
}

// 동공 → 초점면 세기(무수차 최대값 = 1로 정규화). 반환 img 는 FFT 중심(0,0)을 N/2로 옮긴 배열
export function psfFromPupil(pup, aberrated) {
  const { N, A, W } = pup, re = new Float64Array(N * N), im = new Float64Array(N * N);
  let sumA = 0, cr = 0, ci = 0;
  for (let q = 0; q < N * N; q++) {
    if (!A[q]) continue;
    const ph = aberrated ? W[q] : 0;
    re[q] = Math.cos(ph); im[q] = Math.sin(ph); sumA++; cr += re[q]; ci += im[q];
  }
  fft2(re, im, N, false);
  const img = new Float32Array(N * N), norm = 1 / (sumA * sumA);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx = (x + N / 2) % N, sy = (y + N / 2) % N, q = sy * N + sx;
    img[y * N + x] = (re[q] * re[q] + im[q] * im[q]) * norm;
  }
  return { img, strehl: (cr * cr + ci * ci) * norm, area: sumA };
}

// 중심 기준 반경 r(λ/D 단위, 폭 ±hw)의 방위각 평균 세기. 격자 간격 = Dpx/N (λ/D / 픽셀)
export function radialMean(img, N, Dpx, r, hw = 0.5) {
  const sc = Dpx / N, c = N / 2; let s = 0, n = 0;
  const m = Math.ceil((r + hw) / sc) + 1;
  for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) {
    const rr = Math.hypot(x, y) * sc;
    if (rr >= r - hw && rr <= r + hw) { s += img[(c + y) * N + c + x]; n++; }
  }
  return n ? s / n : 0;
}

// 지름 방향 분할 수(링 n, 중앙 포함): 2n+1. 수동 강건 조건: N ≤ IWA(λ/D) — Leboulleux 외(2026)
export const segsAcross = n => 2 * n + 1;
// 분할 오차 포락선의 첫 영점 반경(λ/D): 1.22·N
export const envelopeRadius = n => 1.22 * segsAcross(n);

// 문헌 기준값(비교용)
export const PHASING_REF = [
  { name: 'JWST 분할 정렬 달성(≈50 nm rms)', nm: 50 },
  { name: 'HWO 코로나그래프 목표(≈10 pm rms)', nm: 0.01 },
];

// ===== 이상적 코로나그래프(Cavarroc 외 2006) — 무수차 별빛을 완전히 제거하고 위상 오차로 생긴 스펙클만 남김 =====
// E_after = A·(e^{iφ} − ⟨e^{iφ}⟩_A). 세기는 가리지 않은 별의 최대값으로 정규화(= 대비). 실제 APLC의 설계 바닥(~10⁻¹¹)과 아포다이저 효과는 포함하지 않음.
export function coronagraphFromPupil(pup) {
  const { N, A, W } = pup, re = new Float64Array(N * N), im = new Float64Array(N * N);
  let sumA = 0, cr = 0, ci = 0;
  for (let q = 0; q < N * N; q++) if (A[q]) { sumA++; cr += Math.cos(W[q]); ci += Math.sin(W[q]); }
  cr /= sumA; ci /= sumA;
  for (let q = 0; q < N * N; q++) if (A[q]) { re[q] = Math.cos(W[q]) - cr; im[q] = Math.sin(W[q]) - ci; }
  fft2(re, im, N, false);
  const img = new Float32Array(N * N), norm = 1 / (sumA * sumA);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const q = ((y + N / 2) % N) * N + (x + N / 2) % N;
    img[y * N + x] = (re[q] * re[q] + im[q] * im[q]) * norm;
  }
  return { img };
}

// 고리 영역 [r0, r1] (λ/D) 평균 세기 — 암부 평균 대비
export function annulusMean(img, N, Dpx, r0, r1) {
  const sc = Dpx / N, c = N / 2, m = Math.ceil(r1 / sc) + 1; let s = 0, n = 0;
  for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) {
    const r = Math.hypot(x, y) * sc;
    if (r >= r0 && r <= r1) { s += img[(c + y) * N + c + x]; n++; }
  }
  return n ? s / n : 0;
}

// 작은 위상 오차에서 대비 ∝ σ² → 목표 대비를 맞추는 허용 오차 배율
export const toleranceFor = (sigma, contrast, target) => contrast > 0 ? sigma * Math.sqrt(target / contrast) : Infinity;
