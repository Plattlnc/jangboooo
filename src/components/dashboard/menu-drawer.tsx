"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { signOutRider } from "@/actions/auth";
import { NAV_GROUPS } from "@/lib/nav";
import { MOCK_CASH } from "@/lib/mock/profile";
import type { RiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 시안 드로어 — 프로필(인디고 그라데이션) + 그룹 네비(활성표시) + 캐시 카드 + 로그아웃.
// 라우트 이동은 next/link. 활성 판정은 usePathname. 로그아웃만 서버액션 실동작.
// 상단 회원정보는 로그인 라이더 정보(profile)로 통일.

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: RiderProfile;
}

export function MenuDrawer({ open, onClose, profile }: MenuDrawerProps) {
  const pathname = usePathname();

  // Esc 닫기.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* 스크림 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[300] bg-scrim transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* 패널 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
        className={cn(
          "fixed inset-y-0 left-0 z-[400] flex w-[300px] max-w-[82vw] flex-col bg-white shadow-lg",
          "transition-transform duration-[250ms] ease-[var(--ease-emphasized)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* 프로필 헤더 */}
        <div className="bg-gradient-to-br from-[#4F6AF5] to-[#5d77ff] px-[18px] pb-[18px] pt-[22px] text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-[15px] bg-white/20 text-[18px] font-black">
              {profile.initial}
            </div>
            <div>
              <div className="text-[17px] font-black">{profile.name}</div>
              <div className="tnum mt-0.5 text-xs opacity-90">UID {profile.uid}</div>
            </div>
          </div>
        </div>

        {/* 네비 */}
        <nav className="flex-1 overflow-y-auto px-3 pb-2.5 pt-1.5">
          {NAV_GROUPS.map((grp) => (
            <div key={grp.title}>
              <div className="px-2.5 pb-1 pt-[11px] text-[10.5px] font-black tracking-[0.04em] text-[#b0ada6]">
                {grp.title}
              </div>
              {grp.items.map((it) => {
                const active = pathname === it.href;
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onClose}
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
            </div>
          ))}
        </nav>

        {/* 캐시 카드 + 로그아웃 */}
        <div className="border-t border-jb-line-soft px-3.5 pb-[18px] pt-3">
          <div className="rounded-[14px] border border-jb-line bg-[#f8f9fb] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-jb-ink-mute">출금 가능 캐시</span>
              <span className="text-[11px] font-bold text-jb-indigo">내역 ›</span>
            </div>
            <div className="mt-[7px] flex items-end justify-between">
              <span className="tnum text-[22px] font-black text-jb-ink">
                {MOCK_CASH.toLocaleString()}
                <span className="text-sm">원</span>
              </span>
              <button
                type="button"
                className="rounded-[10px] bg-jb-indigo px-3.5 py-2 text-[12.5px] font-bold text-white"
              >
                출금
              </button>
            </div>
          </div>
          <form action={signOutRider}>
            <button
              type="submit"
              className="mt-[11px] w-full rounded-[11px] border border-jb-line bg-white py-[11px] text-[13px] font-semibold text-jb-ink-mute transition-transform active:scale-[.98]"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
