// 통계 — 신규 부문(준비 중). 추후 라이더 개인 통계 대시보드 구현.

export const dynamic = "force-dynamic";

export default function StatsPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">통계</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">내 운행 통계</p>

      <div className="grid min-h-[56dvh] place-items-center">
        <div className="text-center">
          <div className="text-[14px] font-black text-jb-ink">준비 중이에요</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-jb-ink-mute">
            통계 기능은 곧 추가될 예정이에요.
          </p>
        </div>
      </div>
    </div>
  );
}
