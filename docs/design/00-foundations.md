# 00 · Foundations

토큰·반응형·다크모드·접근성·모션의 기준. 모든 화면/컴포넌트 명세가 여기를 전제한다.

---

## 1. 토큰 사용 규칙

- **하드코딩 금지.** `#`, `px`(폰트/색) 직접 입력 대신 의미 토큰 유틸 사용.
- Primitive(`--brand-600`, `--gray-200` …)는 직접 쓰지 않는다. 항상 Semantic 경유.
- 새 색이 필요하면 토큰을 추가(요청)하고 쓰는다. 컴포넌트에서 즉석 색 생성 금지.

### 색 의미 매핑

| 용도 | 토큰(유틸) |
|------|-----------|
| 앱 배경 | `bg-bg` |
| 카드/시트 표면 | `bg-surface` |
| 떠있는 표면(모달/팝오버) | `bg-surface-elevated` |
| 들어간 영역(입력/트랙) | `bg-surface-sunken` |
| 본문 텍스트 | `text-fg` |
| 보조 텍스트 | `text-muted` |
| 캡션/플레이스홀더 | `text-subtle` |
| 구분선/테두리 | `border-border` (강조: `border-border-strong`) |
| 주요 액션 | `bg-primary text-primary-fg` (hover/active 토큰 별도) |
| 연한 강조 배경 | `bg-primary-subtle` |
| 상태(좋음/주의/나쁨/정보) | `success` / `warning` / `danger` / `info` (+ `-fg`, `-subtle`) |

### SLA / 지표 상태 색 매핑 (임계값)

지표 값 → 상태 색 변환 기준. **frontend 가 색을 자의로 고르지 않도록 여기서 고정.**

| 구간 | 상태 | 색 | SLA 점수 예시 | 수락률 예시 |
|------|------|-----|--------------|-----------|
| 우수 | success | `text-success` / `bg-success-subtle` | ≥ 90 | ≥ 95% |
| 주의 | warning | `text-warning` / `bg-warning-subtle` | 70–89 | 85–94% |
| 위험 | danger | `text-danger` / `bg-danger-subtle` | < 70 | < 85% |

> 임계값 수치는 backend SLA 산식 확정 시 동기화한다. 색-구간 매핑 패턴은 유지.

**🔴 레드(danger) 절제 원칙 (cmo 브랜딩):** 라이더에게 빨강은 *'벌점·단속'* 으로 읽힌다.
- 부진/주의의 **1차 색은 앰버(warning)**. 레드는 `< 70`(SLA)·`< 85%`(수락률) 같은 **진짜 위험 구간에만 최소·신중하게**.
- 거절/배차취소/배달취소 카드: 값이 있어도 카드 전체를 빨갛게 칠하지 않는다. 값/델타에만 색을 점적으로.
- 색은 **숫자를 받쳐주는 보조** — 숫자가 주인공. 절대 색 블록이 화면을 지배하지 않게.

---

## 2. 반응형 (모바일 퍼스트)

기준 브레이크포인트 3개. **base = 375px 디자인.** 위로 확장.

| 토큰 | 폭 | 대상 | 레이아웃 변화 |
|------|----|------|--------------|
| (base) | 375px | 라이더 폰 (기본) | 단일 컬럼, 카드 1열, 풀폭 |
| `md:` | 768px | 태블릿/큰 폰 가로 | 지표 카드 2열, 좌우 패딩 증가 |
| `xl:` | 1280px | 데스크탑(부수적) | `app-container`(480px) 가운데 고정 — **폰 너비 유지**, 양옆 여백 |

원칙:
- 앱 본문은 항상 `app-container`(max-width 480px) 안. 데스크탑에서도 폰 폭을 유지(라이더 앱 정체성).
- 좌우 기본 패딩: base `px-4`(16) → `md:px-6`(24).
- 터치 영역은 화면 크기와 무관하게 ≥ 44px.
- 세로 스크롤 단일 흐름. 가로 스크롤 금지(차트 내부 제외).

---

## 3. 다크모드 (Dark-first)

cmo 브랜딩 §6: **밤·새벽·도로 위에서 눈이 편한 다크 우선.** 다크가 1순위 무드, 라이트는 동등 지원.

