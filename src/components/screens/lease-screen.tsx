"use client";

import { useState } from "react";
import { LEASE_FILTERS, LEASE_COMPANIES } from "@/lib/mock/lease";

// 리스 · 렌탈 (시안). 필터 칩 선택 상태 + 업체 카드 + 하단 비교 배너.
// (필터는 시안과 동일하게 표시 전용 — 목록 필터링 로직은 실데이터 연동 시.)

export function LeaseScreen() {
  const [filter, setFilter] = useState("전체");

  return (
    <div className="relative px-3.5 pb-10 pt-3.5">
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-xl font-black tracking-[-0.03em]">리스 · 렌탈</h1>
        <span className="rounded-full bg-jb-orange-tint px-2.5 py-[3px] text-[11px] font-bold text-jb-orange">
          배달 이륜차 비교
        </span>
      </div>
      <p className="mb-[13px] text-[12.5px] text-jb-ink-mute">검증된 렌탈 업체의 월요금·보증금을 한눈에</p>

      {/* 필터 칩 */}
      <div className="mb-[11px] flex gap-[7px] overflow-x-auto pb-[3px]">
        {LEASE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "shrink-0 whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] font-bold " +
              (filter === f ? "bg-jb-orange text-white" : "border border-jb-line bg-white text-jb-ink-soft")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* 정렬 바 */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-jb-ink-soft">
          총 <span className="tnum font-black text-jb-orange">{LEASE_COMPANIES.length}</span>개 업체
        </span>
        <span className="inline-flex items-center gap-[5px] text-[12.5px] font-bold">
          월요금 낮은순 <span className="text-jb-ink-mute">▾</span>
        </span>
      </div>

      {/* 업체 카드 */}
      <div className="flex flex-col gap-3">
        {LEASE_COMPANIES.map((co) => (
          <div
            key={co.name}
            className="rounded-2xl border border-jb-line bg-white p-[15px] shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
          >
            <div className="flex items-center gap-[11px]">
              <div
                className="grid size-11 place-items-center rounded-[13px] text-sm font-black text-white"
                style={{ background: co.color }}
              >
                {co.logo}
              </div>
              <div className="flex-1">
                <div className="text-[15.5px] font-black tracking-[-0.02em]">{co.name}</div>
                <div className="mt-0.5 flex items-center gap-[5px] text-xs text-jb-ink-soft">
                  <span className="text-jb-gold">★</span>
                  <span className="tnum font-black text-jb-ink">{co.rating}</span>
                  <span className="text-[#c4c8d2]">·</span>
                  <span className="tnum">리뷰 {co.reviews}</span>
                </div>
              </div>
            </div>

            {/* 차종 */}
            <div className="mt-3 flex gap-1.5">
              {co.bikes.map((b) => (
                <span
                  key={b}
                  className="rounded-lg border border-jb-line bg-[#f4f6fa] px-[11px] py-[5px] text-xs font-bold text-jb-ink-soft"
                >
                  {b}
                </span>
              ))}
            </div>

            {/* 가격 그리드 */}
            <div className="mt-3 grid grid-cols-2 gap-[9px]">
              <div className="rounded-[11px] border border-[#fbe2d3] bg-[#fff7f2] px-[13px] py-[11px]">
                <div className="text-[11px] font-bold text-jb-ink-mute">월 요금</div>
                <div className="tnum mt-[3px] text-[18px] font-black text-jb-orange">
                  {co.monthly}
                  <span className="text-xs">원</span>
                </div>
              </div>
              <div className="rounded-[11px] border border-jb-line bg-[#f8f9fb] px-[13px] py-[11px]">
                <div className="text-[11px] font-bold text-jb-ink-mute">보증금</div>
                <div className="tnum mt-[3px] text-[18px] font-black">{co.depositText}</div>
              </div>
            </div>

            {/* 태그 */}
            <div className="mt-[11px] flex flex-wrap gap-1.5">
              {co.tags.map((t) => (
                <span key={t} className="rounded-[7px] bg-jb-indigo-tint px-[9px] py-1 text-[11px] font-semibold text-jb-indigo">
                  {t}
                </span>
              ))}
            </div>

            {/* 버튼 */}
            <div className="mt-[13px] flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-[11px] border border-jb-line bg-white py-[11px] text-[13px] font-bold text-jb-ink"
              >
                상세보기
              </button>
              <button
                type="button"
                className="flex-1 rounded-[11px] bg-jb-orange py-[11px] text-[13px] font-bold text-white"
              >
                문의하기
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 하단 비교 배너 */}
      <div className="sticky bottom-3.5 z-20 mt-3.5 flex items-center justify-between rounded-[14px] bg-jb-ink px-4 py-[13px] shadow-[0_10px_24px_rgba(20,23,46,0.28)]">
        <span className="text-[13px] font-bold text-white">
          선택한 <span className="tnum text-jb-gold">2</span>개 업체 비교
        </span>
        <button type="button" className="rounded-[9px] bg-jb-orange px-4 py-2 text-[12.5px] font-bold text-white">
          비교하기 ›
        </button>
      </div>
    </div>
  );
}
