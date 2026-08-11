import type { ReactNode } from "react";
import { AppBar } from "@/components/dashboard/app-bar";
import { RiderBottomNav } from "@/components/dashboard/rider-bottom-nav";
import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 인증된 라이더 영역 공통 레이아웃 — 배경 위 헤더 + 콘텐츠 + 하단 플로팅 내비.
// main 하단 여백은 플로팅 탭 높이 확보(콘텐츠 가림 방지).
export default async function RiderLayout({ children }: { children: ReactNode }) {
  const profile = await getRiderProfile();

  return (
    <div className="app-container flex min-h-dvh flex-col bg-jb-surface text-jb-ink">
      <AppBar profile={profile} />
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+84px)]">{children}</main>
      <RiderBottomNav />
    </div>
  );
}
