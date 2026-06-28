"use client";

import { useEffect, useRef } from "react";
import { LogOut, User, Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { signOutRider } from "@/actions/auth";

// 06 §3. 햄버거 드로어 — 내 정보/랭킹(표시 전용·비활성) + 로그아웃(실동작).
// 로그아웃만 signOutRider(서버액션) 호출(세션쿠키 제거 후 /login 리다이렉트).

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

const DISABLED_ITEMS = [
  { label: "내 정보", Icon: User },
  { label: "랭킹", Icon: Trophy },
];

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const logoutRef = useRef<HTMLButtonElement>(null);

  // Esc 닫기 + 열릴 때 첫 활성 항목(로그아웃) 포커스.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const id = requestAnimationFrame(() => logoutRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  return (
    <>
      {/* 스크림 (06 §3 — a11y/UX 보강) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[300] bg-scrim transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* 패널 (좌측 슬라이드) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="메뉴"
        className={cn(
          "fixed inset-y-0 left-0 z-[400] flex w-[min(72vw,280px)] flex-col gap-1 bg-card p-6 pt-8 shadow-lg",
          "transition-transform duration-[250ms] ease-[var(--ease-emphasized)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {DISABLED_ITEMS.map(({ label, Icon }) => (
          <div
            key={label}
            aria-disabled="true"
            className="flex h-11 cursor-not-allowed items-center gap-3 rounded-md px-2 text-sm font-bold text-text-disabled"
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
            <span className="ml-auto text-[10px] font-normal text-muted-foreground">준비 중</span>
          </div>
        ))}

        <form action={signOutRider} className="mt-1">
          <button
            ref={logoutRef}
            type="submit"
            className="flex h-11 w-full items-center gap-3 rounded-md px-2 text-sm font-bold text-danger-strong transition-colors hover:bg-muted active:scale-[.98]"
          >
            <LogOut size={20} aria-hidden="true" />
            <span>로그아웃</span>
          </button>
        </form>
      </div>
    </>
  );
}
