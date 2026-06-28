import type { ReactNode } from "react";
import { AppBar } from "@/components/dashboard/app-bar";

// 인증된 라이더 영역 공통 레이아웃 (시안 재설계).
// app-container(480) 폭 유지 + 시안 헤더(흰) + 콘텐츠(시안 surface #f6f7f9).
// 각 화면이 자체 패딩을 가짐(시안 px-14). 세션 가드는 middleware/backend Auth.
export default function RiderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-container flex min-h-dvh flex-col bg-white">
      <AppBar />
      <main className="flex-1 bg-jb-surface text-jb-ink">{children}</main>
    </div>
  );
}
