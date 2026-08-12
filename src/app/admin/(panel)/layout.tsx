import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { isAdminSession } from "@/lib/auth/admin-cookies";
import { signOutAdmin } from "@/actions/admin-auth";
import { AdminMenuButton } from "@/components/admin/admin-drawer";
import { BrandLogo } from "@/components/ui/brand-logo";

export const metadata: Metadata = {
  title: "관리자 · 슬라이더",
  robots: { index: false, follow: false },
};

// 관리자 영역 공통 레이아웃 — 미들웨어에 더해 서버측 이중 가드(SSOT: middleware.ts).
// 라이더 앱과 동일한 app-container(480). 2026-07-31 개편: 좌측 햄버거 드로어(정비소 등
// 보조 메뉴) + 하단 플로팅 pill 4탭(홈/라이더/지표/목표) — main 하단 여백은 플로팅 탭 높이 확보.
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminSession())) redirect("/admin/login");

  return (
    <div className={`geist-admin ${GeistSans.variable} ${GeistMono.variable} app-container flex min-h-dvh flex-col bg-jb-surface`}>
      {/* 라이더 앱과 동일 — 분리된 바 아님, 배경 위 플로팅 요소(햄버거·중앙 브랜드·로그아웃 카드). */}
      <header className="relative flex items-center px-3.5 pt-3 pb-1">
        <AdminMenuButton />
        <Link
          href="/admin"
          className="absolute left-1/2 top-3 flex h-10 -translate-x-1/2 items-center gap-1.5"
        >
          <BrandLogo size={21} />
          <span className="text-[16px] font-black tracking-[-0.03em] text-jb-ink">슬라이더</span>
          <span className="rounded-[7px] bg-jb-indigo-tint px-1.5 py-[3px] text-[10px] font-black leading-none text-jb-indigo">
            관리자
          </span>
        </Link>
        <form action={signOutAdmin} className="ml-auto">
          <button
            type="submit"
            className="flex h-10 items-center rounded-[13px] bg-jb-card px-3 text-[11.5px] font-bold text-jb-ink-soft shadow-[var(--toss-shadow)] transition-transform active:scale-95"
          >
            로그아웃
          </button>
        </form>
      </header>
      <main className="flex-1 pb-8 text-jb-ink">{children}</main>
    </div>
  );
}
