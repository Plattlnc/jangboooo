# SEO / 메타태그 체크리스트

> 소유: cmo. frontend가 `app/layout.tsx`의 Next.js Metadata API로 적용. 값 변경은 cmo 경유.
> 성격: 라이더 본인만 쓰는 **로그인 기반 사적 도구**. 공개 검색 유입이 목적이 아니다.
> → 목표는 ①링크 공유 시 깔끔한 미리보기(카카오톡 공유 중요) ②모바일 PWA 느낌 ③로그인 영역 검색 비노출.

서비스명 자리표시자 `{서비스명}` — 네이밍 확정 시 일괄 치환.

## 1. 기본 메타 (필수)
- [ ] `<title>`: `{서비스명} — 내 배달 실적 대시보드` (50자 내, 핵심 먼저)
- [ ] `meta description`: `완료·수락률·취소까지 내 배달 실적을 오늘·주·월로 한눈에. 라이더 본인용 대시보드.` (80~120자)
- [ ] `lang="ko"` (html 태그)
- [ ] `meta viewport`: `width=device-width, initial-scale=1, viewport-fit=cover` (모바일·노치 대응)
- [ ] `meta charset="utf-8"`
- [ ] `theme-color`: dark-first 메인색 (uxui 토큰 확정 후)

## 2. Open Graph (카카오톡/링크 공유 — 가장 중요)
- [ ] `og:type`: `website`
- [ ] `og:site_name`: `{서비스명}`
- [ ] `og:title`: `{서비스명} — 내 배달 성적표`
- [ ] `og:description`: 위 description과 동일 톤
- [ ] `og:image`: 1200×630, 서비스명+한 줄 카피, dark 배경 (uxui 제작)
- [ ] `og:image:alt`: `{서비스명} 미리보기`
- [ ] `og:url` / `og:locale`: `ko_KR`
- [ ] 카카오톡 공유 시 미리보기 실제 확인 (카톡은 OG 캐시가 강함 — 변경 후 캐시 갱신 필요)

## 3. Twitter/X 카드 (선택, 비용 낮음)
- [ ] `twitter:card`: `summary_large_image`
- [ ] `twitter:title` / `twitter:description` / `twitter:image` (OG 재사용 가능)

## 4. 검색 노출 제어 (중요 — 사적 데이터 보호)
- [ ] **로그인/대시보드/인증 경로**: `robots: noindex, nofollow` (개인 실적은 검색 노출 절대 금지)
- [ ] 공개 가능 페이지(랜딩/소개)만 선택적 `index`. 없으면 전체 noindex도 무방
- [ ] `robots.txt`: 민감 경로(`/dashboard`, `/auth`, `/api`) Disallow
- [ ] sitemap.xml: 공개 페이지가 있을 때만. 사적 도구면 불필요

## 5. PWA / 모바일 앱 느낌
- [ ] `manifest.json`: name, short_name(`{서비스명}`), `display: standalone`, `theme_color`, `background_color`(dark)
- [ ] 홈 화면 추가 아이콘: 192/512 + maskable, apple-touch-icon 180×180 (uxui 제작)
- [ ] `apple-mobile-web-app-capable` / `apple-mobile-web-app-status-bar-style`
- [ ] favicon (라이트/다크)

## 6. 접근성·품질 (간접 SEO)
- [ ] 모든 핵심 카피 시맨틱 마크업, 이미지 `alt`
- [ ] 명도 대비 WCAG AA (야외 가독성)
- [ ] Lighthouse: 모바일 Performance/Accessibility 점검

## 7. 적용 메모 (frontend 전달)
- Next.js 16: 루트 `metadata` export + 경로별 `robots` 설정으로 noindex 분기.
- OG 이미지·아이콘 에셋은 uxui 산출물 대기. 텍스트 메타는 위 값 선반영 가능.
- `{서비스명}` 치환 1곳 누락 없게 — title/og/manifest 전부.

---
연결: [[branding-guide]] · 카피 톤은 `docs/copy/` 준수.
