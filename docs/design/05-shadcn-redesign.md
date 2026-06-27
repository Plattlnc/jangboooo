# 05 · shadcn 디자인 시스템 (라이트/다크 · Pretendard · tossface)

배달장부2 를 **shadcn/ui 컨벤션**으로 재정렬한 스펙. 색/타이포/이모지 액센트 토큰 +
현 컴포넌트 → shadcn 매핑. **JSX 없음, 스펙·토큰만.** frontend 가 이 문서로 마이그레이션한다.

기준 연속성: 브랜드/톤은 [00-foundations](./00-foundations.md)·cmo `branding-guide.md` 그대로.
값 SSOT 는 본 문서의 §2 토큰 블록(=`src/styles/tokens.css` 교체 대상).

---

## 0. 테마 정책 — 라이트 기본 + 다크 토글 (확정)

> **확정(team-lead, 2026-06-28):** **라이트(밝음)가 기본**, 다크(나이트)는 **토글**. 기존 dark-first 에서 뒤집혔다.

- 팔레트는 shadcn 컨벤션대로 **라이트=`:root` 기본 / 다크=`.dark` 오버라이드** 둘 다 정의(§2).
- **런타임 기본 = 라이트.** `<html>` 에 클래스 없음(=라이트). 사용자가 토글하면 `.dark` 추가.
  - 권장 동작(frontend): 최초엔 라이트 기본, 사용자가 명시 토글 시 그 값을 저장(localStorage). 시스템 `prefers-color-scheme`는 무시하거나 "시스템 따름" 옵션으로만(라이트 기본 정책 유지). FOUC 방지용 인라인 스크립트로 초기 클래스 세팅.
- 다크는 1급 지원(야간/도로 가독용 옵션) — 양쪽 팔레트 모두 WCAG AA(§8).
- 다크 변형 셀렉터: **shadcn 표준 `.dark` 클래스로 단일화**(현 `[data-theme="dark"]` 대체). globals.css 의 `@custom-variant dark (&:where(.dark, .dark *));` 로 정렬. (data-theme 잔존 시 §2 하단 호환 노트.)

---

## 1. 마이그레이션 개요

