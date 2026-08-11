"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Siren } from "lucide-react";
import { MenuDrawer } from "./menu-drawer";
import { BrandLogo } from "@/components/ui/brand-logo";
import type { RiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 헤더 56px. 좌:햄버거 / 중:로고("슬라이드" S 마크·라이트다크 전환) / 우:사고접수(→/roading).
// 햄버거 메뉴 2026-07-27 활성 복구(구 데모 잠금 해제) — 드로어 네비 오픈.
//   사고접수는 2026-07-11 활성 복구 — ROADING 임베드(/roading) 연결.

export function AppBar({ profile }: { profile: RiderProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 분리된 바 아님 — 페이지 배경 위에 개별 요소만 얹힘(배경/보더/그림자/고정 없음). */}
      <header className="relative flex items-center px-3.5 pt-3">
        {/* 햄버거 — 배경 위 흰색 카드(라운드 13px) */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴"
          className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-jb-card text-jb-ink shadow-[0_1px_3px_rgba(25,31,40,0.06)] transition-transform active:scale-95"
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>

        {/* 타이틀 — 헤더 영역 중앙 정렬 */}
        <Link
          href="/dashboard"
          className="absolute left-1/2 top-3 flex h-10 -translate-x-1/2 items-center gap-1.5"
        >
          <BrandLogo size={22} />
          <span className="text-[16px] font-black tracking-[-0.03em] text-jb-ink">슬라이드</span>
        </Link>

        {/* 사고접수 — 배경 위 카드 */}
        <Link
          href="/roading"
          className="ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-[13px] bg-jb-red-tint pl-2.5 pr-3 shadow-[0_1px_3px_rgba(25,31,40,0.06)] transition-transform active:scale-95"
        >
          <Siren size={16} strokeWidth={2} className="animate-pulse-dot text-jb-red" />
          <span className="whitespace-nowrap text-[11.5px] font-black tracking-[-0.03em] text-jb-red">
            사고접수
          </span>
        </Link>
      </header>

      <MenuDrawer open={open} onClose={() => setOpen(false)} profile={profile} />
    </>
  );
}