- **권장 기본값**: `<html data-theme="dark">` 로 다크를 디폴트 노출(frontend 가 layout 에 설정). 라이더의 야간/저전력 사용 맥락 반영.
- **자동**: 위 명시값이 없으면 시스템 `prefers-color-scheme: dark` 를 따름.
- **수동 오버라이드**: `data-theme="dark"` / `data-theme="light"` (토글 UI 는 추후, 현재는 속성만 정의).
- 야외 직사광 가독을 위해 다크에서도 본문/지표 대비를 AA 이상으로 유지(숫자는 특히 또렷하게).
- 컴포넌트는 다크 분기 코드를 작성하지 않는다 — 의미 토큰이 자동 전환.
  예외 보정이 필요할 때만 `dark:` 유틸(`globals.css` 의 `@custom-variant dark` = `[data-theme="dark"]` 정렬) 사용.
- 다크에서 그림자는 약하고 표면 명도 차로 elevation 표현. status `-subtle` 은 다크에서 반투명(rgba)로 전환됨.

---

## 4. 접근성 (WCAG 2.1 AA)

| 항목 | 기준 |
|------|------|
| 본문 대비 | ≥ 4.5:1 (`text-fg`/`text-muted` on `surface`/`bg` 충족) |
| 큰 텍스트(≥18.66px bold / 24px) | ≥ 3:1 |
| 비텍스트(아이콘/테두리/포커스링) | ≥ 3:1 |
| 터치 타깃 | ≥ 44×44px (`touch-target`), 간격 ≥ 8px |
| 포커스 가시성 | `:focus-visible` 2px outline + 2px offset (`--focus-ring`) — 제거 금지 |
| 색 단독 의존 금지 | 상태는 색 + 아이콘/라벨/수치 병행 (예: 위험 = 빨강 + ↓ + 수치) |
| 모션 민감 | `prefers-reduced-motion` 시 애니메이션 무력화(globals 처리) |
| 폼 라벨 | 모든 입력에 연결된 `<label>` / `aria-label`, 에러는 `aria-describedby` |
| 라이브 영역 | 점수 갱신/토스트는 `aria-live="polite"` |
| 의미 구조 | 랜드마크(`header`/`main`), 제목 위계(h1→h3), 탭은 `role="tablist"` |

- 텍스트 최소 16px(본문). 12px(`text-caption`)는 보조 라벨에만, 본문 금지.
- 대비 검증 대상 조합은 각 화면 명세의 "대비" 항목 참조.

---

## 5. 모션 / 마이크로인터랙션

- 표준 지속시간: **200–300ms**. 토큰: `--dur-fast 150` / `--dur-base 200` / `--dur-slow 300`.
- 이징: `--ease-standard` (진입/상태변화 기본), `--ease-emphasized`(강조 진입), `--ease-out`(퇴장).
- 적용 가이드:

| 인터랙션 | 속성 | 시간 / 이징 |
|---------|------|------------|
| 버튼 press | transform scale .97 + bg | 150ms / standard |
| 탭 전환 인디케이터 | transform/translate | 200ms / standard |
| 카드 진입(stagger) | opacity + translateY 8px | 200ms / out, 40ms 간격 |
| SLA 점수 카운트업 | 숫자 보간 | 600ms / out (1회, reduced-motion 시 즉시) |
| 시트/모달 등장 | translateY + scrim fade | 250ms / emphasized |
| 스켈레톤 시머 | background-position | 1.4s loop (`.skeleton`) |
| 토스트 | translateY + opacity | 200ms in / 150ms out |

- transform/opacity 위주(레이아웃 리플로우 유발 속성 애니메이션 지양).
- 과한 바운스/스프링 금지 — 데이터 신뢰가 핵심인 도구형 앱.

---

## 6. Z-index / 레이어

`tokens.css` 의 스케일 사용: base 0 · sticky(기간 탭) 100 · dropdown 200 · overlay(scrim) 300 · modal(바텀시트) 400 · toast 500.

---

## 7. 아이코노그래피 / 그리드

- 아이콘: 라인 스타일, 24px 기준(작게 20/16), stroke 1.5–2. 라이브러리는 frontend 재량(lucide 권장) — 시각 무게 일관 유지.
- 간격: 4px 베이스(`gap-2`=8, `gap-3`=12, `gap-4`=16). 카드 내부 패딩 기본 `p-4`(16) → `md:p-5`(20).
- 카드 라운딩 `rounded-card`(16), 시트 상단 `rounded-2xl`(24).
