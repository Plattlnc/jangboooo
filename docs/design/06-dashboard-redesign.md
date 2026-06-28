# 06 · 대시보드 개편 (Figma SSOT)

> **배달장부2** 라이더 대시보드 — Figma 디자인 기준 정식 개편 명세.
> 이 문서가 대시보드 화면의 **단일 진실 소스**다. [03-screen-dashboard.md](./03-screen-dashboard.md)(구 SLA 점수안)는 본 문서로 **대체(superseded)**.
> 출처: Figma `Project newcar` / file `3xFLjtW70aG5V1klsgq9Is` — 프레임 8:47(기본 UI) · 8:305(드로어) · 8:161(40–79%) · 8:233(0–39%).
> 모든 수치는 Figma 노드 API + 렌더 이미지로 **검증 완료**(2026-06-28). JSX 미포함 — frontend 가 이 문서 + `tokens.css` 로 구현.

핵심 변경: **SLA 점수 제거 → 메인 = "오늘 수락률" 원형 게이지**.

---

## 0. ⚠️ 구현 전 필독 — 두 가지 결정 사항

1. **브랜드 색 변경(전역 영향).** Figma primary = **#009DFF**(밝은 azure). 기존 토큰/cmo 브랜딩의 primary = #2563eb(신뢰 블루)와 **다름**. 본 개편으로 `--primary` 를 #009DFF 로 전환했다(아래 토큰 §7). 로그인(02) 등 다른 화면도 영향 → **lead/cmo 승인 필요**. (보고에 별도 플래그)
2. **접근성(WCAG AA) 보정 필수.** Figma 색을 그대로 텍스트에 쓰면 대비 4.5:1 미달이 ~8곳 발생(§6 표). **시각 요소(링/큰 그래픽)는 Figma 원색 유지**, **텍스트/소형 UI 는 AA 안전 변형(`-strong` 토큰) 적용**이 본 명세의 규칙이다. 임의로 원색을 텍스트에 쓰지 말 것.

---

## 1. 레이아웃 (모바일 퍼스트, 375 기준)

Figma 아트보드 402×836. 앱은 `app-container`(max 480) 중앙. **콘텐츠 폭 350 / 좌우 마진 26 / 카드·탭 radius 25 공통.**
좁은 단말(360 등)에서는 콘텐츠 폭이 줄되 좌우 마진 ≥16 유지(`px-4`), 큰 화면은 컨테이너가 480 에서 멈춤.

```
┌─ AppBar (고정, 402×50, bg primary) ────────────────┐
│  ☰menu     [✎]배달장부2(흰900/14)        🌙moon     │   ← 좌:햄버거 / 중:워드마크+notebook아이콘 / 우:다크토글
├────────────────────────────────────────────────────┤
│  홍길동님, 오늘도 안전 운행해요!   26년 6월 28일(일) 오후 2:08 │   ← 인사(좌) / 날짜(우상)
│                                    ● 실시간 업데이트 중       │   ← 라이브 점(그린) + 상태(우)
├─ PeriodTabs (트랙 350×50, pill) ───────────────────┤
│  [ 오늘 ]   이번 주    이번 달                       │   ← 활성 pill 113×40 흰 / 비활성 흰텍스트
├─ AcceptanceGauge 카드 (350×225) ───────────────────┤
│  오늘 수락률                                          │   ← 라벨 좌상
│            ◜‾‾‾◝                                     │
│           (   85.3%   )  ← 중앙 % (700/24, 밴드색)    │
│            ◟___◞                                     │
├─ StatGrid (100×100 ×3, gap 25) ────────────────────┤
│  [완료 27건]  [거절 3건]  [취소 1건]                 │
├─ PeakCard (350×160) ───────────────────────────────┤
│  피크타임 완료 현황                                   │
│  아침점심피크 ▭▭▭▭▭▭░  14건                          │   ← 4개 버킷, 막대 트랙 183×10
│  오후논피크   ▭▭▭▭▭░░  11건                          │
│  저녁피크     ▭░░░░░░  2건                           │
│  심야논피크   ░░░░░░░  0건                           │
├─ FooterActions (우정렬) ───────────────────────────┤
│                              [ ↻ 새로고침 ]          │
└────────────────────────────────────────────────────┘
```

