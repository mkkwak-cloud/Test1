# HANDOFF

> **2026-10-09: 망원경 시뮬레이터는 mkkwak-cloud/solarsystem 저장소로 통합됨** (telescope.html · src/telescope/ · models/jwst/). 앞으로 개발은 그쪽에서 한다. 이 폴더는 원본 기록·Claude 아티팩트 빌드용으로 남김.

## 현재 상태 (2026-10-09)
- `deep-space-telescope-sim/` 폴더에 심우주 망원경 설계·3D 시뮬레이터를 올림 (Claude 앱 세션에서 개발한 것을 Claude Code로 인계).
- 모드: 접이식 전개형 / 우주 조립형 / HWO형 / 제임스웹 실사(NASA 실제 3D 모델) / 한국형 3.5 m(LEO).
- 뷰: 망원경 / 태양·지구·달·L2 / 지구에서 본 심우주.
- 빌드: `cd deep-space-telescope-sim && python3 assemble.py` → `python3 -m http.server 8000` → `localhost:8000/deep-space-telescope-sim.html`
- 테스트: `node test_calc.mjs && node test_smoke.mjs`

## 2026-10-09 추가
- 별 회절상(PSF) + 분할경 piston/tip-tilt 오차 슬라이더 (arXiv:2608.16479, 2607.28393).
- 코로나그래프 암부 대비(이상적 모델)·10⁻¹⁰ 허용 오차.
- 지구형 행성 검출 예산 (Turyshev arXiv:2609.32023 단순화, 논문 수치 재현 테스트).
- 차양막 층별 온도(1차원 복사 평형, JWST 공개 온도 보정) 색 표시.
- 저궤도(LEO) 배치 뷰(한국형).
- 한국형을 KASI 3.5mST 백서(arXiv 2609.02571/02577) 기준으로 갱신, 검출 대상 61 Cyg A·ε Ind A.
- 차양막 비교(JWST vs SALTUS vs V-groove/FOSSIL) 표 + 3D 종류 선택.
- 자세한 내용은 deep-space-telescope-sim/CLAUDE.md 하단 절들.

## 다음 할 일
- 자세한 목록과 그간의 결정 사항은 `deep-space-telescope-sim/CLAUDE.md` 참고.
- 후보: JWST 3반사경(TMA) 광선추적, L2 헤일로 궤도 3체 적분, 실제 APLC 마스크, 분할경별 허용 오차 맵(PASTIS).

## 이전 기록 (2026-10-08)
- 연결 확인용 테스트 저장소로 시작(README.md, HANDOFF.md). 첫 저장 "시작".
