# jangboooo 디자인 시스템 · 화면 명세 (SSOT)

> 라이더 개인 SLA 대시보드 · **모바일 퍼스트** (절대 데스크탑 우선 아님).
> frontend 는 이 문서 + 토큰만 보고 구현한다. JSX 는 이 디렉토리에 없다.

## 문서 구성

| 문서 | 내용 |
|------|------|
| [00-foundations.md](./00-foundations.md) | 토큰 사용법, 반응형(375/768/1280), 다크모드, 접근성(WCAG AA), 모션 |
| [01-component-library.md](./01-component-library.md) | 컴포넌트 인벤토리 + 상태별 스타일(default/hover/active/focus/disabled/loading/error/empty) |
| [02-screen-login.md](./02-screen-login.md) | 로그인 화면 (카카오 간편로그인 + 휴대폰 본인인증 플로우) |
| [03-screen-dashboard.md](./03-screen-dashboard.md) | 대시보드 (기간 탭 / SLA 점수 / 지표 카드 / 피크시간 차트) |

## 토큰 소스 (코드)

| 파일 | 역할 |
|------|------|
| `src/styles/tokens.css` | **단일 진실 소스.** Primitive→Semantic→`@theme inline`(Tailwind 유틸 노출) |
| `src/app/globals.css` | tailwind + 토큰 import, base 리셋, safe-area, 다크 변형, 헬퍼 유틸 |
| `tailwind.config.ts` | content 글롭 / darkMode 전략 (색·스케일 중복 정의 금지) |

## 핵심 원칙

1. **하드코딩 색/크기 금지.** 반드시 의미 토큰(유틸) 사용 — `bg-surface`, `text-muted`, `rounded-card`, `shadow-card`.
2. **모바일 퍼스트.** 기본 스타일 = 375px. `md:`(768) / `xl:`(1280) 는 확장만. 앱은 `app-container`(max 480px) 안에서 폰 너비 유지.
3. **터치 우선.** 모든 인터랙티브 요소 ≥ 44×44px (`touch-target`).
4. **상태는 빠짐없이.** 모든 인터랙티브/데이터 컴포넌트는 default·hover·active·focus·disabled·loading·error·empty 를 정의한다.
5. **다크모드 자동.** 토큰이 `prefers-color-scheme` + `[data-theme]` 로 전환 → 컴포넌트는 별도 분기 불필요.

## 브랜딩 연동 상태

- 색/네이밍/톤의 **브랜드 휴(brand hue)** 는 `tokens.css` 상단 `PROVISIONAL` 블록에 임시값(인디고).
- cmo 브랜딩 가이드 도착 시 `--brand-50..900` 1개 블록만 교체하면 전 화면 반영됨.
- Kakao 컬러(`--kakao-bg #fee500`)는 **고정 브랜드 자산** — 변경 금지.

## 유틸 네이밍 빠른 참조

```
표면   bg-bg · bg-surface · bg-surface-elevated · bg-surface-sunken
텍스트 text-fg · text-muted · text-subtle · text-on-brand
선     border-border · border-border-strong
주요   bg-primary · text-primary · bg-primary-subtle (hover/active 토큰 존재)
상태   success / warning / danger / info  (각 -fg, -subtle)
타입   text-score · text-display · text-h1 · text-h2 · text-h3 · text-body · text-sm · text-caption
형태   rounded-card · rounded-2xl · shadow-card · shadow-md · shadow-lg
```
