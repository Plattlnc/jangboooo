import Link from "next/link";
import { getAdminCustomView, getAdminPeriodView, getAdminRiderInfo } from "@/lib/supabase/admin-queries";
import { PeriodTabs, type PeriodTabKey } from "@/components/admin/period-tabs";
import { DateRangeForm } from "@/components/admin/date-range-form";
import { acceptBand, fmtCount, fmtDateRange, fmtPct, fmtRangeLabel } from "@/components/admin/format";
import { addDaysIso, clampCustomRange } from "@/lib/admin/date-range";
import { isSlaPeriod } from "@/app/(rider)/_lib/metrics";
import type { SlaPeriod } from "@/types/database";

export const dynamic = "force-dynamic";

// 라이더(직원) 전체 목록 — 기간별 실적 테이블. 행 탭 → 개별 상세.
// from/to 쿼리 = 날짜 직접 선택(포함 최대 7일, 당일 제외 — 서버 클램프).
export default async function AdminRidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period: SlaPeriod = isSlaPeriod(sp.period) ? sp.period : "today";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  // 페이지에 필요한 기간 범위만 fetch(홈 superset 미사용) + 라이더 명부는 5분 메모.
  const [{ view: periodView, businessToday }, riderMeta] = await Promise.all([
    getAdminPeriodView(period),
    getAdminRiderInfo(),
  ]);
  const customRange = clampCustomRange(sp.from, sp.to, businessToday, 7);
  const view = customRange ? await getAdminCustomView(customRange) : periodView;
  const tab: PeriodTabKey = customRange ? "custom" : period;
  const rangeLabel = customRange ? fmtDateRange(customRange) : fmtRangeLabel(period, view.range);

  const nameOf = (id: string) => riderMeta.info[id]?.name ?? null;
  const matches = (id: string) => {
    if (!q) return true;
    const needle = q.toLowerCase();
    return id.toLowerCase().includes(needle) || (nameOf(id) ?? "").toLowerCase().includes(needle);
  };

  const riders = view.riders.filter((r) => matches(r.adminRiderId));
  // 기간 내 실적 없는 등록(활성) 라이더 — 하단 접이식으로 노출.
  const withRecords = new Set(view.riders.map((r) => r.adminRiderId));
  const idle = Object.entries(riderMeta.info)
    .filter(([id, info]) => info.isActive && !withRecords.has(id) && matches(id))
    .map(([id, info]) => ({ id, name: info.name }))
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id, "ko"));

  return (
    <div className="px-3.5 py-[9px]">
      <PeriodTabs period={tab} basePath="/admin/riders" extraQuery={q ? { q } : {}} />

      <DateRangeForm
        basePath="/admin/riders"
        from={customRange?.start_date}
        to={customRange?.end_date}
        maxDate={addDaysIso(businessToday, -1)}
        extraQuery={q ? { q } : {}}
        note="최대 7일 조회 · 오늘은 실시간 수집 중이라 선택할 수 없어요"
      />

      <div className="mt-2 flex items-center justify-between px-0.5">
        <span className="text-xs font-black text-jb-ink">
          라이더 실적 <span className="tnum text-jb-indigo">{fmtCount(riders.length)}명</span>
        </span>
        <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{rangeLabel}</span>
      </div>

      {/* 검색(GET) — 기간/커스텀 범위 유지 */}
      <form className="mt-1.5 flex gap-1.5" action="/admin/riders" method="get">
        <input type="hidden" name="period" value={period} />
        {customRange ? (
          <>
            <input type="hidden" name="from" value={customRange.start_date} />
            <input type="hidden" name="to" value={customRange.end_date} />
          </>
        ) : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="이름 또는 라이더 ID 검색"
          className="min-w-0 flex-1 border border-jb-line bg-white px-3 py-2 text-[13px] font-bold text-jb-ink placeholder:font-semibold placeholder:text-jb-ink-mute focus:outline-none"
        />
        <button type="submit" className="shrink-0 bg-jb-indigo px-3.5 text-[12.5px] font-black text-white">
          검색
        </button>
      </form>

      <div className="mt-2 border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
          <span>라이더</span>
          <span className="w-[52px] text-right">완료</span>
          <span className="w-[30px] text-right">거절</span>
          <span className="w-[52px] text-right">수락률</span>
        </div>
        {riders.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] font-bold text-jb-ink-mute">
            {q ? "검색 결과가 없어요" : "집계된 실적이 없어요"}
          </div>
        ) : (
          riders.map((r) => {
            const band = acceptBand(r.acceptanceRate);
            return (
              <Link
                key={r.adminRiderId}
                href={`/admin/riders/${encodeURIComponent(r.adminRiderId)}`}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-2.5 last:border-b-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-jb-ink">
                    {nameOf(r.adminRiderId) ?? r.adminRiderId}
                  </span>
                  <span className="tnum block text-[10px] font-semibold text-jb-ink-mute">
                    {r.adminRiderId} · 활동 {r.activeDays}일
                  </span>
                </span>
                <span className="w-[52px] text-right">
                  <span className="tnum block text-[13.5px] font-black text-jb-ink">{fmtCount(r.completed)}</span>
                  {r.bmart.complete > 0 ? (
                    <span className="tnum block text-[9.5px] font-bold text-jb-ink-mute">
                      B마트 {fmtCount(r.bmart.complete)}
                    </span>
                  ) : null}
                  {r.store.complete > 0 ? (
                    <span className="tnum block text-[9.5px] font-bold text-jb-ink-mute">
                      스토어 {fmtCount(r.store.complete)}
                    </span>
                  ) : null}
                </span>
                <span className="tnum w-[30px] text-right text-[13px] font-bold text-jb-ink-soft">
                  {fmtCount(r.rejected)}
                </span>
                <span className="tnum w-[52px] text-right text-[13px] font-black" style={{ color: band.color }}>
                  {fmtPct(r.acceptanceRate)}
                </span>
              </Link>
            );
          })
        )}
      </div>

      {idle.length > 0 ? (
        <details className="mt-2 border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <summary className="cursor-pointer px-3.5 py-2.5 text-[12px] font-bold text-jb-ink-soft">
            기간 실적 없는 라이더 <span className="tnum text-jb-ink-mute">{fmtCount(idle.length)}명</span>
          </summary>
          <div className="border-t border-jb-line-soft px-3.5 py-2 text-[12px] font-semibold leading-6 text-jb-ink-mute">
            {idle.map((r) => (
              <Link key={r.id} href={`/admin/riders/${encodeURIComponent(r.id)}`} className="mr-3 inline-block">
                {r.name ?? r.id}
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
