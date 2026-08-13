import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { SettlementSidebar } from "@/components/settlement/settlement-nav";

export const metadata: Metadata = {
  title: "정산 · 슬라이더",
  robots: { index: false, follow: false },
};

// 정산 영역 공통 레이아웃 — 데스크톱 퍼스트. 좌측 사이드바(md+) / 상단바(모바일) + 넓은 본문.
// 미들웨어에 더해 서버측 이중 가드. Geist 폰트 + 토스 팔레트(.geist-admin 스코프 재사용).
export default async function SettlementPanelLayout({ children }: { children: ReactNode }) {
  if (!(await isSettlementSession())) redirect("/settlement/login");

  return (
    <div
      className={`geist-admin font-pretendard ${GeistSans.variable} ${GeistMono.variable} flex min-h-dvh flex-col bg-jb-surface text-jb-ink md:flex-row`}
    >
      <SettlementSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
