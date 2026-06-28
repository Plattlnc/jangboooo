// 정산 내역 (시안). 실데이터 소스 부재 → 값은 '-' / 내역은 빈 상태.

export default function SettlePage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">정산 내역</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">주간 단위로 정산되는 배달 수익 내역</p>

      {/* 누적 정산 카드 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1E9E5A,#27b069)] px-[18px] py-[17px] text-white shadow-[0_8px_20px_rgba(30,158,90,0.26)]">
        <div className="text-[12.5px] font-semibold opacity-90">이번 달 누적 정산</div>
        <div className="tnum mt-[5px] text-[32px] font-black leading-none tracking-[-0.03em]">-</div>
        <div className="mt-[13px] flex items-center justify-between border-t border-white/20 pt-3">
          <span className="text-xs opacity-90">-</span>
          <span className="rounded-full bg-white/[0.18] px-2.5 py-1 text-[12.5px] font-bold">월간 ›</span>
        </div>
      </div>

      {/* 주차별 정산 */}
      <div className="mb-2.5 mt-4 text-[13px] font-black">주차별 정산</div>
      <div className="rounded-[14px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <p className="py-6 text-center text-[13px] text-jb-ink-mute">-</p>
      </div>
    </div>
  );
}
