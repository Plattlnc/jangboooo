import type { ReactNode } from "react";
import { AppBar } from "@/components/dashboard/app-bar";

// 인증된 라이더 영역 공통 레이아웃 (06 §1). app-container(480) 폭 유지(라이더 앱 정체성).
// AppBar(고정) + 콘텐츠(좌우 마진 ~26). 세션 가드는 middleware/backend Auth 담당.
export default function RiderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-container min-h-dvh">
      <AppBar />
      <main className="px-[26px] pb-8">{children}</main>
    </div>
  );
}
