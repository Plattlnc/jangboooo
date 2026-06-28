import type { ReactNode } from "react";
import { AppBar } from "@/components/dashboard/app-bar";
import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 인증된 라이더 영역 공통 레이아웃 (시안 재설계).
// app-container(480) 폭 유지 + 시안 헤더(흰) + 콘텐츠(시안 surface #f6f7f9).
// 로그인 프로필을 서버에서 조회해 AppBar(드로어)로 주입 — 회원정보 통일.
export default async function RiderLayout({ children }: { children: ReactNode }) {
  const profile = await getRiderProfile();

  return (
    <div className="app-container flex min-h-dvh flex-col bg-white">
      <AppBar profile={profile} />
      <main className="flex-1 bg-jb-surface text-jb-ink">{children}</main>
    </div>
  );
}
