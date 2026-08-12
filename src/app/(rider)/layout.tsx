import type { ReactNode } from "react";
import { AppBar } from "@/components/dashboard/app-bar";
import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 인증된 라이더 영역 공통 레이아웃 — 배경 위 헤더 + 콘텐츠. (하단 플로팅 내비 제거)
export default async function RiderLayout({ children }: { children: ReactNode }) {
  const profile = await getRiderProfile();

  return (
    <div className="app-container flex min-h-dvh flex-col bg-jb-surface text-jb-ink">
      <AppBar profile={profile} />
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+24px)]">{children}</main>
    </div>
  );
}
