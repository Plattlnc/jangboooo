import type { ReactNode } from "react";

// 인증된 라이더 영역 공통 레이아웃. app-container(480) 폭 유지(라이더 앱 정체성).
//
// PROVISIONAL: 세션 가드(미로그인/미바인딩 리다이렉트)는 backend Auth 도착 후 추가.
export default function RiderLayout({ children }: { children: ReactNode }) {
  return <div className="app-container min-h-dvh px-4 md:px-6">{children}</div>;
}
