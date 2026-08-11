"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Gift, User } from "lucide-react";

// 라이더 하단 플로팅 내비 — 홈/통계/프로모션/내정보 4탭. 페이지 배경 위에 떠 있는 카드.
const TABS = [
  { href: "/dashboard", label: "홈", icon: Home, exact: true },
  { href: "/stats", label: "통계", icon: BarChart3, exact: false },
  { href: "/promo", label: "프로모션", icon: Gift, exact: false },
  { href: "/myinfo", label: "내 정보", icon: User, exact: false },
] as const;

export function RiderBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="메뉴"
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
