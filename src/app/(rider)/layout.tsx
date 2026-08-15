import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppBar } from "@/components/dashboard/app-bar";
import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";
import { isRiderTerminated } from "@/lib/contract";

// 인증된 라이더 영역 공통 레이아웃 — 배경 위 헤더 + 콘텐츠. (하단 플로팅 내비 제거)
export default async function RiderLayout({ children }: { children: ReactNode }) {
  const profile = await getRiderProfile();

  // 계약종료(탈퇴) 라이더는 이미 로그인돼 있어도 접근 차단 → 세션 제거 후 로그인 안내로.
  // (best-effort: isRiderTerminated 는 조회 실패 시 false 라 정상 라이더 무영향.)
  if (profile.uid && (await isRiderTerminated(profile.uid))) {
    redirect("/api/rider-blocked");
  }

  return (
    <div className="app-container flex min-h-dvh flex-col bg-jb-surface text-jb-ink">
      <AppBar profile={profile} />
      <main className="flex-1 pb-[calc(env(safe-area-inset-bottom)+24px)]">{children}</main>
    </div>
  );
}
