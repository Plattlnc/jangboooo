"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 관리자 하단 내비 — 플로팅 pill 4탭(홈/라이더/지표/목표). 2026-07-31 개편:
// 고정 풀폭 바 → 떠 있는 알약형, 정비소는 햄버거 드로어(admin-drawer)로 이동.
const TABS = [
  { href: "/admin", label: "홈", exact: true },
  { href: "/admin/riders", label: "라이더", exact: false },
  { href: "/admin/metrics", label: "지표", exact: false },
  { href: "/admin/goals", label: "목표", exact: false },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="관리자 메뉴"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-20 flex justify-center"
    >
      <div className="flex gap-1 rounded-full border border-jb-line bg-white/95 p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_16px_-4px_rgba(0,0,0,0.08),0_24px_32px_-8px_rgba(0,0,0,0.10)] backdrop-blur">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                // 고정 폭 64px — 글자 수 무관 전 탭 동일 크기(터치 최소 44px 충족), 텍스트 중앙.
                "w-16 rounded-full py-2 text-center text-[12.5px] leading-[18px] transition-colors " +
                (active ? "bg-jb-indigo font-black text-white" : "font-bold text-jb-ink-mute")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