| 항목 | 현재(자체 토큰) | shadcn 정렬 후 |
|------|----------------|----------------|
| 색 네이밍 | `--bg/--surface/--text/--primary…` | shadcn 표준 `--background/--foreground/--card/--primary…` (+ `--success/--warning` 확장) |
| 다크 | `[data-theme]` + media | `.dark` 클래스(권장) 또는 data-theme 유지 |
| 컴포넌트 | 자체 ui/* | shadcn primitives(button/card/badge/tabs/input/…) + 자체 보존(gauge/empty/error) |
| 폰트 | Pretendard 스택(유지) | 동일 — §3 |
| 이모지 | 없음 | **tossface 액센트 맵** 신설 — §4 |

색 **정책은 불변**: 신뢰 블루 primary, success=그린·warning=앰버, **레드(destructive)는 파괴적 액션에만 절제**(지표 ‘위험’은 amber 우선, red 최소). 숫자가 주인공.

---

## 2. 팔레트 토큰 블록 (copy-paste — globals.css)

shadcn/Tailwind v4 방식: 원시값은 `:root`/`.dark`, Tailwind 유틸 노출은 `@theme inline`.
값은 **oklch**(shadcn 최신 표준) + 우측에 hex 근사 주석. 미세 톤은 구현 후 대비검수로 보정 가능.

```css
:root {
  --radius: 0.875rem; /* 14px 기준; 카드=rounded-xl, 시트=rounded-2xl */

  /* ── Neutral (cool slate) — Light ── */
  --background:            oklch(1 0 0);            /* #ffffff */
  --foreground:            oklch(0.21 0.04 265);    /* slate-900 #0f172a */
  --card:                  oklch(1 0 0);            /* #ffffff */
  --card-foreground:       oklch(0.21 0.04 265);    /* #0f172a */
  --popover:               oklch(1 0 0);
  --popover-foreground:    oklch(0.21 0.04 265);
  --muted:                 oklch(0.97 0.01 256);    /* slate-100 #f1f5f9 */
  --muted-foreground:      oklch(0.55 0.03 257);    /* slate-500 #64748b */
  --accent:                oklch(0.97 0.01 256);    /* slate-100 (중립 hover) */
  --accent-foreground:     oklch(0.21 0.04 265);
  --border:                oklch(0.92 0.01 256);    /* slate-200 #e2e8f0 */
  --input:                 oklch(0.92 0.01 256);
  --secondary:            oklch(0.97 0.01 256);     /* slate-100 */
  --secondary-foreground: oklch(0.21 0.04 265);

  /* ── Brand / semantic ── */
  --primary:               oklch(0.55 0.22 263);    /* 신뢰 블루 #2563eb (brand-600) */
  --primary-foreground:    oklch(0.985 0 0);        /* #ffffff */
  --ring:                  oklch(0.55 0.22 263);    /* focus = 브랜드 블루 */

  --success:               oklch(0.60 0.13 163);    /* emerald-600 #059669 */
  --success-foreground:    oklch(0.985 0 0);
  --warning:               oklch(0.70 0.16 70);     /* amber-600 #d97706 */
  --warning-foreground:    oklch(0.21 0.04 265);    /* 어두운 글자(앰버 위 대비) */
  --destructive:           oklch(0.58 0.22 27);     /* red-600 #dc2626 — 파괴적 액션 전용, 절제 */
  --destructive-foreground:oklch(0.985 0 0);

  /* subtle 배경(상태 칩/배너) — 알파 틴트 */
  --primary-subtle:   color-mix(in oklch, var(--primary) 12%, var(--background));
  --success-subtle:   color-mix(in oklch, var(--success) 14%, var(--background));
  --warning-subtle:   color-mix(in oklch, var(--warning) 16%, var(--background));
  --destructive-subtle:color-mix(in oklch, var(--destructive) 12%, var(--background));

  /* 차트(피크시간/게이지) */
  --chart-1: var(--primary);
  --chart-2: oklch(0.62 0.19 260);   /* blue-500 보조 */
  --chart-3: var(--success);
  --chart-4: var(--warning);
  --chart-5: oklch(0.55 0.03 257);   /* muted */

  /* 고정 브랜드 자산 — 변경 금지 */
  --kakao:    #fee500;
  --kakao-foreground: #191600;
}

.dark {
  /* ── Neutral — Dark (나이트 토글 — 야간/도로 가독 옵션) ── */
  --background:            oklch(0.16 0.02 265);    /* slate-950 ~#060b18 */
  --foreground:            oklch(0.98 0.003 247);   /* slate-50 #f8fafc */
  --card:                  oklch(0.21 0.04 265);    /* slate-900 #0f172a */
  --card-foreground:       oklch(0.98 0.003 247);
  --popover:               oklch(0.24 0.04 265);    /* slate-800 elevated */
  --popover-foreground:    oklch(0.98 0.003 247);
  --muted:                 oklch(0.27 0.03 260);    /* slate-800 */
  --muted-foreground:      oklch(0.70 0.03 257);    /* slate-400 #94a3b8 */
  --accent:                oklch(0.27 0.03 260);
  --accent-foreground:     oklch(0.98 0.003 247);
  --border:                oklch(1 0 0 / 10%);      /* 미묘한 분리(다크 표준) */
  --input:                 oklch(1 0 0 / 12%);
  --secondary:            oklch(0.27 0.03 260);
  --secondary-foreground: oklch(0.98 0.003 247);

  --primary:               oklch(0.62 0.19 260);    /* blue-500 #3b82f6 (다크에서 한 단계 밝게) */
  --primary-foreground:    oklch(0.985 0 0);        /* 흰 글자(블루 위 대비) */
  --ring:                  oklch(0.62 0.19 260);

  --success:               oklch(0.70 0.15 162);    /* emerald-500 (밝음 → 어두운 글자) */
  --success-foreground:    oklch(0.16 0.02 265);
  --warning:               oklch(0.79 0.16 75);     /* amber-500 (밝음 → 어두운 글자) */
  --warning-foreground:    oklch(0.16 0.02 265);
  --destructive:           oklch(0.65 0.20 25);     /* red-500 */
  --destructive-foreground:oklch(0.985 0 0);        /* 흰 글자(레드 위 대비) */

  --primary-subtle:   color-mix(in oklch, var(--primary) 22%, var(--background));
  --success-subtle:   color-mix(in oklch, var(--success) 22%, var(--background));
  --warning-subtle:   color-mix(in oklch, var(--warning) 22%, var(--background));
  --destructive-subtle:color-mix(in oklch, var(--destructive) 20%, var(--background));

  --chart-2: oklch(0.70 0.16 255);
  --chart-5: oklch(0.70 0.03 257);
}

