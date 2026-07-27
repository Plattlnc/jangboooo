// 리스 · 렌탈. 더미 매물 제거(사용자 요청) — 제휴 오픈 전 준비 상태만 표시.
// 상태 표현 원칙: 미정 값을 '-'/가짜 데이터로 채우지 않고 준비 중임을 말로 안내.

import { Bike, Clock } from "lucide-react";

export default function LeasePage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">리스 · 렌탈</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">라이더 전용 바이크 리스 · 렌탈 혜택</p>

      {/* 히어로 — 준비 상태 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#E8590C,#f0712c)] px-[18px] py-[17px] text-white shadow-[0_8px_20px_rgba(232,89,12,0.26)]">
        <div className="text-[12.5px] font-semibold opacity-90">제휴 준비 중</div>
        <div className="mt-[7px] flex items-center gap-2">
          <Clock size={18} strokeWidth={2.2} className="opacity-90" />
          <span className="text-[19px] font-black tracking-[-0.02em]">곧 오픈해요</span>
        </div>
        <div className="mt-[13px] border-t border-white/20 pt-3 text-xs leading-relaxed opacity-90">
          제휴가 확정되면 라이더 전용 조건의 리스 · 렌탈
          <br />
          상품을 여기에서 바로 신청할 수 있어요.
        </div>
      </div>

      {/* 빈 상태 */}
      <div className="mt-3 rounded-[14px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="text-[13px] font-black">이용 가능한 상품</div>
        <div className="flex flex-col items-center gap-2.5 py-9">
          <span className="grid size-11 place-items-center rounded-[13px] bg-[#fdf0e6] text-[#E8590C]">
            <Bike size={20} strokeWidth={1.8} />
          </span>
          <div className="text-center">
            <div className="text-[13.5px] font-bold text-jb-ink">아직 등록된 상품이 없어요</div>
            <div className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
              제휴 오픈 시 기종별 리스 · 렌탈 상품이
              <br />
              이곳에 표시됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
