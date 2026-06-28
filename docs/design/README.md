# jangboooo 디자인 시스템 · 화면 명세 (SSOT)

> 라이더 개인 SLA 대시보드 · **모바일 퍼스트** (절대 데스크탑 우선 아님).
> frontend 는 이 문서 + 토큰만 보고 구현한다. JSX 는 이 디렉토리에 없다.

## 문서 구성

| 문서 | 내용 |
|------|------|
| [00-foundations.md](./00-foundations.md) | 토큰 사용법, 반응형(375/768/1280), 다크모드, 접근성(WCAG AA), 모션 |
| [01-component-library.md](./01-component-library.md) | 컴포넌트 인벤토리 + 상태별 스타일(default/hover/active/focus/disabled/loading/error/empty) |
| [02-screen-login.md](./02-screen-login.md) | 로그인 화면 (카카오 간편로그인 + 휴대폰 본인인증 플로우) |
| [03-screen-dashboard.md](./03-screen-dashboard.md) | ~~대시보드 (SLA 점수안)~~ **→ [06](./06-dashboard-redesign.md) 으로 대체(superseded)** |
| [04-brand-assets.md](./04-brand-assets.md) | 브랜드 에셋 (OG / PWA 아이콘 / 파비콘 / manifest·theme 색) — cmo SEO 대응 |
| [05-shadcn-redesign.md](./05-shadcn-redesign.md) | shadcn 재정렬 (라이트/다크 팔레트 토큰 · Pretendard · tossface 이모지 맵 · 컴포넌트 매핑) |
| [06-dashboard-redesign.md](./06-dashboard-redesign.md) | **대시보드 Figma 개편 (SSOT)** — 수락률 원형 게이지(밴드 3색)·드로어·치수/타이포·AA 보정·토큰 매핑 |

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

## 브랜드 표기 (서비스명)

- **사용자 노출 서비스명: `배달장부2`** (확정 2026-06-28). 코드네임 `jangboooo` 는 내부/레포용 — UI 노출 금지.
- 노출 위치(전부 `배달장부2`):
  - 로그인 S1 로고/워드마크 영역 ([02-screen-login.md](./02-screen-login.md) §S1)
  - 문서 `<title>` / `metadata.title` (frontend `src/app/layout.tsx` — 스캐폴드 "Create Next App" 교체 필요)
  - 브라우저 탭 / PWA 앱 이름 / OG 타이틀 (cmo `docs/seo-checklist.md` 와 정합)
- 로고 비주얼 미확정 → 당분간 워드마크(텍스트) "배달장부2", 타이포 `text-h1`/`text-display` + `text-fg`.

## 브랜딩 연동 상태

- 브랜드 휴(brand hue): cmo 브랜딩 §6 반영 완료 — **신뢰 블루**(`--brand-600 #2563eb`). `tokens.css` 의 `--brand-50..900` 1개 블록만 교체하면 전 화면 반영.
- 무드: **dark-first**(야간/도로 가독), 레드 절제→앰버 우선, 숫자 우선 (00-foundations 반영).
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
