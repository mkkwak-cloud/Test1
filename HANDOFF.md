# HANDOFF

## 현재 상태 (2026-10-09)
- `deep-space-telescope-sim/` 폴더에 심우주 망원경 설계·3D 시뮬레이터를 올림 (Claude 앱 세션에서 개발한 것을 Claude Code로 인계).
- 모드: 접이식 전개형 / 우주 조립형 / HWO형 / 제임스웹 실사(NASA 실제 3D 모델) / 한국형 3.5 m(LEO).
- 뷰: 망원경 / 태양·지구·달·L2 / 지구에서 본 심우주.
- 빌드: `cd deep-space-telescope-sim && python3 assemble.py` → `python3 -m http.server 8000` → `localhost:8000/deep-space-telescope-sim.html`
- 테스트: `node test_calc.mjs && node test_smoke.mjs`

## 다음 할 일
- 자세한 목록과 그간의 결정 사항은 `deep-space-telescope-sim/CLAUDE.md` 참고.
- 후보: 별 회절상(PSF), 차양막 층별 온도, 저궤도(LEO) 배치 뷰, JWST 3반사경 광선추적.

## 이전 기록 (2026-10-08)
- 연결 확인용 테스트 저장소로 시작(README.md, HANDOFF.md). 첫 저장 "시작".
