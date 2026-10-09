# 심우주 망원경 설계·3D 시뮬레이터 — Claude Code 인계 문서

이 폴더는 Claude 앱(클라우드 작업 세션)에서 만든 프로젝트를 Claude Code에서 이어서 개발하기 위한 인계본입니다.
사용자는 한국어로 소통합니다. **답변과 UI 문구는 한국어**로 작성하세요.

## 무엇인가
- 브라우저 하나로 도는 3D 시뮬레이터(Three.js r160). 심우주 망원경을 설계 파라미터로 만들고, 전개·조립 과정과 광선 경로·성능 수치를 보여 줌.
- 모드(탭): A 접이식 전개형(JWST·Roman), B 우주 조립형(iSAT류), C HWO형(오프액시스, EAC1/4/5, 스타셰이드), J 제임스웹 실사(NASA 실제 3D 모델), K 한국형 우주망원경(3.5 m·LEO, 한정열 외 2021 제안안).
- 뷰: 망원경 / 태양·지구·달·L2(절차적 실사 텍스처, 달 위상) / 지구에서 본 심우주(지구 표면 시점, JWST가 L2에 있음).
- 개략 설계 도구이며 정밀 구조·열·광학 해석이 아님. 광학은 단순 카세그레인 근사(JWST 실제는 3반사경).

## 파일 구조
| 파일 | 역할 |
|---|---|
| `calc.js` | 순수 계산 모듈(육각 분할거울 배치, 포물면/쌍곡면 광선추적, 성능·발사체 적합성, 프리셋, EAC, 발사체 목록). `export` 사용 |
| `main.js` | 앱 전체(씬, 모델 생성 `build()`, 전개 애니메이션 `applyT()`, 광선/광자, UI 패널, L2·지구 뷰, NASA 모델 로더 `loadNasa()`) |
| `template_core.html` | `<title>`·`<style>`·DOM 뼈대. `/*CALC*/`, `/*MAIN*/` 자리에 코드가 들어감 |
| `assemble.py` | 빌드: `artifact.html`(Claude 아티팩트용 조각), `deep-space-telescope-sim.html`(단독 실행용 전체 문서), `_module_check.mjs`(문법·테스트용) 생성 |
| `test_calc.mjs` | 계산 검증(반사 법칙 오차 ~1e-15 등) |
| `test_smoke.mjs` | Three.js·DOM 스텁으로 전 모드·뷰를 구동하는 스모크 테스트 |
| `jwstB.json` + `jwstB.gz.b64.txt` | NASA JWST (B) 모델을 Draco 해제 → 위치 Int16·법선 Int8 양자화 → gzip → base64 텍스트로 만든 데이터(재질 그룹 36개, 약 10만 삼각형, 단위 m, y 위, 망원경 시선 +z) |
| `tools/decode.cjs` | 원본 GLB(Draco) → 위 데이터 변환 스크립트. three.js r160의 `examples/jsm/libs/draco/gltf/draco_decoder.js` 필요 |
| `tools/shot2.py`, `shot3.py` | Playwright 헤드리스 크롬 스크린샷 검증(로컬 서버 8766 가정) |
| `dist/` | 마지막 빌드 결과 |

