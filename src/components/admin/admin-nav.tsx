"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3, Target } from "lucide-react";

// 관리자 하단 내비 — 라이더 RiderBottomNav 와 동일한 플로팅 카드(아이콘+라벨, 틴트 활성).
// 4탭(홈/라이더/지표/목표). 정비소·사용현황·공지는 햄버거 드로어(admin-drawer).
const TABS = [
  { href: "/admin", label: "홈", icon: Home, exact: true },
  { href: "/admin/riders", label: "라이더", icon: Users, exact: false },
  { href: "/admin/metrics", label: "지표", icon: BarChart3, exact: false },
  { href: "/admin/goals", label: "목표", icon: Target, exact: false },
] as const;

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="관리자 메뉴"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-30 mx-auto flex max-w-[var(--container-app)] justify-center px-4"
    >
      <div className="pointer-events-auto flex w-full max-w-[400px] items-center gap-1 rounded-[22px] border border-jb-line bg-jb-card/95 p-1.5 shadow-[0_1px_3px_rgba(25,31,40,0.06),0_10px_28px_-8px_rgba(25,31,40,0.16)] backdrop-blur">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex flex-1 flex-col items-center gap-0.5 rounded-[16px] py-1.5 transition-colors active:scale-[0.96] " +
                (active ? "bg-jb-indigo-tint text-jb-indigo" : "text-jb-ink-mute")
              }
            >
              <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              <span className={"text-[10.5px] leading-none " + (active ? "font-black" : "font-bold")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