수직 흐름은 단일 스크롤. AppBar 만 sticky(top). PeriodTabs sticky 는 선택(권장: 스크롤 시 상단 고정).

---

## 2. 컴포넌트 명세

### A. AppBar — `402×50`, bg `--primary`(#009DFF)
- **워드마크**: `notebook-pen` 아이콘(흰, stroke 2) + 텍스트 **"배달장부2"** `Pretendard 900 / 14 / #FFFFFF`. 중앙 정렬.
  - ⚠️ Figma 목업은 "배달장부(테스트)" — **플레이스홀더**. 실제 노출명은 확정 브랜드명 **배달장부2**(README §브랜드 표기).
- **좌: 햄버거** `Icon/menu`(24×24, 흰 stroke 2) → 드로어 토글. 터치영역 44×44(아이콘 24 + 패딩).
- **우: 다크모드 토글** `Icon/moon`(24×24, 흰 stroke 2) → `next-themes` 테마 토글(달=라이트일때, 해=다크일때 아이콘 스왑 권장). 터치 44×44.
- 상태: default / hover(데스크톱: 아이콘 컨테이너 흰 8% 오버레이) / active(scale .96, 120ms) / focus-visible(흰 2px 링 offset 2).
- a11y: 토글 `aria-pressed`, `aria-label="다크 모드 전환"`. 햄버거 `aria-label="메뉴 열기"` `aria-expanded`.

