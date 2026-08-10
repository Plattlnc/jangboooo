// 정산 내역. 실데이터 소스 연동 전 — 값 자리에 '-' 대신 명확한 준비 상태를 보여준다
// (미정 값이 '-' 로 노출되면 오류처럼 읽힘 → 상태를 말로 설명).

import { Wallet, Clock } from "lucide-react";

export default function SettlePage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">정산 내역</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">주간 단위로 정산되는 배달 수익 내역</p>

      {/* 누적 정산 카드 — 연동 전 준비 상태 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1E9E5A,#27b069)] px-[18px] py-[17px] text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.14)]">
        <div className="text-[12.5px] font-semibold opacity-90">이번 달 누적 정산</div>
        <div className="mt-[7px] flex items-center gap-2">
          <Clock size={18} strokeWidth={2.2} className="opacity-90" />
          <span className="text-[19px] font-black tracking-[-0.02em]">정산 시스템 연동 준비 중</span>
        </div>
        <div className="mt-[13px] border-t border-white/20 pt-3 text-xs leading-relaxed opacity-90">
          연동이 완료되면 주차별 배달 수익과 지급 내역이
          <br />
          여기에서 자동으로 집계돼요.
        </div>
      </div>

      {/* 주차별 정산 — 빈 상태 */}
      <div className="mb-2.5 mt-4 text-[13px] font-black">주차별 정산</div>
      <div className="rounded-[12px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-2.5 py-9">
          <span className="grid size-11 place-items-center rounded-[12px] bg-[#e7f5ee] text-[#1E9E5A]">
            <Wallet size={20} strokeWidth={1.8} />
          </span>
          <div className="text-center">
            <div className="text-[13.5px] font-bold text-jb-ink">아직 정산 내역이 없어요</div>
            <div className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
              첫 정산이 완료되면 주차별 내역이
              <br />
              이곳에 표시됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
