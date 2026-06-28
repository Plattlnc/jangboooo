// 일차감 관리 (시안). 매일 캐시에서 자동 차감되는 고정비 내역.

import { DEDUCT_TOTAL, DEDUCT_AVAILABLE, DEDUCT_ITEMS, DEDUCT_RECENT } from "@/lib/mock/deduct";

export default function DeductPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">일차감 관리</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">매일 캐시에서 자동 차감되는 고정비 내역</p>

      {/* 합계 카드 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#E8590C,#f0712c)] px-[18px] py-[17px] text-white shadow-[0_8px_20px_rgba(232,89,12,0.26)]">
        <div className="text-[12.5px] font-semibold opacity-90">오늘 차감 합계</div>
        <div className="mt-[5px] flex items-baseline gap-[3px]">
          <span className="text-[13px] font-bold opacity-85">−₩</span>
          <span className="tnum text-[34px] font-black leading-none tracking-[-0.03em]">{DEDUCT_TOTAL}</span>
        </div>
        <div className="mt-[13px] flex items-center justify-between border-t border-white/20 pt-3">
          <span className="text-xs opacity-90">차감 후 출금 가능 캐시</span>
          <span className="tnum text-base font-black">{DEDUCT_AVAILABLE}</span>
        </div>
      </div>

      {/* 항목별 일차감 */}
      <div className="mt-3 rounded-[14px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="mb-[11px] text-[13px] font-black">항목별 일차감</div>
        <div className="flex flex-col gap-[11px]">
          {DEDUCT_ITEMS.map((d) => (
            <div key={d.label} className="flex items-center gap-[11px]">
              <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
              <div className="flex-1">
                <div className="text-[13.5px] font-bold">{d.label}</div>
                <div className="mt-px text-[11.5px] text-jb-ink-mute">{d.sub}</div>
              </div>
              <span className="tnum text-sm font-black text-jb-ink">−{d.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 차감 내역 */}
      <div className="mt-3 rounded-[14px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="mb-1.5 text-[13px] font-black">최근 차감 내역</div>
        {DEDUCT_RECENT.map((r) => (
          <div
            key={r.date}
            className="flex items-center justify-between border-t border-jb-line-soft py-2.5"
          >
            <span className="tnum text-[13px] font-semibold text-jb-ink-soft">{r.date}</span>
            <span className="tnum text-[13.5px] font-black">−₩{r.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
