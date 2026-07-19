"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 관리자 하단 내비 — 홈(대시보드)/라이더/지표/목표 4탭. app-container 폭 고정.
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
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[var(--container-app)] border-t border-jb-line bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={
                "touch-target flex flex-col items-center justify-center py-2.5 text-[12.5px] transition-colors " +
                (active ? "font-black text-jb-indigo" : "font-bold text-jb-ink-mute")
              }
            >
              {tab.label}
              <span
                aria-hidden="true"
                className={"mt-1 h-[3px] w-6 " + (active ? "bg-jb-indigo" : "bg-transparent")}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
