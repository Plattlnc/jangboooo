# 04 · 브랜드 에셋 (OG · PWA 아이콘 · 파비콘 · manifest 색)

cmo SEO 요청(`docs/seo-checklist.md` §1·2·5) 대응 에셋. 서비스명 **배달장부2**, dark-first, 신뢰 블루.
색은 디자인 토큰과 동일값. frontend 가 Next.js Metadata/파일 컨벤션으로 wiring.

---

## 1. 색 값 (manifest / theme-color)

토큰에서 도출한 고정 HEX (다크 기준):

| 용도 | 값 | 근거 토큰 |
|------|----|----------|
| `theme_color` (상태바/브라우저 크롬) | `#0f172a` | `--surface`(dark) — 앱 헤더와 일치 |
| `background_color` (스플래시/PWA 배경) | `#060b18` | `--bg`(dark) = `--gray-950` |
| accent (아이콘/포인트) | `#2563eb` | `--brand-600` = `--primary` |
| 텍스트(에셋 내) | `#f8fafc` / muted `#94a3b8` | `--gray-50` / `--gray-400` |

> 라이트 테마 분기는 PWA 매니페스트가 단일 테마만 안정 지원 → **dark 고정**. (브라우저 `theme-color` 는 `media` 분기 가능하나 dark-first 정책상 dark 1종 권장.)

---

## 2. 생성된 에셋 (드롭인 PNG)

소스 SVG: `design/assets/` (uxui 소유, 수정 시 여기서). 생성 PNG: `public/` 이하.

| 파일 | 크기 | 용도 |
|------|------|------|
| `public/icons/icon-192.png` | 192² | manifest `icons` (purpose any) |
| `public/icons/icon-512.png` | 512² | manifest `icons` (purpose any) |
| `public/icons/icon-maskable-512.png` | 512² | manifest `icons` (purpose **maskable**) — 풀블리드, 안전영역 내 |
| `public/icons/apple-touch-icon-180.png` | 180² | iOS 홈 화면 (`apple-touch-icon`) |
| `public/icons/favicon-32.png` / `favicon-16.png` | 32² / 16² | 파비콘 |
| `public/og-image.png` | 1200×630 | OG/트위터 공유 미리보기 |

소스: `design/assets/icon-master.svg`(아이콘) · `design/assets/og-image.svg`(OG).
재생성: 메인 repo 의 `sharp` 로 SVG→PNG 래스터(글리프는 벡터 도형이라 폰트 비의존). 색/모티프 바꾸면 SVG 수정 후 재래스터.

### 아이콘 디자인
SLA 점수 **게이지**(제품 핵심 지표) + 상승 막대 3개(실적/장부) · 다크 배경 · 신뢰 블루. 글리프는 중앙 안전영역(반경 40% 이내) → maskable 클리핑 안전.

### OG 이미지
좌: 워드마크 "배달장부2" + 카피 "내 배달 성적표, 내 손안에." + 보조 "완료·수락률·취소를 오늘·주·월로 한눈에". 우: 게이지 모티프. 다크 그라데이션 + 블루 글로우.
- 제공 `public/og-image.png` 는 한글 렌더 정상 확인된 정적본 → **그대로 사용 가능**.
- (선택, 권장) 텍스트를 더 또렷·현지화하려면 frontend 가 `src/app/opengraph-image.tsx`(`ImageResponse` + `next/font` Pretendard)로 동적 생성. 레이아웃 SSOT = `design/assets/og-image.svg`.

---

## 3. frontend 적용 (wiring)

> manifest/metadata 는 frontend 소유 `src/app/`. 아래는 값/배치 가이드 — 값 변경은 cmo(텍스트)·uxui(색/에셋) 경유.

### manifest (`src/app/manifest.ts` 또는 `public/manifest.webmanifest`)
```jsonc
{
  "name": "배달장부2",
  "short_name": "배달장부2",
  "description": "완료·수락률·취소까지 내 배달 실적을 오늘·주·월로 한눈에. 라이더 본인용 대시보드.",
  "lang": "ko",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0f172a",
  "background_color": "#060b18",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 메타/OG (`src/app/layout.tsx` metadata) — 값은 cmo `seo-checklist.md` SSOT
- `title`: `배달장부2 — 내 배달 실적 대시보드`
- `description`: 위와 동일
- `themeColor`: `#0f172a` / `viewport`: `width=device-width, initial-scale=1, viewport-fit=cover`
- `icons`: `apple` → `/icons/apple-touch-icon-180.png`, `icon` → favicon
- `openGraph`: `images: ['/og-image.png']`(1200×630), `siteName: 배달장부2`, `locale: ko_KR`
- `twitter`: `card: summary_large_image`, 이미지 OG 재사용
- **noindex**: 대시보드/인증/`api` 경로 `robots: { index:false, follow:false }` (사적 데이터 — seo §4)

### favicon
- 스캐폴드 `src/app/favicon.ico` 존재. 교체하려면 `public/icons/favicon-32.png` 사용 또는 Next.js `app/icon.png` 컨벤션으로 교체(브랜드 아이콘 = 게이지 마크).

---

## 4. 체크리스트 (cmo seo-checklist 매핑)

- [x] theme-color / background_color 토큰 확정 (§1) → `#0f172a` / `#060b18`
- [x] OG 이미지 1200×630 dark, 서비스명+카피 (§2) → `public/og-image.png`
- [x] PWA 아이콘 192/512 + maskable, apple-touch 180 (§5) → `public/icons/`
- [x] favicon (16/32) (§5)
- [ ] (frontend) manifest/metadata/noindex wiring (§1·4·5)
- [ ] (frontend, 선택) opengraph-image 동적 생성으로 전환
