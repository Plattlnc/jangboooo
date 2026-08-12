import Link from "next/link";
import { getAdminCustomView, getAdminPeriodView, getAdminRiderInfo } from "@/lib/supabase/admin-queries";
import { PeriodSelector } from "@/components/admin/period-selector";
import { acceptBand, fmtCount, fmtPct, fmtRangeLabel } from "@/components/admin/format";
import { buildWeekOptions, buildMonthOptions, weekRangeOf, monthRangeOf, isValidIsoDate } from "@/lib/admin/date-range";

export const dynamic = "force-dynamic";

const YM = /^\d{4}-\d{2}$/;

// 라이더(직원) 전체 목록 — 기간별 실적 테이블. 행 탭 → 개별 상세.
// 상단 오늘/주(수~화)/월 드롭다운(홈과 동일). ?wk=수요일 / ?mo=YYYY-MM.
export default async function AdminRidersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [{ view: todayView, businessToday }, riderMeta] = await Promise.all([
    getAdminPeriodView("today"),
    getAdminRiderInfo(),
  ]);

  const weekRaw = buildWeekOptions(businessToday, 5);
  const monthRaw = buildMonthOptions(businessToday, 6);
  const weekOptions = weekRaw.map((o) => ({ value: o.value, label: `${o.range.start_date} ~ ${o.range.end_date}` }));
  const monthOptions = monthRaw.map((o) => ({ value: o.value, label: o.value }));

  const wk = isValidIsoDate(sp.wk) && weekRaw.some((o) => o.value === sp.wk) ? (sp.wk as string) : undefined;
  const mo = typeof sp.mo === "string" && YM.test(sp.mo) && monthRaw.some((o) => o.value === sp.mo) ? sp.mo : undefined;

  let view = todayView;
  let activePeriod: "today" | "week" | "month" = "today";
  let rangeLabel = fmtRangeLabel("today", todayView.range);
  if (mo) {
    view = await getAdminCustomView(monthRangeOf(mo, businessToday));
    activePeriod = "month";
    rangeLabel = mo;
  } else if (wk) {
    view = await getAdminCustomView(weekRangeOf(wk));
    activePeriod = "week";
    rangeLabel = weekOptions.find((o) => o.value === wk)?.label ?? fmtRangeLabel("week", view.range);
  }

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
    <div className="px-3.5 py-3">
      <PeriodSelector
        basePath="/admin/riders"
        activePeriod={activePeriod}
        weekOptions={weekOptions}
        monthOptions={monthOptions}
        selectedWeek={wk ?? weekRaw[0].value}
        selectedMonth={mo ?? monthRaw[0].value}
        rangeLabel={rangeLabel}
        extraQuery={q ? { q } : {}}
      />

      <div className="mt-2.5 px-0.5">
        <span className="text-[15px] font-black text-jb-ink">
          라이더 실적 <span className="tnum text-jb-indigo">{fmtCount(riders.length)}명</span>
        </span>
      </div>

      {/* 검색(GET) — 기간/커스텀 범위 유지 */}
      <form className="mt-1.5 flex gap-1.5" action="/admin/riders" method="get">
        {wk ? <input type="hidden" name="wk" value={wk} /> : null}
        {mo ? <input type="hidden" name="mo" value={mo} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="이름 또는 라이더 ID 검색"
          className="min-w-0 flex-1 rounded-[12px] border border-jb-line bg-jb-card px-3 py-2 text-[13px] font-bold text-jb-ink placeholder:font-semibold placeholder:text-jb-ink-mute focus:outline-none"
        />
        <button type="submit" className="shrink-0 rounded-[12px] bg-jb-indigo px-3.5 text-[12.5px] font-black text-white">
          검색
        </button>
      </form>

      <div className="mt-2 rounded-[18px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
          <span>라이더</span>
          <span className="w-[52px] text-right">완료</span>
          <span className="w-[46px] text-right">거절</span>
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
                <span className="w-[46px] text-right">
                  <span className="tnum block text-[13px] font-bold text-jb-ink-soft">{fmtCount(r.rejected)}</span>
                  {r.bmart.reject > 0 ? (
                    <span className="tnum block text-[9.5px] font-bold text-jb-ink-mute">
                      B마트 {fmtCount(r.bmart.reject)}
                    </span>
                  ) : null}
                  {r.store.reject > 0 ? (
                    <span className="tnum block text-[9.5px] font-bold text-jb-ink-mute">
                      스토어 {fmtCount(r.store.reject)}
                    </span>
                  ) : null}
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
        <details className="mt-2 rounded-[18px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
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
