"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListChecks, Building2, Megaphone, FileSpreadsheet, IdCard, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { signOutSettlement } from "@/actions/settlement-auth";
import { cn } from "@/lib/cn";

// 정산 내비 — 데스크톱 좌측 사이드바 + 모바일 상단바(반응형, 데스크톱 퍼스트).
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
  badge?: string;
}

const NAV: NavItem[] = [
  { href: "/settlement", label: "홈", icon: Home, exact: true },
  { href: "/settlement/daily", label: "일일 정산", icon: ListChecks, exact: false },
  { href: "/settlement/mission", label: "본사 미션", icon: Building2, exact: false },
  { href: "/settlement/promo", label: "자사 프로모션", icon: Megaphone, exact: false },
  { href: "/settlement/weekly", label: "정산서", icon: FileSpreadsheet, exact: false, badge: "세무사용" },
  { href: "/settlement/riders", label: "라이더 설정", icon: IdCard, exact: false },
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
  const [open, setOpen] = useState(false);

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
                {it.badge ? (
                  <span className="ml-auto rounded-[6px] bg-jb-indigo-tint px-1.5 py-[3px] text-[10px] font-bold leading-none text-jb-indigo">
                    {it.badge}
                  </span>
                ) : null}
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

      {/* 모바일 상단바 — 좌측 햄버거 + 브랜드 */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-jb-line bg-jb-card/95 px-3 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          className="grid size-9 shrink-0 place-items-center rounded-[10px] text-jb-ink-soft transition-colors hover:bg-jb-surface"
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>
        <Brand />
      </header>

      {/* 모바일 드로어 메뉴 */}
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] max-w-[82%] flex-col border-r border-jb-line bg-jb-card shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="grid size-9 place-items-center rounded-[10px] text-jb-ink-mute transition-colors hover:bg-jb-surface"
              >
                <X size={18} strokeWidth={2.2} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3">
              {NAV.map((it) => {
                const active = isActive(it);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(false)}
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
                    {it.badge ? (
                      <span className="ml-auto rounded-[6px] bg-jb-indigo-tint px-1.5 py-[3px] text-[10px] font-bold leading-none text-jb-indigo">
                        {it.badge}
                      </span>
                    ) : null}
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
        </div>
      ) : null}
    </>
  );
}
