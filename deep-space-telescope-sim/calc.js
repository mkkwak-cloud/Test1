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
