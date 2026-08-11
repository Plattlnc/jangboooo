// 버닝 이벤트 — 기간 한정 자사 프로모션. 라이더 등급 플래티넘 이상 → 주간 배달료(미션 제외) 5% 추가.
// 배달료는 익일 적재라 당일분 제외(N일치). 주간(수~화) 반영 + 주별 기록 보관. 종료일 미정.

import { Flame, TriangleAlert } from "lucide-react";
import { getMyBurning } from "@/app/(rider)/_lib/grade";
import { BURNING_MIN_COMPLETED, BURNING_MIN_TIER_NAME, BURNING_RATE } from "@/lib/burning";

export const dynamic = "force-dynamic";

function md(s: string): string {
  return `${Number(s.slice(5, 7))}월 ${Number(s.slice(8, 10))}일`;
}
function krw(n: number): string {
  return n.toLocaleString("ko-KR");
}

export default async function BurningPage() {
  const b = await getMyBurning();
  const cur = b.current;
  const curPotential = cur ? Math.round(cur.feeKrw * BURNING_RATE) : 0;
  const toEligible = cur ? Math.max(0, BURNING_MIN_COMPLETED - cur.completed) : 0;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black tracking-[-0.03em]">버닝 이벤트</h1>
        <span className="rounded-full bg-jb-orange-tint px-2 py-0.5 text-[11px] font-black text-jb-orange">기간 한정</span>
      </div>
      <p className="mb-3 mt-1 text-[12.5px] text-jb-ink-mute">
        {BURNING_MIN_TIER_NAME} 이상 · 주간 배달료의 {b.ratePct}% 추가 정산
      </p>

      {/* 기간 한정 안내 */}
      <div className="flex items-start gap-1.5 rounded-[12px] bg-jb-orange-tint px-3.5 py-2.5 text-[11.5px] font-bold leading-relaxed text-jb-orange">
        <TriangleAlert size={15} strokeWidth={2.4} className="mt-px shrink-0" />
        <span>기간 한정 프로모션이에요. 별도 공지 없이 종료될 수 있어요.</span>
      </div>

      {/* 이번 주 버닝 히어로 */}
      <div className="mt-3 rounded-2xl bg-[linear-gradient(135deg,#FF6B35,#F04452)] px-[18px] py-[17px] text-white shadow-[0_8px_16px_-4px_rgba(240,68,82,0.28)]">
        <div className="flex items-center gap-2">
          <Flame size={18} strokeWidth={2.4} />
          <span className="text-[12.5px] font-bold opacity-95">이번 주 버닝 보너스</span>
          {cur ? (
            <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-black">
              {cur.eligible ? "지급 대상" : "미자격"}
            </span>
          ) : null}
        </div>

        {cur && cur.eligible ? (
          <>
            <div className="tnum mt-1.5 text-[30px] font-black leading-none tracking-[-0.02em]">
              +{krw(cur.bonusKrw)}
              <span className="ml-1 text-[16px] font-bold opacity-90">원</span>
            </div>
            <div className="mt-2 text-[11.5px] font-semibold opacity-90">
              배달료 {krw(cur.feeKrw)}원 × {b.ratePct}% · <b>{cur.daysWithData}일치</b> 반영(예상)
            </div>
          </>
        ) : cur ? (
          <>
            <div className="tnum mt-1.5 text-[24px] font-black leading-tight tracking-[-0.02em]">
              {BURNING_MIN_TIER_NAME}까지 {krw(toEligible)}건
            </div>
            <div className="mt-2 text-[11.5px] font-semibold opacity-90">
              도달 시 배달료 {b.ratePct}% 지급 · 현재 <b>{cur.daysWithData}일치</b> 배달료 {krw(cur.feeKrw)}원
              (예상 +{krw(curPotential)}원)
            </div>
          </>
        ) : (
          <div className="mt-2 text-[12.5px] font-semibold opacity-90">이번 주 집계된 데이터가 아직 없어요.</div>
        )}
      </div>

      {/* 데이터 지연 안내 */}
      <div className="mt-2 space-y-0.5 px-1 text-[11px] leading-relaxed text-jb-ink-mute">
        <div>· 배달료는 익일 반영돼요(오늘 완료분은 내일). 주간(수~화) 전체는 목요일경 확정돼요.</div>
        <div>· ‘N일치’는 배달료 데이터가 반영된 일수예요. 미션비는 제외한 금액이에요.</div>
      </div>

      {/* 주별 기록 */}
      <div className="mb-2 mt-4 text-[13px] font-black text-jb-ink">주별 기록</div>
      {b.history.length === 0 ? (
        <div className="rounded-[12px] border border-jb-line bg-white px-4 py-10 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13px] font-bold text-jb-ink">아직 지난 기록이 없어요</div>
          <p className="mt-1.5 text-[11.5px] text-jb-ink-mute">한 주(수~화)가 끝나면 여기에 주별 보너스가 쌓여요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {b.history.map((w) => (
            <div
              key={w.weekStart}
              className="flex items-center gap-3 rounded-[12px] border border-jb-line bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
            >
              <div className="min-w-0 flex-1">
                <div className="tnum text-[13px] font-black text-jb-ink">
                  {md(w.weekStart)} ~ {md(w.weekEnd)}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-semibold text-jb-ink-mute">
                  {w.tierName} · 완료 {krw(w.completed)}건 · 배달료 {krw(w.feeKrw)}원 ({w.daysWithData}일치)
                </div>
              </div>
              <div className="shrink-0 text-right">
                {w.eligible ? (
                  <span className="tnum text-[15px] font-black text-jb-green">+{krw(w.bonusKrw)}원</span>
                ) : (
                  <span className="text-[11.5px] font-bold text-jb-ink-mute">미자격</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 설명 */}
      <div className="mt-4 rounded-[12px] bg-jb-surface px-4 py-3 text-[11.5px] leading-relaxed text-jb-ink-soft">
        주간(수요일~화요일) 완료 <b>{krw(BURNING_MIN_COMPLETED)}건 이상({BURNING_MIN_TIER_NAME} 이상)</b>이면 그 주 배달료(미션
        제외)의 <b>{b.ratePct}%</b>가 추가 정산돼요. 매주 수요일에 새 주가 시작되고, 지난 주 보너스는 위 ‘주별 기록’에서 계속
        확인할 수 있어요.
      </div>
    </div>
  );
}
