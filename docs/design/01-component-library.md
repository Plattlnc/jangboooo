# 01 · Component Library

화면을 구성하는 컴포넌트 인벤토리 + **상태별 스타일**. 모든 인터랙티브/데이터 컴포넌트는
default · hover · active · focus · disabled · loading · error · empty 를 정의한다.
(hover 는 데스크탑 보조용 — 모바일 1차 상태는 default/active/focus.)

표기: 토큰 유틸 이름으로 스펙을 적는다. 색/크기 하드코딩 없음.

---

## 컴포넌트 트리 (구현 단위 제안 · `src/components/`)

```
ui/                기본 프리미티브
  Button            primary | secondary | ghost | kakao  (sm|md|lg)
  IconButton        44px 터치, 아이콘 전용
  Tabs              SegmentedTabs (기간: 오늘/주/월)
  Card              표면 컨테이너 (StatCard 의 베이스)
  Badge             상태 칩 (success/warning/danger/info/neutral)
  Skeleton          로딩 플레이스홀더
  EmptyState        빈 상태 일러스트+카피+액션
  ErrorState        에러 상태 재시도
  Spinner           인라인 로딩 인디케이터
  Toast             일시 알림
  Field             label + input + helper/error (본인인증 입력)
dashboard/
  PeriodTabs        SegmentedTabs 래퍼(오늘/주/월) — sticky
  SlaScore          메인 SLA 점수 게이지(대형)
  StatCard          지표 카드(완료/거절/배차취소/배달취소/수락률)
  StatGrid          StatCard 반응형 그리드
  PeakHourChart     시간대별 막대/라인 차트
  DashboardHeader   인사/기간 요약
auth/
  KakaoLoginButton  카카오 간편로그인 CTA
  PhoneVerifyForm   휴대폰 본인인증 단계 폼
```

---

## A. Button

3 사이즈 × 4 변형. 라벨 텍스트는 cmo 카피 확정 전까지 placeholder.

**사이즈** (높이/패딩/타입)
- `sm` h-9(36) · `px-3` · `text-sm` — 보조
- `md` h-11(44) · `px-4` · `text-body` — **기본(터치 최소 충족)**
- `lg` h-13(52) · `px-5` · `text-body` font-600 — 주요 CTA(풀폭)

**변형**

| 변형 | 표면 | 텍스트 | 테두리 |
|------|------|--------|--------|
| primary | `bg-primary` | `text-primary-fg` | none |
| secondary | `bg-surface` | `text-fg` | `border-border-strong` |
| ghost | 투명 | `text-primary` | none |
| kakao | `bg-kakao` | `text-kakao-fg` | none (좌측 카카오 심볼) |

**상태** (전 변형 공통 패턴; 예시는 primary 기준)

| 상태 | 스타일 |
|------|--------|
| default | 위 표 / `rounded-md` / `transition` 150ms standard |
| hover | `bg-primary-hover` (secondary: `bg-surface-sunken`, ghost: `bg-primary-subtle`) |
| active | `bg-primary-active` + `scale-[.97]` |
| focus-visible | outline 2px `--focus-ring` + offset 2px (전역) |
| disabled | `opacity-50` · `cursor-not-allowed` · hover/active 무효 · `aria-disabled` |
| loading | 라벨 자리 `Spinner`(현재 텍스트색) + 텍스트 `여 …`/숨김, 폭 유지, 클릭 차단, `aria-busy` |
| error | 버튼 자체 상태 아님 → 폼/필드 레벨에서 처리 |

- 라운딩 `rounded-md`(12). 풀폭 CTA 는 `w-full`.
- 아이콘+텍스트 시 `gap-2`. 아이콘 전용은 IconButton(정사각 44).

---

## B. PeriodTabs (SegmentedTabs)

기간 선택: **오늘 / 이번 주 / 이번 달**. 대시보드 상단 sticky.

- 구조: `role="tablist"`, 각 탭 `role="tab"` `aria-selected`. 컨테이너 `bg-surface-sunken` `rounded-full` `p-1`.
- 인디케이터: 선택 탭 아래 `bg-surface` `rounded-full` `shadow-xs`, 슬라이드 200ms standard.
- 텍스트: 선택 `text-fg` font-600 / 비선택 `text-muted`.

| 상태 | 스타일 |
|------|--------|
| default(비선택) | `text-muted` |
| selected | `text-fg` font-600 + 이동 인디케이터 표면 |
| hover(비선택) | `text-fg` |
| active(press) | `scale-[.98]` |
| focus-visible | 탭 전체 outline ring |
| disabled | 데이터 없는 기간도 탭은 활성 유지(누르면 empty 표시). 비활성화 지양 |

