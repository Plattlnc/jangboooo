// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 인증된 라이더 영역 공통 레이아웃 셸.
// 실제 세션 가드(로그인/본인인증 체크)는 backend 인증 플로우 도착 후 추가.
// 디자인 토큰 미사용 — 구조만.

import type { ReactNode } from "react";

export default function RiderLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">배달장부2</span>
        {/* PROVISIONAL: 라이더 식별/로그아웃 등은 backend 세션 도착 후 */}
        <span className="text-xs opacity-50">내 대시보드</span>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
    </div>
  );
}
