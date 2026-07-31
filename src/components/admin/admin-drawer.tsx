"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// 관리자 햄버거 드로어 — 2026-07-31 신설. 하단 플로팅 탭(홈/라이더/지표/목표)에서
// 빠진 보조 메뉴(정비소 등)를 담는다. 라이더 MenuDrawer 와 동일한 스크림/슬라이드 패턴.

interface DrawerItem {
  label: string;
  href: string;
  icon: LucideIcon;
  tileColor: string;
  tileBg: string;
}

const ITEMS: DrawerItem[] = [
  { label: "제휴 정비소 관리", href: "/admin/repair-shops", icon: Wrench, tileColor: "#5b6660", tileBg: "#eef0f3" },
];

export function AdminMenuButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="관리자 메뉴 열기"
        className="grid size-9 shrink-0 place-items-center rounded-full text-jb-ink transition-transform active:scale-95"
      >
        <Menu size={20} strokeWidth={2.2} />
      </button>

      {/* 스크림 */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[300] bg-scrim transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* 패널 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="관리자 메뉴"
        className={cn(
          "fixed inset-y-0 left-0 z-[400] flex w-[280px] max-w-[80vw] flex-col bg-white shadow-lg",
          "transition-transform duration-[250ms] ease-[var(--ease-emphasized)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="bg-gradient-to-br from-[#4F6AF5] to-[#5d77ff] px-[18px] pb-4 pt-5 text-white">
          <div className="text-[16px] font-black">관리자 메뉴</div>
          <div className="mt-0.5 text-[11.5px] opacity-90">배달장부2 운영 도구</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pt-2.5">
          {ITEMS.map((it) => {
            const active = pathname.startsWith(it.href);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-[11px] rounded-[11px] px-2.5 py-[9px]",
                  active ? "bg-[#f4f6ff]" : "bg-transparent",
                )}
              >
                <span
                  className="grid size-8 place-items-center rounded-[9px]"
                  style={{ background: it.tileBg, color: it.tileColor }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span
                  className={cn(
                    "flex-1 text-left text-sm",
                    active ? "font-black text-jb-ink" : "font-semibold text-[#3a3f4c]",
                  )}
                >
                  {it.label}
                </span>
                {active ? <span className="size-1.5 rounded-full bg-jb-indigo" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