- 각 탭 min-height 44(`touch-target`), 3등분 `flex-1`.
- 상단 고정: `sticky top-0 z-[100]` + 배경 `bg-bg/90 backdrop-blur` 로 스크롤 시 가독.

---

## C. Card / StatCard

**Card** = 표면 컨테이너 기본: `bg-surface` `rounded-card` `shadow-card` `p-4 md:p-5` `border border-border`(다크 가독 보강).

**StatCard** = 단일 지표 표시. 구성: 라벨(상단, `text-caption text-muted`) · 값(대형 `text-h1`/`text-display` `text-fg` `tabular-nums`) · 보조(전기간 대비 델타 Badge or `text-sm text-muted`) · 좌상단/우상단 아이콘(옵션).

지표 종류: 완료 · 거절 · 배차취소 · 배달취소 · 수락률(%). 위험 성격 지표(거절/취소)는 값 옆 상태색을 임계값(00-foundations §1)으로 적용.

| 상태 | 스타일 |
|------|--------|
| default | 위 구성. 값 우선 시각 위계(값 > 라벨 > 보조) |
| hover(데스크탑) | `shadow-md` 살짝 상승(선택) — 정보 카드라 과한 인터랙션 지양 |
| active(탭 가능 시) | `scale-[.99]` (상세 이동이 있는 경우만) |
| focus-visible | 카드가 링크/버튼일 때만 ring |
| loading | 동일 레이아웃의 `Skeleton`: 라벨 1줄(w-16 h-3) + 값(w-24 h-8) + 보조(w-12 h-3) |
| error | 값 자리 `—` + 우상단 작은 `!` 아이콘 `text-danger`, 카드 하단 `text-caption text-danger` "불러오기 실패" + 재시도 텍스트버튼 |
| empty | 값 `0` 정상 표시(0은 빈 상태 아님). 데이터 미수집이면 값 `—` + `text-subtle` "데이터 없음" |

- 0 과 미수집(—) 구분 필수: 0건은 유효값, 미수집은 placeholder.
- 델타 표기: 상승/하락 + 화살표 아이콘 + 색(좋은 방향=success). 거절/취소는 "감소가 좋음" → 색 방향 반전 매핑(명세 03 참조).

---

## D. SlaScore (메인 지표)

대시보드 핵심. 점수(0–100)를 **크게** + 게이지(원형 진행 또는 가로 바)로.

- 점수 숫자: `text-score`(56px, 700, `tabular-nums`), 상태색(임계값) 적용.
- 보조 라벨: 상단 "SLA 점수" `text-caption text-muted`, 하단 등급 Badge(우수/주의/위험).
- 게이지: 원형 링(SVG, 두께 10–12, 트랙 `border`색, 진행 상태색) 또는 가로 진행바.
- 컨테이너: Card 보다 강조 — `bg-surface` `rounded-2xl` `shadow-md` `p-6`, 화면 상단 1순위.

| 상태 | 스타일 |
|------|--------|
| default | 점수 + 게이지 + 등급 Badge. 진입 시 게이지 0→값 600ms out, 숫자 카운트업 |
| hover/active | 비인터랙티브(정보) — 상태 없음 |
| focus | 비포커서블(설명은 `aria-label`로 "SLA 점수 87점, 주의") |
| loading | 원형 `Skeleton`(게이지 자리) + 점수 자리 w-20 h-14 skeleton |
| error | 게이지 회색 비활성 + 점수 `—` + 하단 `text-danger` "점수를 불러오지 못했어요" + 재시도 |
| empty | 선택 기간 데이터 없음 → 게이지 0%(회색) + "이 기간 기록이 없어요" 안내(EmptyState 인라인) |

- 색만으로 등급 전달 금지 → 숫자 + 등급 텍스트 Badge 병행(a11y §4).
- reduced-motion: 카운트업/게이지 애니메이션 즉시 최종값.

---

## E. Badge

상태 칩. `inline-flex` `rounded-full` `px-2 py-0.5` `text-caption` font-600 + 옵션 아이콘.

| 변형 | 배경 / 텍스트 |
|------|--------------|
| success | `bg-success-subtle` `text-success` |
| warning | `bg-warning-subtle` `text-warning` |
| danger | `bg-danger-subtle` `text-danger` |
| info | `bg-info-subtle` `text-info` |
| neutral | `bg-surface-sunken` `text-muted` |

- 델타 Badge: 아이콘(↑/↓) + 값. 방향 색은 지표 의미에 따름(명세 03).
- 단독 색 의존 금지 → 항상 텍스트/아이콘 포함.

---

## F. PeakHourChart (시간대별 실적)

피크시간대 실적: 시간(x) × 건수/지표(y). **막대 기본**, 추세 강조 시 라인 옵션.

