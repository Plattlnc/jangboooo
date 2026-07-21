import Link from "next/link";
import { getAdminCustomView, getAdminPeriodView, getAdminRiderInfo } from "@/lib/supabase/admin-queries";
import { PeriodTabs, type PeriodTabKey } from "@/components/admin/period-tabs";
import { DateRangeForm } from "@/components/admin/date-range-form";
import { acceptBand, fmtCount, fmtDateRange, fmtPct, fmtRangeLabel } from "@/components/admin/format";
import { addDaysIso, clampCustomRange } from "@/lib/admin/date-range";
import { isSlaPeriod } from "@/app/(rider)/_lib/metrics";
import type { SlaPeriod } from "@/types/database";

export const dynamic = "force-dynamic";

// 지표 상세 — 수락률(낮은 순)/거절률(높은 순) 전체 랭킹. 산식=배민 공식(푸드 기준).
// from/to 쿼리 = 날짜 직접 선택(포함 최대 7일, 당일 제외 — 서버 클램프).
export default async function AdminMetricsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period: SlaPeriod = isSlaPeriod(sp.period) ? sp.period : "today";

  // 페이지에 필요한 기간 범위만 fetch(홈 superset 미사용) + 라이더 명부는 5분 메모.
  const [{ view: periodView, businessToday }, riderMeta] = await Promise.all([
    getAdminPeriodView(period),
    getAdminRiderInfo(),
  ]);
  const customRange = clampCustomRange(sp.from, sp.to, businessToday, 7);
  const view = customRange ? await getAdminCustomView(customRange) : periodView;
  const tab: PeriodTabKey = customRange ? "custom" : period;
  const rangeLabel = customRange ? fmtDateRange(customRange) : fmtRangeLabel(period, view.range);
  const nameOf = (id: string) => riderMeta.info[id]?.name ?? id;

  const rated = view.riders.filter((r) => r.acceptanceRate != null);
  const byAcceptAsc = [...rated].sort((a, b) => (a.acceptanceRate ?? 0) - (b.acceptanceRate ?? 0));
  const byRejectDesc = [...rated]
    .filter((r) => (r.rejectionRate ?? 0) > 0)
    .sort((a, b) => (b.rejectionRate ?? 0) - (a.rejectionRate ?? 0))
    .slice(0, 10);

  return (
    <div className="px-3.5 py-[9px]">
      <PeriodTabs period={tab} basePath="/admin/metrics" />

      <DateRangeForm
        basePath="/admin/metrics"
        from={customRange?.start_date}
        to={customRange?.end_date}
        maxDate={addDaysIso(businessToday, -1)}
        note="최대 7일 조회 · 오늘은 실시간 수집 중이라 선택할 수 없어요"
      />

      <div className="mt-2 flex items-center justify-between px-0.5">
        <span className="text-xs font-black text-jb-ink">전체 지표</span>
        <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{rangeLabel}</span>
      </div>

      {/* 요약 스트립 */}
      <div className="mt-1.5 grid grid-cols-3 gap-[7px]">
        {[
          { label: "통합 수락률", value: fmtPct(view.totals.acceptanceRate), color: acceptBand(view.totals.acceptanceRate).color },
          { label: "통합 거절률", value: fmtPct(view.totals.rejectionRate), color: "#D9342B" },
          { label: "SLA 점수", value: view.totals.slaScore == null ? "—" : `${view.totals.slaScore}`, color: "#4F6AF5" },
        ].map((c) => (
          <div key={c.label} className="border border-jb-line bg-white px-2 py-2.5 text-center shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
            <div className="text-[10.5px] font-bold text-jb-ink-mute">{c.label}</div>
            <div className="tnum mt-0.5 text-[17px] font-black" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 수락률 랭킹(낮은 순) */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">수락률 랭킹</span>
          <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">낮은 순 · 관리 필요 우선</span>
        </div>
        <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
            <span className="w-4" />
            <span>라이더</span>
            <span className="text-right">완료 / 거절</span>
            <span className="w-[52px] text-right">수락률</span>
          </div>
          {byAcceptAsc.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] font-bold text-jb-ink-mute">집계된 실적이 없어요</div>
          ) : (
            byAcceptAsc.map((r, i) => {
              const band = acceptBand(r.acceptanceRate);
              return (
                <Link
                  key={r.adminRiderId}
                  href={`/admin/riders/${encodeURIComponent(r.adminRiderId)}`}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-2 last:border-b-0"
                >
                  <span className="tnum w-4 text-[11.5px] font-black text-jb-ink-mute">{i + 1}</span>
                  <span className="min-w-0 truncate text-[13px] font-bold text-jb-ink">
                    {nameOf(r.adminRiderId)}
                    <span className="tnum ml-1.5 text-[10px] font-semibold text-jb-ink-mute">{r.adminRiderId}</span>
                  </span>
                  <span className="tnum text-right text-[11.5px] font-bold text-jb-ink-soft">
                    {fmtCount(r.food.complete)} / {fmtCount(r.food.reject)}
                  </span>
                  <span className="tnum w-[52px] text-right text-[13px] font-black" style={{ color: band.color }}>
                    {fmtPct(r.acceptanceRate)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* 거절률 상위 */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">거절률 상위</span>
          <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">높은 순 · 최대 10명</span>
        </div>
        <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          {byRejectDesc.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] font-bold text-jb-ink-mute">
              기간 내 거절 기록이 없어요
            </div>
          ) : (
            byRejectDesc.map((r, i) => (
              <Link
                key={r.adminRiderId}
                href={`/admin/riders/${encodeURIComponent(r.adminRiderId)}`}
                className={
                  "flex items-center gap-2.5 px-3 py-2 " + (i > 0 ? "border-t border-jb-line-soft" : "")
                }
              >
                <span className="tnum w-4 shrink-0 text-[11.5px] font-black text-jb-ink-mute">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-jb-ink">
                  {nameOf(r.adminRiderId)}
                  <span className="tnum ml-1.5 text-[10px] font-semibold text-jb-ink-mute">{r.adminRiderId}</span>
                </span>
                <span className="tnum text-[11.5px] font-bold text-jb-ink-soft">거절 {fmtCount(r.rejected)}건</span>
                <span className="tnum w-[52px] text-right text-[13px] font-black text-[#D9342B]">
                  {fmtPct(r.rejectionRate)}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        수락률·거절률 = 푸드 완료+거절+취소+귀책 분모 기준(배민 공식) · B마트·스토어 미포함
      </div>
    </div>
  );
}
