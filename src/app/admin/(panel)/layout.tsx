import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth/admin-cookies";
import { signOutAdmin } from "@/actions/admin-auth";
import { AdminBottomNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: "관리자 · 배달장부2",
  robots: { index: false, follow: false },
};

// 관리자 영역 공통 레이아웃 — 미들웨어에 더해 서버측 이중 가드(SSOT: middleware.ts).
// 라이더 앱과 동일한 app-container(480) + 하단 4탭 내비.
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  if (!(await isAdminSession())) redirect("/admin/login");

  return (
    <div className="app-container flex min-h-dvh flex-col bg-white">
      <header className="flex items-center justify-between border-b border-jb-line bg-white px-3.5 py-2.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-black tracking-[-0.02em] text-jb-ink">
            <span aria-hidden="true" className="emoji mr-1">🛵</span>배달장부2
          </span>
          <span className="bg-jb-indigo-tint px-1.5 py-0.5 text-[10.5px] font-black text-jb-indigo">관리자</span>
        </div>
        <form action={signOutAdmin}>
          <button
            type="submit"
            className="bg-jb-track px-2.5 py-1 text-[11.5px] font-bold text-jb-ink-soft"
          >
            로그아웃
          </button>
        </form>
      </header>
      <main className="flex-1 bg-jb-surface pb-20 text-jb-ink">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
