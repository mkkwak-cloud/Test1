import * as C from './calc.js';
const eq = (a, b, m, tol = 1e-6) => { if (Math.abs(a - b) > tol) { console.log('FAIL', m, a, b); process.exitCode = 1; } else console.log('ok  ', m, a); };

// 1) 육각 배치: 2링 구멍 있음 = 18장 (JWST)
eq(C.hexLayout(2, 1.32, 0.02, true).length, 18, 'JWST형 분할거울 수');
eq(C.hexLayout(5, 1.8, 0.02, true).length, 90, '5링 구멍 = 90');
eq(C.hexLayout(3, 1.0, 0.02, false).length, 37, '3링 = 37');

// 2) 프리셋별 구경
for (const m of ['A', 'B', 'C']) {
  const P = { ...C.PRESETS[m], mode: m, gap: C.GAP };
  const hole = m === 'C' ? false : P.hole;
  const n = C.ringsForAperture(P.D, P.seg, P.gap, hole);
  const segs = C.hexLayout(n, P.seg, P.gap, hole);
  const Deff = C.apertureOf(segs, P.seg);
  const f = P.fn * Deff;
  const opt = C.makeOptics(m, f, Deff, P.delta / 100, P.bfrac);
  const rs = opt.cass ? C.secondaryRadius(segs, P.seg / C.SQ3, opt) : 0;
  const st = C.buildStats(P, segs, Deff, opt, rs);
  console.log(m, { n, N: segs.length, Deff: +Deff.toFixed(2), f: +f.toFixed(2), rs: +rs.toFixed(3), Aeff: +st.Aeff.toFixed(1), mas: +st.mas.toFixed(1), fEff: +st.fEff.toFixed(1), kg: Math.round(st.mTotal) });
  // 3) 반사 법칙 검증: 부경에서 반사된 광선이 F2로 가고 입사각=반사각
  if (opt.cass) {
    let worst = 0, cnt = 0;
    for (const g of segs) {
      const path = C.traceRay(g.x, g.z, opt);
      if (!path) continue; cnt++;
      const [, P1, X, F2] = path;
      const n1 = [-(X[0]) , 0, -(X[2])]; // placeholder
      // 쌍곡면 법선 = (F1-X)/|F1-X| 와 (F2-X)/|F2-X| 의 합 방향 → 반사 확인
      const u = v => { const l = Math.hypot(...v); return v.map(a => a / l); };
      const sub = (a, b) => a.map((v, i) => v - b[i]);
      const dIn = u(sub(X, P1)), dOut = u(sub(F2, X));
      const nrm = u(u(sub(opt.F1, X)).map((v, i) => v - u(sub(F2, X))[i]));
      const dot = dIn.reduce((s, v, i) => s + v * nrm[i], 0);
      const refl = dIn.map((v, i) => v - 2 * dot * nrm[i]);
      const err = Math.hypot(...refl.map((v, i) => v - dOut[i]));
      worst = Math.max(worst, err);
    }
    console.log('   반사 법칙 최대 오차', worst.toExponential(2), '추적 성공 광선', cnt);
    if (worst > 1e-6) process.exitCode = 1;
  } else {
    const g = segs[5]; const p = C.traceRay(g.x, g.z, opt);
    const sub = (a, b) => a.map((v, i) => v - b[i]);
    const dIn = [0, -1, 0], dOut = sub(p[2], p[1]); const l = Math.hypot(...dOut);
    const nn = [-p[1][0] / (2 * f), 1, -p[1][2] / (2 * f)]; const nl = Math.hypot(...nn);
    const nrm = nn.map(v => v / nl);
    const dot = dIn.reduce((s, v, i) => s + v * nrm[i], 0);
    const refl = dIn.map((v, i) => v - 2 * dot * nrm[i]);
    const err = Math.hypot(...refl.map((v, i) => v - dOut[i] / l));
    console.log('   오프액시스 반사 오차', err.toExponential(2));
    if (err > 1e-9) process.exitCode = 1;
  }
  const fit = C.fitCheck(m, P, Deff, 1.5 * Math.sqrt(3) / 2 * (P.seg + P.gap), segs.length);
  console.log('   적합성', JSON.stringify(fit));
}
