"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { signOutRider } from "@/actions/auth";
import { NAV_GROUPS } from "@/lib/nav";
import type { RiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 시안 드로어 — 프로필(인디고 그라데이션) + 그룹 네비(활성표시) + 로그아웃.
// 라우트 이동은 next/link. 활성 판정은 usePathname. 로그아웃만 서버액션 실동작.
// 상단 회원정보는 로그인 라이더 정보(profile)로 통일.
// 캐시/출금 카드는 정산 시스템 연동 전이라 미노출(2026-07-31 사용자 확정 — 돈 관련 UI 보류).

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
  profile: RiderProfile;
}

export function MenuDrawer({ open, onClose, profile }: MenuDrawerProps) {
  const pathname = usePathname();
  // 잠금 항목 터치 안내 토스트 — 1.8s 자동 소멸.
  const [lockNotice, setLockNotice] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLockNotice = () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    setLockNotice(true);
    lockTimer.current = setTimeout(() => setLockNotice(false), 1_800);
  };
  useEffect(() => () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
  }, []);

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
        {/* 프로필 헤더 — 클릭 시 내 정보(실사용자·바이크 등록)로 이동 */}
        <Link
          href="/myinfo"
          onClick={onClose}
          className="block bg-gradient-to-br from-[#4F6AF5] to-[#5d77ff] px-[18px] pb-[18px] pt-[22px] text-white transition-opacity active:opacity-90"
        >
          <div className="flex items-center gap-3">
            {profile.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- 48px 고정 아바타, 원격 도메인 미설정 */
              <img
                src={profile.avatarUrl}
                alt="프로필 사진"
                className="size-12 shrink-0 rounded-[12px] object-cover"
              />
            ) : (
              <div className="grid size-12 place-items-center rounded-[12px] bg-white/20 text-[18px] font-black">
                {profile.initial}
              </div>
            )}
            <div className="flex-1">
              <div className="text-[17px] font-black">{profile.name}</div>
              <div className="tnum mt-0.5 text-xs opacity-90">UID {profile.uid}</div>
            </div>
            <span className="text-[11.5px] font-bold opacity-90">내 정보 ›</span>
          </div>
        </Link>

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
                const inner = (
                  <>
                    <span
                      className="grid size-8 place-items-center rounded-[8px]"
                      style={{ background: it.tileBg, color: it.tileColor }}
                    >
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-left text-sm",
                        active ? "font-black text-jb-ink" : "font-semibold text-[#3a3f4c]",
                        it.locked && "text-jb-ink-mute",
                      )}
                    >
                      {it.label}
                    </span>
                    {it.locked ? (
                      <Lock size={14} strokeWidth={2} className="text-jb-ink-mute" />
                    ) : active ? (
                      <span className="size-1.5 rounded-full bg-jb-indigo" />
                    ) : null}
                  </>
                );
                // 잠금 항목: 이동 없이 안내만 (2026-07-31 랭킹 잠금).
                if (it.locked) {
                  return (
                    <button
                      key={it.href}
                      type="button"
                      onClick={showLockNotice}
                      className="flex w-full items-center gap-[11px] rounded-[8px] px-2.5 py-[9px] opacity-75"
                    >
                      {inner}
                    </button>
                  );
                }
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-[11px] rounded-[8px] px-2.5 py-[9px]",
                      active ? "bg-[#f4f6ff]" : "bg-transparent",
                    )}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* 잠금 안내 토스트 (드로어 하단 부유, 1.8s) */}
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute inset-x-4 bottom-[84px] z-10 flex justify-center transition-opacity duration-200",
            lockNotice ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="flex items-center gap-1.5 rounded-full bg-jb-ink px-3.5 py-2 text-[12px] font-bold text-white shadow-lg">
            <Lock size={12} strokeWidth={2.2} />
            현재 잠겨있습니다
          </span>
        </div>

        {/* 로그아웃 */}
        <div className="border-t border-jb-line-soft px-3.5 pb-[18px] pt-3">
          <form action={signOutRider}>
            <button
              type="submit"
              className="w-full rounded-[8px] border border-jb-line bg-white py-[11px] text-[13px] font-semibold text-jb-ink-mute transition-transform active:scale-[.98]"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