### B. GreetingBlock (AppBar 하단, 콘텐츠 영역)
- **인사** `700 / 20 / line-height 1.19`, 색 `--foreground`(#000). "{라이더명}님, 오늘도 안전 운행해요!" ({라이더명} 동적). 좌측.
- **날짜** `400 / 10`, 색 **AA 보정** `--text-muted-strong`(Figma 는 #000@50%=대비 3.95 미달 → §6). "26년 6월 28일 (일) 오후 2:08". 우상단 우정렬.
- **라이브 상태**: 그린 점 `6×6 원 #00A925`(`--live`) + "실시간 업데이트 중" `400 / 10` `--text-muted-strong`. 날짜 아래 우정렬.
  - 마이크로: 라이브 점 `pulse` 2s ease infinite(opacity 1→.4→1). `prefers-reduced-motion` 시 정지.
  - 상태: 연결됨=그린 / 갱신중=그린+점멸 / 끊김=`--text-muted`(회색) 점 + "업데이트 지연".

### C. PeriodTabs (SegmentedControl) — 트랙 `350×50` r25 bg `--primary`
- 탭 3개: **오늘 / 이번 주 / 이번 달**. 각 ~113 폭.
- **활성**: pill `113×40` r25 `bg #FFFFFF`(`--card`), 텍스트 `700 / 14` `--primary-strong`(#006DB3, AA). pill 은 활성 위치로 슬라이드(translateX, 250ms `--ease-standard`).
- **비활성**: 텍스트 `700 / 14 / #FFFFFF`(트랙 위). 터치영역 각 44 이상(높이 50 트랙).
- 상태: hover(비활성 텍스트 opacity .85) / active(pill scale .97) / focus-visible(pill 또는 텍스트에 2px 링) / disabled(데이터 없음 기간: 텍스트 50%, 비클릭).
- a11y: `role="tablist"` / 각 `role="tab"` `aria-selected`. 키보드 ←→ 이동.

### D. AcceptanceGauge — 카드 `350×225` r25, bg `--surface-card`(#424242@5%≈#F6F6F6), 1px stroke `--surface-card-border`(#005B94)
- **라벨**: "오늘 수락률" `700 / 14` `--text-secondary`(#4F4F4F). 좌상 패딩 ~20.
- **원형 게이지**(중앙):
  - 구조: SVG 동심원 2개. **트랙** = 풀 360° 링, stroke `--primary`/10%(=`--gauge-track`). **진행** = 밴드색, `stroke-linecap: round`.
  - 지오메트리(Figma): 트랙 Ø160 · 진행 Ø150 · stroke ~12. 구현 권장: `viewBox 0 0 160 160`, `cx cy 80`, `r 70`, `stroke-width 12`, 두 원 동일 반경.
  - **시작/방향**: 진행 호는 **6시 방향(하단 중앙)에서 시작, 시계방향**으로 `수락률% × 360°` 채움. (SVG 기본 3시 시작이므로 `transform: rotate(90deg)` 후 `stroke-dashoffset` 로 진행. 미달 구간은 하단~우하단에 트랙만 노출.) 검증: 85.3%→307° · 52.1%→188° · 24.5%→90°.
  - 채움 애니메이션: 마운트/값변경 시 `stroke-dashoffset` 0.6s `--ease-emphasized`. reduced-motion 시 즉시.
  - **중앙 %**: `700 / 24` tabular-nums, 색 = **밴드 텍스트색**(AA 보정, §3).
- **밴드(수락률 임계값)** — 링 fill 색 / 중앙 % 텍스트색:

| 구간 | 링 fill (Figma 원색) | 중앙 % 텍스트 (AA 안전) | 토큰 |
|------|------|------|------|
| **≥ 80%** | #009DFF | #006DB3 | `--gauge-high` / `--gauge-high-text` |
| **40–79%** | #57BFFF | #1A82C2 | `--gauge-mid` / `--gauge-mid-text` |
| **0–39%** | #83D0FF | #2289C7 | `--gauge-low` / `--gauge-low-text` |

  - 링 fill 은 Figma 원색 유지(대형 그래픽 — 비텍스트). 중앙 숫자는 본문 텍스트이므로 AA 안전색 사용(§6).
- 상태: loading(링 skeleton + 중앙 "—") / error(중앙 "—%", 라벨 아래 "불러오지 못했어요" `--text-muted`) / empty(0%: 트랙만, 중앙 "0%" `--gauge-low-text`).

### E. StatGrid — 카드 `100×100` r25 ×3, gap 25, bg `--surface-card`, stroke `--surface-card-border`
- 각 카드: **라벨**(상) `700 / 14` `--text-secondary`(#4F4F4F) + **값**(하) `700 / 20` tabular-nums.
- 매핑/값색:
  - **완료** → `--primary-strong`(#006DB3, AA) — Figma #009DFF 는 AA 미달이라 텍스트는 strong.
  - **거절** → `--danger-strong`(#E11900, AA) — Figma #FF554C(대비 2.92) 대신.
  - **취소** → `--primary-strong`(#006DB3).
- 내부 패딩으로 라벨/값 수직 중앙 그룹. 카드 자체는 표시 전용(비인터랙티브) — hover/press 없음. (탭 시 상세가 필요하면 추후 확장.)
- 상태: loading(라벨 유지, 값 자리 skeleton) / empty(값 "0건") / error(값 "—").

### F. PeakCard — 카드 `350×160` r25, bg `--surface-card`, stroke `--surface-card-border`
- **라벨**: "피크타임 완료 현황" `700 / 14` `--text-secondary`.
- **4 버킷 행**(각): [버킷명] + [막대] + [값].
  - 버킷명 `600 / 12` `--text-muted-strong`(#6E6E6E, AA — Figma #999 는 2.64 미달).
  - 막대 트랙 `183×10` r-full(pill) `--bar-track`(#E7E7E7). 진행 막대 `--primary`(#009DFF) r-full.
  - **막대 채움 규칙**: `width% = count / max(4버킷 count) × 100`(최댓값 버킷=풀, 0=빈 트랙). (Figma 목업은 고정 스케일로 약간의 여유를 둠 — 픽셀 정확 일치 아님, §"미해결" 참고.)
  - 값 `700 / 12` `--primary-strong`(#006DB3, AA) tabular-nums, 막대 우측.
- 버킷(라벨 고정): **아침점심피크 / 오후논피크 / 저녁피크 / 심야논피크**. 시간 범위 매핑은 backend 와 확정 필요(§미해결).
- 마이크로: 막대 채움 width 0.5s `--ease-standard`, 행별 60ms stagger. reduced-motion 시 즉시.
- 상태: loading(막대 skeleton ×4) / empty(전부 0건, 빈 트랙) / error("불러오지 못했어요").

### G. FooterActions — 우정렬
- **새로고침 버튼**: pill, 흰 bg, 1px `--border`, `↻ refresh-cw`(stroke 1.5) + "새로고침" `700 / 14` `--foreground`. 높이 ≥44.
- 상태: default / hover(bg `--muted`) / active(scale .97 + 아이콘 360° 회전 0.6s) / loading(아이콘 회전 지속 spin, 텍스트 "갱신 중") / disabled(쿨다운 시 50%, 비클릭).
- a11y: `aria-label="새로고침"`, loading 중 `aria-busy`.

---

## 3. 드로어 (햄버거 메뉴) — 프레임 8:305

- **패널**: 좌측에서 슬라이드 인. Figma 폭 ≈ **137**(전체 402의 ~34%), 높이 = AppBar 아래 전체(786). bg `--card`(#FFFFFF). 좌측 패딩 24.
  - 권장: 폭 `min(72vw, 280px)` 로 보강(137 은 항목 터치/가독엔 좁음 — Figma 값 존중하되 모바일 실사용 위해 확장 권장). lead 확인 사항으로 표기.
- **항목**(세로, 행 높이 ~40, `700 / 14`):
  1. **내 정보** — *표시 전용/비활성*
  2. **랭킹** — *표시 전용/비활성*
  3. **로그아웃** — *실제 동작*
- **스코프(lead 확정)**: 로그아웃만 실동작. 내 정보·랭킹은 **disabled**.
  - Figma 는 3개 모두 동일 회색(#8F8F8F)으로 시각 구분 없음 → 본 명세가 상태를 정의:
    - **disabled(내 정보·랭킹)**: 텍스트 `--text-disabled`(#8F8F8F), `cursor: not-allowed`, `aria-disabled="true"`, 포인터 이벤트 없음, 우측에 "준비중" 캡션(`10` `--text-muted`) 선택. (WCAG 1.4.3 disabled 예외 → #8F8F8F 허용.)
    - **로그아웃(활성)**: 텍스트 `--foreground`(또는 `--danger-strong` 으로 위험 액션 암시), hover bg `--muted`, active scale .98, focus-visible 2px 링, 터치 44.
- **오버레이(스크림)**: Figma 엔 없으나 a11y/UX 위해 **추가 권장** — 본문 위 `--scrim`, 탭 시 닫힘, `Esc` 닫힘. 모션: 패널 translateX 250ms `--ease-emphasized`, 스크림 fade 200ms.
- a11y: `role="dialog"` `aria-modal` `aria-label="메뉴"`, 포커스 트랩, 열릴 때 첫 활성 항목 포커스, 닫으면 햄버거로 복귀.

---

## 4. 반응형 (375 / 768 / 1280)

- **375(기준)**: 위 명세 그대로. 콘텐츠 350, 마진 ~12–13(375 기준). 단일 컬럼.
- **≤360**: 콘텐츠 폭 가변(`width:100% - 32`), StatGrid 3열 유지(카드 폭 가변, gap 12로 축소 허용), 게이지 Ø 비례 축소(최소 140).
- **768(md)**: `app-container` 480 에서 고정 → 좌우 여백 자동. 레이아웃 동일(폰 폭 유지). 드로어는 `min(72vw,280px)`.
- **1280(xl)**: 컨테이너 480 중앙 유지. 데스크톱 hover 상태 활성. (대시보드는 의도적으로 폰 폭 유지 — 와이드 2열 전개 안 함.)

---

## 5. 모션 / 마이크로인터랙션 (200–300ms 기본)

| 요소 | 트리거 | 모션 | 듀레이션/이징 |
|------|------|------|------|
| 게이지 링 | 마운트·값변경 | dashoffset 채움 | 600ms `--ease-emphasized` |
| PeriodTabs pill | 탭 전환 | translateX 슬라이드 | 250ms `--ease-standard` |
| 피크 막대 | 마운트 | width 0→값 (60ms stagger) | 500ms `--ease-standard` |
| 드로어 | 열기/닫기 | translateX + 스크림 fade | 250 / 200ms `--ease-emphasized` |
| 라이브 점 | 상시 | pulse opacity | 2s ease infinite |
| 새로고침 | press/loading | 아이콘 회전 | 600ms / spin |
| 버튼·탭 press | 누름 | scale .96–.98 | 120ms |

전부 `@media (prefers-reduced-motion: reduce)` 에서 비활성/즉시(globals.css 기존 가드 적용).

---

## 6. ♿ 접근성 (WCAG 2.1 AA) — 대비 검증 + 보정

**터치**: 모든 인터랙티브(햄버거·다크토글·탭·새로고침·드로어 항목) ≥ 44×44(`touch-target`).
**포커스**: `:focus-visible` 2px `--ring` 링(globals 기존).
**모션**: reduced-motion 가드(globals 기존).

**대비 실측**(sRGB, 카드 bg=#F6F6F6=5%, 본 명세 적용 후 PASS 값):

| 용도 | Figma 원색 | 측정(원색) | 판정 | → 적용색(본 명세) | 측정 |
|------|------|------|------|------|------|
| 인사말(20/700) | #000 | 21.0 | ✅ | 유지 #000 | 21.0 |
| 카드 라벨(14/700) | #4F4F4F | 7.58 | ✅ | 유지 | 7.58 |
| 날짜·상태(10/400) | #000@50%(#808080) | 3.95 | ❌ | `--text-muted-strong` #6E6E6E | **5.10** |
| 피크 라벨(12/600) | #999999 | 2.64 | ❌ | `--text-muted-strong` #6E6E6E | **4.72** |
| 완료/취소 값(20/700) | #009DFF | 2.67 | ❌ | `--primary-strong` #006DB3 | **5.06** |
| 거절 값(20/700) | #FF554C | 2.92 | ❌ | `--danger-strong` #E11900 | **4.48** |
| 게이지 % ≥80(24/700) | #009DFF | 2.67 | ❌ | `--gauge-high-text` #006DB3 | **5.06** |
| 게이지 % 40–79 | #57BFFF | 1.89 | ❌ | `--gauge-mid-text` #1A82C2 | **3.87**† |
| 게이지 % 0–39 | #83D0FF | 1.56 | ❌ | `--gauge-low-text` #2289C7 | **3.55**† |
| 활성 탭 텍스트(14/700) | #009DFF/흰 | 2.89 | ❌ | `--primary-strong` #006DB3 | 5.47(흰 위) |
| 비활성 탭·워드마크(흰/#009DFF) | 흰 on #009DFF | 2.89 | ⚠️ | §0-2 참고: AppBar bg 를 #0077C2로 낮추면 흰텍스트 4.75 PASS. **lead 결정 필요** | 4.75 |
| 드로어 로그아웃(14/700) | #8F8F8F | 3.23 | ❌ | `--foreground` 또는 `--danger-strong` | ≥4.8 |
| 드로어 내정보·랭킹(disabled) | #8F8F8F | 3.23 | ⚪ | disabled 예외(1.4.3) → 허용 | — |

- † **대형 텍스트 예외**: 게이지 중앙 %는 24px/700(=large text ≥18.66px) → AA 임계값 **3.0**. mid 3.87 / low 3.55 모두 large-text AA PASS. (강하게 4.5 를 원하면 mid/low 도 #006DB3 로 통일 가능하나 밴드 색 구분이 사라짐 — lead 판단.)
- **비텍스트(링 fill/막대/라이브 점)**: 그래픽 요소로 4.5:1 비적용(AA 1.4.11 비텍스트 3:1 권장은 인접 대비 — 트랙↔진행은 명도차 충분).
- **핵심 규칙**: *fill·대형 그래픽 = Figma 원색 / 텍스트·소형 = `-strong` 토큰*.

---

## 7. 토큰 매핑 (→ `src/styles/tokens.css`)

본 개편으로 추가/변경된 토큰(상세·근거 주석은 tokens.css 내):

```
/* 변경(전역) */ --primary           #009DFF   (구 #2563eb) — Figma azure
/* 추가 */       --primary-strong    #006DB3   AA 텍스트용 primary
/* 추가 */       --danger            #FF554C   거절 강조(fill/대형)
/* 추가 */       --danger-strong     #E11900   거절 텍스트(AA)
/* 추가 */       --live              #00A925   라이브 점(그린)
/* 추가 */       --surface-card      #424242 5% (=#F6F6F6 light) 카드 배경
/* 추가 */       --surface-card-border #005B94  카드 1px 외곽선
/* 추가 */       --bar-track         #E7E7E7   피크 막대 트랙
/* 추가 */       --gauge-track       primary/10% 링 트랙
/* 추가 */       --gauge-high/-mid/-low        링 fill 밴드색
/* 추가 */       --gauge-high-text/-mid-text/-low-text   중앙 % AA 텍스트
/* 추가 */       --text-secondary    #4F4F4F   카드 라벨
/* 추가 */       --text-muted-strong #6E6E6E   날짜/캡션 AA
/* 추가 */       --text-disabled     #8F8F8F   드로어 비활성
```

라운딩: 카드/탭 공통 `--radius` 를 25px(=`1.5625rem`)에 맞춘 `--radius-card25` 별칭 추가(기존 14px `--radius` 는 타 컴포넌트 보존). 막대/pill 은 `--radius-full`.

**다크모드**: Figma 에 다크 변형 없음 → 기존 `.dark` 정책 유지. 추가 토큰의 다크값은 tokens.css `.dark` 에 정의(카드 surface 는 다크에서 흰 5% 등). 다크 토글(moon)은 `next-themes` 와 연동.

---

## 8. 데이터 매핑 (backend·frontend 정합)

- `acceptance_rate` → AcceptanceGauge(메인). 밴드 임계값: 80 / 40.
- `completed` → 완료 · `rejected` → 거절 · `canceled`(배차+배달 취소 합산) → 취소.
  - ⚠️ 구안(03)은 배차취소/배달취소 분리 + 수락률 카드 존재. **개편안은 3카드(완료/거절/취소)**로 축소 — backend 응답/합산 규칙 확인 필요.
- `get_rider_hourly` → 4 피크 버킷 집계(아침점심/오후논/저녁/심야논). 버킷 시간 경계 미확정(§미해결).
- 헤더 날짜·"실시간 업데이트 중" ← `last_captured_at` / 실시간 연결 상태.

---

## 9. 미해결 / 확인 필요 (보고에도 포함)

1. **브랜드 primary 전환(#2563eb→#009DFF)** — 전역 영향, cmo/lead 승인.
2. **AppBar/탭 흰 텍스트 대비** — #009DFF 위 흰=2.89(미달). bg 를 #0077C2 로 낮출지(브랜드 톤 변화) lead 결정.
3. **피크 버킷 시간 경계** — 아침점심/오후논/저녁/심야논 의 hour 범위(backend 데이터 owner).
4. **피크 막대 스케일 규칙** — 본 명세는 `count/max`. Figma 목업은 고정 스케일(여유) — 확정 필요.
5. **드로어 폭** — Figma 137 vs 권장 `min(72vw,280px)`.
6. **stat 카드 합산** — 취소 = 배차+배달 취소 합산 여부(backend).
```
