"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, FileSpreadsheet, LogOut, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { signOutSettlement } from "@/actions/settlement-auth";
import { cn } from "@/lib/cn";

// 정산 내비 — 데스크톱 좌측 사이드바 + 모바일 상단바(반응형, 데스크톱 퍼스트).
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
}

const NAV: NavItem[] = [
  { href: "/settlement", label: "홈", icon: Home, exact: true },
  { href: "/settlement/daily", label: "일일 정산", icon: ListChecks, exact: false },
  { href: "/settlement/weekly", label: "주정산서", icon: FileSpreadsheet, exact: false },
];

function useActive() {
  const pathname = usePathname();
  return (it: NavItem) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));
}

function Brand() {
  return (
    <Link href="/settlement" className="flex items-center gap-2">
      <div className="grid size-9 place-items-center rounded-[10px] bg-jb-indigo-tint">
        <BrandLogo size={19} />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[16px] font-semibold tracking-[-0.02em] text-jb-ink">슬라이더</span>
        <span className="rounded-[6px] bg-jb-indigo-tint px-1.5 py-[3px] text-[10px] font-bold leading-none text-jb-indigo">
          정산
        </span>
      </div>
    </Link>
  );
}

export function SettlementSidebar() {
  const isActive = useActive();

  return (
    <>
      {/* 데스크톱 좌측 사이드바 */}
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col border-r border-jb-line bg-jb-card md:flex">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <nav className="flex-1 px-3">
          {NAV.map((it) => {
            const active = isActive(it);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "mb-1 flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] transition-colors",
                  active
                    ? "bg-jb-indigo-tint font-semibold text-jb-indigo"
                    : "font-medium text-jb-ink-soft hover:bg-jb-surface",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <form action={signOutSettlement} className="border-t border-jb-line p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium text-jb-ink-mute transition-colors hover:bg-jb-surface hover:text-jb-ink"
          >
            <LogOut size={17} strokeWidth={2} />
            로그아웃
          </button>
        </form>
      </aside>

      {/* 모바일 상단바 */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-jb-line bg-jb-card/95 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <div className="flex items-center gap-1">
          {NAV.map((it) => {
            const active = isActive(it);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-label={it.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "grid size-9 place-items-center rounded-[10px] transition-colors",
                  active ? "bg-jb-indigo-tint text-jb-indigo" : "text-jb-ink-mute",
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              </Link>
            );
          })}
          <form action={signOutSettlement}>
            <button
              type="submit"
              aria-label="로그아웃"
              className="grid size-9 place-items-center rounded-[10px] text-jb-ink-mute"
            >
              <LogOut size={17} strokeWidth={2} />
            </button>
          </form>
        </div>
      </header>
    </>
  );
}
