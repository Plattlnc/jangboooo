import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// 메타/SEO: 값 SSOT = docs/seo-checklist.md(cmo) + docs/design/04-brand-assets.md(uxui).
// 사적 도구이므로 전역 noindex(검색 비노출), OG/PWA 는 공유·홈화면 경험용.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "배달장부2",
  title: "배달장부2 — 내 배달 실적 대시보드",
  description:
    "완료·수락률·취소까지 내 배달 실적을 오늘·주·월로 한눈에. 라이더 본인용 대시보드.",
  // 사적 데이터 보호 (seo-checklist §4) — 전 경로 검색 비노출.
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "배달장부2",
    title: "배달장부2 — 내 배달 성적표",
    description:
      "완료·수락률·취소까지 내 배달 실적을 오늘·주·월로 한눈에. 라이더 본인용 대시보드.",
    locale: "ko_KR",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "배달장부2 미리보기" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "배달장부2 — 내 배달 성적표",
    description:
      "완료·수락률·취소까지 내 배달 실적을 오늘·주·월로 한눈에. 라이더 본인용 대시보드.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "배달장부2",
  },
};

// 모바일 퍼스트 + safe-area + dark-first 상태바색 (04-brand-assets §1).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 테마: next-themes(attribute="class") 라이트 기본 + 다크 토글(#15). suppressHydrationWarning 필수.
  // 폰트: --font-sans=Pretendard(CDN), --font-emoji=Tossface(globals @font-face).
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