@theme inline {
  /* shadcn 표준 색 유틸 (bg-background, text-foreground, bg-card, bg-primary …) */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  /* 확장 시맨틱 (shadcn 기본엔 없음 — 지표 상태용) */
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-primary-subtle: var(--primary-subtle);
  --color-success-subtle: var(--success-subtle);
  --color-warning-subtle: var(--warning-subtle);
  --color-destructive-subtle: var(--destructive-subtle);
  --color-kakao: var(--kakao);
  --color-kakao-foreground: var(--kakao-foreground);

  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* 반경(shadcn 파생) */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  /* 폰트 — §3 */
  --font-sans: "Pretendard Variable", "Pretendard", "Apple SD Gothic Neo",
    -apple-system, system-ui, "Noto Sans KR", sans-serif;
  --font-emoji: "Tossface", "Apple Color Emoji", "Segoe UI Emoji", sans-serif;
}
```

> **호환 노트(다크 셀렉터):** 위는 shadcn 표준 `.dark`. 현 코드의 `[data-theme="dark"]` 를 유지하려면
> `.dark` 블록 셀렉터를 `.dark, [data-theme="dark"]` 로 바꾸고 globals.css 의
> `@custom-variant dark (&:where(.dark, .dark *));` 로 정렬. 권장은 `.dark` 클래스 단일화.

> **레드 절제 정책(불변):** `destructive` 는 *삭제/로그아웃/되돌릴 수 없는 액션* 에만.
> 지표 ‘주의’는 `warning`(앰버), ‘위험(SLA<70)’ 만 `destructive` 텍스트로 점적. 카드 전체 적색 금지.

---

## 3. 타이포그래피 (Pretendard · 고가독 위계)

폰트는 현행 유지(Pretendard variable dynamic-subset, `--font-sans` 폴백에 Apple SD Gothic Neo/Noto Sans KR). 숫자는 `tabular-nums`(지표 떨림 방지).

| 역할 | 유틸(권장) | 크기/행간/자간 | 무게 | 용도 |
|------|-----------|----------------|------|------|
| score | `text-[3.5rem]/none tracking-tight` | 56 / 1.0 / -0.02em | 700 | SLA 메인 점수 |
| display | `text-4xl` | 36 / 1.1 | 700 | 큰 강조 |
| h1 | `text-2xl` | 28 / 1.25 | 700 | 화면 제목 |
| h2 | `text-[1.375rem]` | 22 / 1.3 | 600 | 섹션 제목 |
| h3 | `text-lg` | 18 / 1.4 | 600 | 카드 제목 |
| body | `text-base` | 16 / 1.55 | 400 | 본문(모바일 기준) |
| sm | `text-sm` | 14 / 1.5 | 400~500 | 보조 |
| caption | `text-xs` | 12 / 1.4 | 500 | 라벨/캡션(본문 금지) |

- 위계 규칙: 한 화면에 h1 1개, 숫자(지표)가 시각 1순위. 색은 위계 보조.
- 본문 최소 16px, 캡션 12px 미만 금지(차트 축 라벨도 `text-xs`).
- `font-feature-settings: "tnum"` 은 globals base 의 `.tabular-nums`/`[data-numeric]` 유지.

---

## 4. tossface 이모지 액센트 맵

[tossface](https://github.com/toss/tossface)(Toss, 오픈소스 이모지 폰트)로 지표·상태에 **작은 액센트**를 준다. 컬러풀하지만 **숫자가 주인공·이모지는 보조**(라벨 옆 소형). 색 정책(레드 절제)과 무관한 별도 채널이되 과용 금지.

**로딩(frontend):** Tossface 웹폰트 로드 후 이모지 노드에 `font-family: var(--font-emoji)`("Tossface" 우선) 적용. CDN/self-host URL 은 frontend 가 공식 배포처(toss/tossface) 확인 후 확정. 미로딩 시 OS 기본 이모지로 폴백(레이아웃 영향 0).

**사용 규칙:**
- 크기: 라벨과 동급(16~18px), 라벨 좌측 `gap-1`. 점수/숫자보다 크게 금지.
- **장식 전용:** `aria-hidden="true"`. 의미는 항상 텍스트 라벨이 전달(이모지 단독 금지). 색·이모지 동시 의존 금지(a11y).
- 톤: 감시/벌점 인상 금지(🚨🆘 같은 경보성 지양 — cmo §8). 차분·중립 우선.
- 과용 금지: 한 카드 1개. 동기부여 배너 등 1곳에만.

**위치별 맵 (03 대시보드):**

| 위치 | 이모지 | 의미 | 비고 |
|------|:--:|------|------|
| SLA 점수 라벨 | 🛡️ | 신뢰/보호 | 게이지엔 미부착(라벨 옆만) |
| 완료 | ✅ | 정상 완료 | |
| 거절 | 🙅 | 콜 받지 않음 | ❌/🚫(경보성) 대신 중립 제스처 |
| 배차취소 | 🔄 | 픽업 전 취소 | 되돌림 뉘앙스, 적색 경보 회피 |
| 배달취소 | 📦 | 픽업 후 취소 | 상자(배달물) |
| 수락률 | 🤝 | 콜 수락 비율 | |
| 시간대별 실적(섹션) | ⏰ | 시간대 | |
| 피크 구간 하이라이트 | 🔥 | 가장 많이 달린 때 | 피크 막대/문구 옆 1회 |
| 동기부여 호조 | 💪 | 잘하고 있음 | success 배너 |
| 동기부여 회복여지 | 🌱 | 아직 기회 있음 | warning 배너(질책 아님) |
| 마지막 갱신 | 🔄 | 자동 갱신 | 또는 상태 dot 유지(택1) |
| 안전운행 인사 | 🛵 | 라이더 | 헤더 인사 1회(선택) |
| 기간 탭(그룹) | 📅 | 오늘/주/월 탭 영역 | 탭 라벨 옆 per-탭 부착 금지(혼잡) — 섹션/접근성 라벨 옆 1회만, 또는 생략 |

**기간 탭 per-탭(선택 — 강조 시에만, 기본 생략 권장):** 오늘 ☀️ · 이번 주 🗓️ · 이번 달 📆. (텍스트 라벨이 주, 이모지는 장식)

**로그인(02):**

| 위치 | 이모지 | 의미 | 비고 |
|------|:--:|------|------|
| S1 히어로/브랜드 | 🛵 | 라이더·내 배달 | 워드마크/히어로 옆 1회(선택) |
| 카카오 CTA | (없음) | — | 카카오 심볼 고정 자산만, 이모지 부착 금지 |
| S2 본인확인 안내 | 📱 | 휴대폰 인증 | |
| S2 안심 카드 | 🛡️ | 평가 아님·안전 | ShieldCheck 아이콘과 택1 |
| S5a 연결 성공 | 🎉 | 기록 찾음 | 과하지 않게 1회 |
| S5b 연결 실패 | 📭 | 기록 못 찾음 | 경보성(❌) 금지 — 중립 |

**상태(공통):**

| 상태 | 이모지 | 위치 |
|------|:--:|------|
| 빈 상태(기록 없음) | 📭 | EmptyState |
| 에러 | ⚠️ | ErrorState(아이콘과 택1) |
| 연결 성공(S5a) | 🎉 | 과하지 않게 1회 |
| 인증/본인확인(S2) | 📱 | 안내 |

---

## 5. 현 컴포넌트 → shadcn 매핑

`npx shadcn@latest add <name>` 로 도입. 자체 컴포넌트는 보존(shadcn 미제공). 색/타이포는 §2·§3 토큰으로 자동 정렬.

| 현 컴포넌트 | shadcn primitive | 변형/메모 |
|-------------|------------------|-----------|
| `ui/button` | `button` | variant: default(=primary)·secondary·ghost·outline·destructive / size sm·default·lg·icon. **kakao 는 커스텀 variant**(`bg-kakao text-kakao-foreground`). loading/leftIcon 은 래퍼로 유지 |
| `ui/card` + StatCard | `card`(Card/Header/Title/Content/Footer) | StatCard = Card 조합. 값 주인공 레이아웃 유지 |
| `ui/badge` | `badge` | 기본 variant + **success/warning 확장**. 델타 칩 = Badge + ArrowUp/Down. 색 단독 금지 유지 |
| `ui/segmented-tabs` / PeriodTabs | `tabs`(Tabs/List/Trigger/Content) 또는 `toggle-group` | 세그먼트 스타일. URL=SSOT 동작 유지. sticky 래퍼 유지 |
| `ui/field` | `label` + `input` + `form`(FormItem/Control/Message) | 에러 색+아이콘+문구 3중·aria-invalid/describedby 유지 |
| `ui/skeleton` | `skeleton` | shadcn skeleton(=`animate-pulse`)로 교체 가능. 시머 원하면 자체 `.skeleton` 유지 |
| `ui/spinner` | (없음) | lucide `Loader2` + `animate-spin` 권장, 또는 자체 유지 |
| `ui/toast` | `sonner` | shadcn 신표준 sonner 권장(자체 Toast 대체). variant→sonner success/error/info |
| `ui/info-tip` | `popover` (+ `tooltip`) | **모바일=탭 토글 popover**(M1 해결과 정합, 주). 데스크탑 hover 보강이 필요하면 `tooltip` 병행, 단 모바일 단독 의존 금지 |
| `ui/empty-state` | (없음) | 보존. 카드/타이포 토큰만 정렬 + tossface 📭 |
| `ui/error-state` | (없음) | 보존. ⚠️ + 재시도 Button(secondary) |
| 카드/섹션 구분선 | `separator` | StatGrid·차트·푸터 구분 필요 시 `bg-border` separator |
| MotivationBanner | `alert` | shadcn `alert` + success/warning 톤. 아이콘 TrendUp/Clock 유지, tossface 💪/🌱 |
| 테마 토글(신규) | `switch` 또는 `dropdown-menu` | 라이트/다크 토글 UI. `.dark` 클래스 토글 + localStorage. ☀️/🌙 라벨 |
| 로그인 S2~S5 단계/시트 | `sheet`(side=bottom) | 바텀시트/모달 필요 시. 02 카카오 단일 CTA 재설계와 함께 |
| SlaScore 게이지 | (없음) | 자체 SVG 보존. 색=`--chart-1`/상태색, reduced-motion 유지 |
| PeakHourChart | `chart`(recharts) 또는 자체 | 자체 막대 유지 가능. 도입 시 `--chart-*` 토큰 사용 |
| DashboardHeader/FooterActions | 조합 | primitive 없음. Button/타이포 토큰 정렬 |

신규 도입 권장: `popover`(InfoTip), `tooltip`(데스크탑 보강), `sonner`(Toast), `alert`(MotivationBanner), `separator`, `switch`(테마 토글), `sheet`(로그인 재설계), 선택 `dropdown-menu`(설정).

**라이트/다크 각 상태 노트 (공통 패턴 — 토큰이 자동 처리, 컴포넌트 분기 불필요):**
- **표면 elevation:** 라이트=그림자(`shadow-sm/md`)로 띄움. 다크=그림자 약함 → `card < popover` 명도차로 elevation(토큰이 이미 분리).
- **border:** 라이트=`slate-200` 실선. 다크=`white/10%` 반투명(자동).
- **hover:** 라이트=`accent`(slate-100) 살짝 어둡게. 다크=`accent`(slate-800) 살짝 밝게. (둘 다 `hover:bg-accent`)
- **상태색 fill 글자:** primary/destructive=흰 글자, success/warning=어두운 글자(밝은 칩). 라이트·다크 모두 `*-foreground` 토큰이 처리 — **솔리드 칩/버튼은 구현 후 대비 스팟체크**.
- **focus ring:** 양 모드 `ring`(브랜드 블루), 배경 대비 위해 `ring-offset-background`.
- **disabled:** 양 모드 `opacity-50` 공통.

---

## 6. 반경 · 그림자 · 모션 (유지/정렬)

- 반경: `--radius` 14px 기준. 버튼/인풋 `rounded-md`, 카드 `rounded-xl`, 시트 `rounded-2xl`. (현 16px 카드 → rounded-xl(18)로 근사, 시각 차 미미)
- 그림자: shadcn 기본 `shadow-sm/md` + 다크는 표면 명도차로 elevation. 카드 `shadow-sm`, 팝오버/시트 `shadow-lg`.
- 모션: 마이크로인터랙션 200–300ms 유지(00-foundations §5). shadcn 기본 트랜지션과 충돌 없음. `prefers-reduced-motion` 무력화 유지.
- 포커스: `ring`(=브랜드) + `ring-offset`. `:focus-visible` 2px 유지(a11y).

---

## 7. 마이그레이션 순서 (frontend 실행)

> 이번 개편의 **코드(globals.css·tokens.css·컴포넌트) = frontend 소유**. uxui 는 값·스펙(본 문서)만 제공(충돌 방지). 아래는 frontend 실행 순서.

1. `components.json` 셋업(shadcn init, baseColor=slate, css-vars). Tailwind v4.
2. §2 토큰 블록으로 `src/styles/tokens.css` 교체(+globals.css 의 `@custom-variant`/`@theme` 정렬). **빌드/대비검수 먼저.**
3. primitives 도입(button/card/badge/tabs/input/label/form/popover/sonner/alert/skeleton).
4. 자체 컴포넌트 색 클래스 치환(`bg-surface→bg-card`, `text-fg→text-foreground`, `text-muted→text-muted-foreground`, `border-border→border-border`, `bg-primary` 동일 …). 매핑표는 §2.
5. tossface 로드 + 액센트 맵 적용(§4).
6. 테마 토글 + FOUC 방지 초기 스크립트(라이트 기본, `.dark` 토글, localStorage). §0.
7. 디자인 QA 재실행 — **라이트(기본)·다크 양쪽** 상태/대비(AA)/반응형/이모지 점검.

**색 클래스 치환 핵심(현→shadcn):** `bg-bg→bg-background` · `bg-surface→bg-card` · `bg-surface-elevated→bg-popover` · `bg-surface-sunken→bg-muted` · `text-fg→text-foreground` · `text-muted→text-muted-foreground` · `text-subtle→text-muted-foreground`(약하게) · `border-border→border-border` · `*-subtle` 동일 · success/warning/danger→success/warning/destructive.

---

## 8. 접근성 (불변, 라이트 추가분)

- WCAG AA: 라이트·다크 **양쪽** 본문 4.5:1 / 큰 텍스트·비텍스트 3:1. amber 위 글자는 `--warning-foreground`(어두움)로 대비 확보.
- 터치 44px, `:focus-visible` 링, 색 단독 의존 금지(값+아이콘/이모지+라벨). 이모지는 `aria-hidden`.
- destructive(레드)는 액션 한정. 지표 위험은 텍스트+등급 라벨 병행.
- **라이트가 기본**이므로 라이트 모드 대비를 1순위로 검수(흰 배경 위 muted-foreground/primary 링크/상태 칩). 다크는 토글 경로로 동일 AA.
- 솔리드 fill 의 `*-foreground`(특히 success/warning=어두운 글자, primary/destructive=흰 글자)는 구현 후 양 모드 스팟체크.