- 막대: 기본 `bg-primary`, 최댓값(피크) 막대 강조(`bg-primary` + 라벨 굵게) 또는 상태색.
- 축: x 라벨 `text-caption text-muted`(혼잡 회피 위해 격시 표기 가능), y 그리드 라인 `border` 색 점선.
- 인터랙션: 막대 탭 시 툴팁(시간·값) `bg-surface-elevated` `shadow-lg` `rounded-md`.
- 컨테이너: Card. 제목 `text-h3` + 보조 `text-caption text-muted`.

| 상태 | 스타일 |
|------|--------|
| default | 막대 진입 stagger(아래→위 scaleY, 200ms out, 30ms 간격) |
| hover/active(막대) | 해당 막대 `opacity` 강조 + 툴팁, 나머지 `opacity-60` |
| focus | 막대 키보드 포커스 가능(`tabindex`), 포커스 막대 ring + 툴팁 |
| loading | 차트 영역 막대 자리 `Skeleton` 6–12개(높이 랜덤 고정값) |
| error | 차트 영역 `ErrorState` 인라인(축 숨김) + 재시도 |
| empty | 축 유지 + 중앙 "이 기간 실적이 없어요" `text-muted` (막대 없음) |

- 가로 스크롤 허용 영역(시간 24개 등 많을 때) — 단, 스냅/관성 자연스럽게, 컨테이너 밖 침범 금지.
- 색 외 패턴(피크 라벨/값 표기)으로 피크 식별 보강.

---

## G. Field (입력) — 본인인증용

`label`(상단 `text-sm` font-500 `text-fg`) + `input` + helper/error(`text-caption`).

- input: h-12(48) `bg-surface-sunken`(또는 surface+border) `rounded-md` `px-4` `text-body` `text-fg`, placeholder `text-subtle`.
- 휴대폰/인증번호: `inputmode="numeric"` `autocomplete`(tel / one-time-code), 숫자 `tabular-nums`.

| 상태 | 스타일 |
|------|--------|
| default | `border border-border` |
| focus | `border-primary` + `shadow-focus`(ring), 라벨 색 유지 |
| filled | 동일, 값 `text-fg` |
| disabled | `opacity-50` `bg-surface-sunken` `cursor-not-allowed` |
| loading | 우측 인라인 `Spinner`(인증요청/확인 중), 입력 잠금 |
| error | `border-danger` + helper 자리 `text-danger` 메시지 + `!` 아이콘, `aria-invalid` `aria-describedby` |
| success | (인증완료) `border-success` + 우측 체크 `text-success` |

- 인증번호 타이머: 우측 `text-caption text-muted`(`mm:ss`), 만료 시 `text-danger` + "재요청" 텍스트버튼.
- 에러 메시지는 색+아이콘+문구 3중(색 단독 금지).

---

## H. 공통 상태 컴포넌트

### Skeleton
- `.skeleton`(globals) 시머. 실제 콘텐츠와 **동일 레이아웃/크기**로 배치(레이아웃 시프트 0).
- reduced-motion 시 정적 회색.

### EmptyState
- 구성: 일러스트/아이콘(중립, `text-subtle`) + 제목(`text-h3`) + 설명(`text-sm text-muted`) + 액션(옵션 Button).
- 사용처: 기간 내 기록 없음, 미바인딩(아직 데이터 매칭 전) 등. 카피는 cmo 확정 전 placeholder.

### ErrorState
- 구성: 경고 아이콘(`text-danger`) + 제목 + 설명(`text-sm text-muted`) + 재시도 Button(secondary).
- 네트워크/조회 실패에 사용. 카드 단위는 카드 내 인라인 에러로 축소.

### Spinner
- 원형 회전, `currentColor`, sm(16)/md(20)/lg(24). `aria-label="로딩 중"`.

### Toast
- `bg-surface-elevated` `shadow-lg` `rounded-md` `p-3` + 좌측 상태 아이콘 + 텍스트. 하단(모바일) 등장 200ms.
- variant: success/danger/info. `aria-live="polite"`(danger 는 `assertive`). 자동 닫힘 3–4s + 수동 닫기.

---

## 상태 매트릭스 요약

| 컴포넌트 | default | hover | active | focus | disabled | loading | error | empty |
|----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Button | ● | ● | ● | ● | ● | ● | n/a | n/a |
| PeriodTabs | ● | ● | ● | ● | △ | n/a | n/a | n/a |
| StatCard | ● | △ | △ | △ | n/a | ● | ● | ● |
| SlaScore | ● | n/a | n/a | aria | n/a | ● | ● | ● |
| PeakHourChart | ● | ● | ● | ● | n/a | ● | ● | ● |
| Field | ● | n/a | n/a | ● | ● | ● | ● | n/a |

● 정의 · △ 조건부(인터랙티브일 때) · n/a 해당없음 · aria 시각상태 대신 aria 라벨
