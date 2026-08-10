// 일차감 관리. 실데이터 소스 연동 전 — 값 자리에 '-' 대신 명확한 준비 상태를 보여준다
// (미정 값이 '-' 로 노출되면 오류처럼 읽힘 → 상태를 말로 설명).

import { ReceiptText, Clock } from "lucide-react";

export default function DeductPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">일차감 관리</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">매일 캐시에서 자동 차감되는 고정비 내역</p>

      {/* 합계 카드 — 연동 전 준비 상태 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#E8590C,#f0712c)] px-[18px] py-[17px] text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.14)]">
        <div className="text-[12.5px] font-semibold opacity-90">오늘 차감 합계</div>
        <div className="mt-[7px] flex items-center gap-2">
          <Clock size={18} strokeWidth={2.2} className="opacity-90" />
          <span className="text-[19px] font-black tracking-[-0.02em]">정산 시스템 연동 준비 중</span>
        </div>
        <div className="mt-[13px] border-t border-white/20 pt-3 text-xs leading-relaxed opacity-90">
          연동이 완료되면 리스료 · 보험료 등 일 단위 고정비가
          <br />
          여기에서 자동으로 집계돼요.
        </div>
      </div>

      {/* 내역 — 빈 상태 */}
      <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="text-[13px] font-black">차감 내역</div>
        <div className="flex flex-col items-center gap-2.5 py-9">
          <span className="grid size-11 place-items-center rounded-[12px] bg-[#fdf0e6] text-[#E8590C]">
            <ReceiptText size={20} strokeWidth={1.8} />
          </span>
          <div className="text-center">
            <div className="text-[13.5px] font-bold text-jb-ink">아직 차감 내역이 없어요</div>
            <div className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
              일차감이 시작되면 항목별 · 일자별 내역이
              <br />
              이곳에 표시됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
