// 정산 내역 (시안). 주간 단위로 정산되는 배달 수익.

import { SETTLE_MONTH_TOTAL, SETTLE_MONTH_NOTE, SETTLE_LIST } from "@/lib/mock/settle";

export default function SettlePage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">정산 내역</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">주간 단위로 정산되는 배달 수익 내역</p>

      {/* 누적 정산 카드 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1E9E5A,#27b069)] px-[18px] py-[17px] text-white shadow-[0_8px_20px_rgba(30,158,90,0.26)]">
        <div className="text-[12.5px] font-semibold opacity-90">2026년 6월 누적 정산</div>
        <div className="mt-[5px] flex items-baseline gap-[3px]">
          <span className="text-sm font-bold opacity-85">₩</span>
          <span className="tnum text-[32px] font-black leading-none tracking-[-0.03em]">{SETTLE_MONTH_TOTAL}</span>
        </div>
        <div className="mt-[13px] flex items-center justify-between border-t border-white/20 pt-3">
          <span className="text-xs opacity-90">{SETTLE_MONTH_NOTE}</span>
          <span className="rounded-full bg-white/[0.18] px-2.5 py-1 text-[12.5px] font-bold">월간 ›</span>
        </div>
      </div>

      {/* 주차별 정산 */}
      <div className="mb-2.5 mt-4 text-[13px] font-black">주차별 정산</div>
      <div className="flex flex-col gap-2.5">
        {SETTLE_LIST.map((s) => (
          <div
            key={s.date}
            className="rounded-[14px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="tnum text-sm font-black">{s.date} 정산</span>
                <span
                  className="rounded-md px-2 py-0.5 text-[10.5px] font-bold"
                  style={{ color: s.sc, background: s.sb }}
                >
                  {s.status}
                </span>
              </div>
              <span className="tnum text-base font-black text-jb-green">₩{s.amount}</span>
            </div>
            <div className="tnum mt-1.5 text-[11.5px] text-jb-ink-mute">
              {s.period} · 배달 {s.count}건
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