## 빌드·테스트·실행
```bash
python3 assemble.py                 # 빌드
node --check _module_check.mjs      # 문법 확인
node test_calc.mjs && node test_smoke.mjs
python3 -m http.server 8000         # 실행: http://localhost:8000/deep-space-telescope-sim.html
```
- 단독 HTML은 Three.js를 `cdn.jsdelivr.net`(three@0.160.0)에서 불러오므로 **인터넷 필요**.
- NASA 모델 데이터는 `fetch`로 읽으므로 **로컬 서버로 열어야** 함(file:// 로 열면 자동으로 근사 모델로 대체).
- 3D 렌더링 확인은 반드시 실제 브라우저(또는 Playwright 스크린샷)로 할 것. 스모크 테스트는 렌더 결과를 보지 못함.

## 배포 제약(Claude 아티팩트로 올릴 때)
- 외부 스크립트는 cdnjs / jsdelivr(npm) / unpkg 등 허용 CDN만. 그 외 fetch·이미지·모델 외부 로드 불가 → import map, Three addons(OrbitControls, GLTFLoader 등)를 쓰지 않고 자체 `Orbit` 카메라·자체 바이너리 로더를 씀.
- 함께 올릴 수 있는 파일 형식 제한(.bin 불가) → 모델 데이터를 gzip+base64 `.txt`로 배포하고 `DecompressionStream('gzip')`으로 해제.
- 아티팩트 URL: 사용자의 Claude 앱 "심우주 망원경 시뮬레이터"(비공개).

## 지금까지의 결정·사용자 요청 이력(요약)
- 설명 팝업은 화면 터치 시 닫힘, ⓘ 버튼으로 다시 봄.
- 차양막: 노란색이 싫다는 피드백 → 은빛·연보라 금속, JWST 실제 치수 14.162 × 21.197 m, 연 모양 막(처짐·잔주름·테두리).
- 태양전지판: JWST형(5장 단일 고정 배열, 20° 기울임) / Roman형 SASS(중앙 2 + 외곽 4 전개). 폭은 추정값.
- 태양·지구·달: 위성사진 이미지를 쓸 수 없어 절차적 텍스처(대륙·구름·대기·크레이터·태양 입상). 지구·달 지름비만 실제.
- HWO: arXiv 2601.11803, 2607.02773 반영(EAC, ≤1e-10 대비, pm 안정성, 질량 한도). FLUTE 액체거울(arXiv 2507.02812)은 링크만.
- 한국형: 2026-10-09부터 KASI 3.5mST 백서(arXiv 2609.02571 I, 2609.02577 III) 기준 — 3.5 m·육각 18장(seg 0.68 m)·on-axis·시스템 f/4.5(주경 f/1.3 + 부경 위치 25 %)·0.2–1.5 µm(기준 λ 0.55)·시야 10′–30′·R~1000/5000·코로나그래프 원시 10⁻⁸/후처리 10⁻⁹·IWA 3λ/D·OWA 20λ/D·수명 10년·약 3 m 페어링(가용폭 2.6 m는 가정 → 날개 접힘 폭 2.62 m로 근소 초과)·궤도 L2/지구궤도 검토 중. 이전 안(한정열 외 2021: 0.3–1.0 µm·LEO·3–4 t)은 설명에 참고로만.
- 사용자 선호: 작업 결과는 Google Drive "0. 작업용 폴더"에 저장(하위 폴더 "심우주 망원경 시뮬레이터").

## 다음 할 일 후보(사용자에게 제안했던 것)
1. ~~별 회절상(PSF)~~ — 2026-10-09 구현 완료(아래 "PSF" 절). 코로나그래프 암부 대비도 이상적 모델로 구현. 남은 것: 실제 APLC/FPM 마스크, 분할경별 허용 오차 맵(PASTIS식 민감도).
2. ~~차양막 층별 온도~~ — 2026-10-09 구현(아래 "차양막 온도").
3. ~~저궤도(LEO) 배치 뷰~~ — 2026-10-09 구현(아래 "LEO 뷰").
4. JWST 3반사경(TMA) 광선추적, L2 헤일로 궤도 3체 운동 적분, 실제 전개 순서(약 29일) 재생.
5. NASA (A) 모델(약 49만 삼각형, 부품별 노드 이름 있음)로 부품 단위 전개 애니메이션 — 용량·성능 검토 필요.

## NASA 모델 출처
- GitHub `nasa/NASA-3D-Resources` → `3D Models/James Webb Space Telescope (B)/James Webb Space Telescope (B).glb` (KHR_draco_mesh_compression).
- 받기: `git clone --depth 1 --filter=blob:none --no-checkout` 후 sparse-checkout으로 해당 파일만(저장소 전체는 수 GB).
- 이용 조건은 NASA 3D Resources 안내를 확인할 것.

## PSF · 분할경 위상 오차 (2026-10-09 추가)
- `calc.js` 하단: `fft2`, `makePupil`(육각 분할 동공 + piston/tip/tilt 무작위 오차 + 부경 지지대 3개), `psfFromPupil`(동공 FFT → 세기, 무수차 최대 = 1), `radialMean`, `segsAcross`, `envelopeRadius`. 격자 512², 동공 지름 160 px(표시 반경 16 λ/D).
- `main.js`: 성능 요약 아래 PSF 캔버스·piston / tip-tilt 슬라이더(로그, pm~µm)·지지대 토글·수치표. 오프액시스(C)는 `opt.x0`를 빼서 동공 중심으로 되돌림. 오차는 파면(OPD) rms, 시드 고정.
- 근거 논문: Leboulleux 외 arXiv:2608.16479 (분할 오차 저차 포락선 1.22·N·λ/D, IWA ≥ N이면 수동 강건, 85→7장이면 piston 허용치 최대 ~2배 완화) · Sahoo 외 arXiv:2607.28393 (분할경 허용 오차 pm 수준, 안쪽 분할일수록 엄격).
- 한계: Fraunhofer 근사, 코로나그래프 미포함, 틈새(2 cm)는 격자(≈4 cm/px)에서 거칠게 표현됨, 동공 격자 때문에 먼 날개(10⁻⁴ 이하)는 픽셀화 잡음 포함. 테스트: `test_calc.mjs`(FFT 파스발·역변환, Strehl=1, Maréchal 근사, 점대칭·이방성).
- 코로나그래프(같은 날 추가): `coronagraphFromPupil`(이상적 코로나그래프, Cavarroc 외 2006: E = A(e^{iφ} − ⟨e^{iφ}⟩)), `annulusMean`, `toleranceFor`(대비 ∝ σ² 환산). UI: 표시 선택(원시/코로나그래프 후), IWA 슬라이더(2–8 λ/D), 암부 평균(IWA–12 λ/D)·IWA 근처(IWA–IWA+1) 대비, 10⁻¹⁰ 허용 오차. 실제 APLC 설계 바닥은 미포함(낙관적).
- 검출 예산(같은 날 추가): `planetFluxRatio`, `requiredSNR`/`detectPower`(30,000곳·오경보 10⁻³·99%), `starPhotonFlux`(흑체, 대역 평균 ḡ), `detectionBudget`(두 롤 ADI, FRN = 광자⊕스펙클⊕보정 3.5 ppt, 필요 시간), `limitingDistance`, `contrastStability`(√(2·C_raw·c_d + c_d²)). Turyshev arXiv:2609.32023 수치를 테스트로 재현(115.46 ppt, 14.94 ppt, 64.55%, C⋆ 2.3666e9, ḡ 1.2127, FRN 8.795 ppt, 11.564 ppt, 1.1443e-12, 8.106 pc, 69.64 h). UI: 거리·관측 시간·롤 간 드리프트(fm~10 pm)·코어 처리율 슬라이더, 원시 대비 = 3e-10 + 정적 분할 오차.

## 차양막 온도 (2026-10-09 추가)
- `calc.js` `sunshieldTemps(n, o)`: 1차원 복사 평형, u=σT⁴ 삼중대각 선형계(Thomas). 층 간 복사 교환 (1−f)·E·Δu, 각 면 가장자리 방출 f·ε·u. 1층 앞면 도핑 Si(α 0.652, ε 0.68), 나머지 Al(ε 0.05), f=0.68 — JWST 공개 온도(태양쪽 ~383 K, 망원경쪽 ~36 K)에 맞춘 보정값. 결과 5겹: 382→214→120→67→37 K.
- `main.js`: 표시 → "차양막 층별 온도 색 표시" 체크 시 층 재질을 온도 색(로그 30–400 K, 파랑→빨강)으로 바꾸고 층별 라벨 표시(`applyShieldTemp`). 성능 요약에 층별 온도·태양 흡수/망원경 쪽 방출 W/m². NASA 실사 모델(J)은 자체 메시라 색이 안 바뀜(근사 모델을 켜면 보임). 한국형(LEO)은 지구 적외선·알베도 미포함.

## LEO 뷰 (2026-10-09 추가)
- `calc.js` `leoOrbit(hKm)`: 원궤도 주기·속도·하루 바퀴 수, β=0 원통 그림자 식 시간, 지구가 가리는 하늘 비율, 태양동기 경사(cos i = −(a/12352)^3.5). 고도는 적도 반지름 6378.137 km 기준. 테스트: 600 km → 96.7분·7.56 km/s·97.8°, 400 km → 92.6분.
- `main.js`: 탭 줄 "🛰 저궤도(LEO)" 버튼 → `setView('leo')`. `leo` 그룹(지구 실제 축척 LEO_R=6 = 6378 km, 망원경만 과장), 태양 −x·정오–자정 궤도면이라 매 바퀴 식(회색 궤도 구간), 망원경 시선은 천정. 하단 상태줄에 궤도 시각·햇빛/그림자. ⚙ 표시 → "저궤도 고도"(350–1200 km). 한국형 모드 성능 요약에 LEO 행. 지구 재질은 envMapIntensity 0.04로 낮·밤 경계를 살림.

## 3.5mST 반영 (2026-10-09)
- `calc.js`: `TARGETS`(태양형·61 Cyg A·ε Ind A), `targetStar`(EEID a=√L, 흑체 반지름, Ag 태양형 0.2·K형 0.3), `iwaHorizonPc`(백서 Eq. III.14). `detectionBudget`가 별 온도·반지름을 받음. LAUNCHERS에 `f3`.
- 테스트: 61 Cyg A 1.2×10⁻⁹·109 mas, ε Ind A 6.9×10⁻¹⁰·137 mas, 지구 쌍둥이 10.3/15.4 pc, 목성 쌍둥이 53.5 pc 재현.
- `main.js`: K 모드 진입 시 IWA 3, 검출 대상 61 Cyg A, 원시 대비 10⁻⁸, 코로나그래프 OWA 20λ/D. 검출 예산에 대상 선택·IWA 밖 최대 거리. 부경 위치 슬라이더 최대 30 %.
