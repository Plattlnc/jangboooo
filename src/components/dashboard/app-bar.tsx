"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, Siren } from "lucide-react";
import { MenuDrawer } from "./menu-drawer";
import type { RiderProfile } from "@/app/(rider)/_lib/rider-profile";

// 시안 헤더 — 흰 배경 56px. 좌:햄버거 / 중:로고("배달 장부") / 우:사고접수(→/roading).
// 햄버거 메뉴 2026-07-27 활성 복구(구 데모 잠금 해제) — 드로어 네비 오픈.
//   사고접수는 2026-07-11 활성 복구 — ROADING 임베드(/roading) 연결.

export function AppBar({ profile }: { profile: RiderProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[200] flex h-14 items-center justify-between border-b border-jb-line-soft bg-white px-3.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴"
          className="grid size-10 place-items-center rounded-full text-jb-ink transition-transform active:scale-95"
        >
          <Menu size={22} strokeWidth={2.2} />
        </button>

        <Link href="/dashboard" className="flex items-center gap-1.5">
          <span className="grid size-[22px] place-items-center rounded-md bg-jb-indigo">
            <span className="size-2 rounded-[2px] bg-white" />
          </span>
          <span className="text-base font-black tracking-[-0.03em] text-jb-ink">배달 장부</span>
        </Link>

        <Link
          href="/roading"
          className="flex h-[34px] items-center gap-1.5 rounded-[10px] border border-[#f5d2cf] bg-jb-red-tint pl-[7px] pr-[9px]"
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
