import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminRiderDetail } from "@/lib/supabase/admin-queries";
import { acceptBand, fmtCount, fmtPct, fmtRangeLabel, fmtShortDate } from "@/components/admin/format";
import type { AdminTotals } from "@/lib/admin/aggregate";

export const dynamic = "force-dynamic";

// 라이더 개별 상세 — 일간/주간/월간 요약 + 월간 일별 내역(원본 소스 단위와 동일 지표).
export default async function AdminRiderDetailPage({
  params,
}: {
  params: Promise<{ riderId: string }>;
}) {
  const { riderId } = await params;
  const detail = await getAdminRiderDetail(decodeURIComponent(riderId));
  if (!detail) notFound();

  const summaries: { key: string; label: string; range: string; totals: AdminTotals }[] = [
    { key: "today", label: "일간", range: fmtRangeLabel("today", detail.today.range), totals: detail.today.totals },
    { key: "week", label: "주간", range: fmtRangeLabel("week", detail.week.range), totals: detail.week.totals },
    { key: "month", label: "월간", range: fmtRangeLabel("month", detail.month.range), totals: detail.month.totals },
  ];

  return (
    <div className="px-3.5 py-[9px]">
      <Link href="/admin/riders" className="text-[11.5px] font-bold text-jb-indigo">
        ← 라이더 목록
      </Link>

      {/* 프로필 */}
      <div className="mt-2 flex items-center gap-[11px] border border-jb-line bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="grid size-10 shrink-0 place-items-center bg-jb-indigo-tint2 text-[15px] font-black text-jb-indigo">
          {(detail.name ?? detail.adminRiderId).trim().slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-[16px] font-black tracking-[-0.02em] text-jb-ink">
              {detail.name ?? detail.adminRiderId}
            </span>
            <span className="tnum whitespace-nowrap text-[11px] text-jb-ink-mute">UID {detail.adminRiderId}</span>
          </div>
          <div className="tnum mt-0.5 text-[11px] font-semibold text-jb-ink-mute">
            {detail.phone ?? "연락처 미등록"}
          </div>
        </div>
        <span
          className={
            "shrink-0 px-2 py-0.5 text-[10.5px] font-black " +
            (detail.isActive ? "bg-jb-green-tint text-jb-green" : "bg-jb-track text-jb-ink-mute")
          }
        >
          {detail.isActive ? "활성" : "비활성"}
        </span>
      </div>

      {/* 기간 요약 3행 */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">기간 요약</span>
        </div>
        <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          {summaries.map((s, i) => {
            const t = s.totals;
            const band = acceptBand(t.acceptanceRate);
            return (
              <div key={s.key} className={"px-3.5 py-2.5 " + (i > 0 ? "border-t border-jb-line-soft" : "")}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12.5px] font-black text-jb-ink">{s.label}</span>
                  <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{s.range}</span>
                </div>
                <div className="mt-1 grid grid-cols-4 gap-x-2 text-center">
                  <div>
                    <div className="text-[10px] font-bold text-jb-ink-mute">완료</div>
                    <div className="tnum text-[15px] font-black text-jb-ink">{fmtCount(t.completed)}</div>
                    <div className="tnum text-[9.5px] font-bold text-jb-ink-mute">B마트 {fmtCount(t.bmart.complete)}</div>
                    <div className="tnum text-[9.5px] font-bold text-jb-ink-mute">스토어 {fmtCount(t.store.complete)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-jb-ink-mute">거절</div>
                    <div className="tnum text-[15px] font-black text-jb-ink-soft">{fmtCount(t.rejected)}</div>
                    <div className="tnum text-[9.5px] font-bold text-jb-ink-mute">B마트 {fmtCount(t.bmart.reject)}</div>
                    <div className="tnum text-[9.5px] font-bold text-jb-ink-mute">스토어 {fmtCount(t.store.reject)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-jb-ink-mute">취소</div>
                    <div className="tnum text-[15px] font-black text-jb-ink-soft">
                      {fmtCount(t.dispatchCanceled + t.deliveryCanceled)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-jb-ink-mute">수락률</div>
                    <div className="tnum text-[15px] font-black" style={{ color: band.color }}>
                      {fmtPct(t.acceptanceRate)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 일별 내역(월간) */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">일별 내역</span>
          <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">이번 달 · 최신순</span>
        </div>
        <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
            <span>날짜</span>
            <span className="w-[46px] text-right">완료</span>
            <span className="w-[46px] text-right">거절</span>
            <span className="w-[30px] text-right">취소</span>
            <span className="w-[50px] text-right">수락률</span>
          </div>
          {detail.daily.length === 0 ? (
            <div className="px-4 py-6 text-center text-[12px] font-bold text-jb-ink-mute">
              이번 달 기록이 없어요
            </div>
          ) : (
            detail.daily.map((d) => {
              const band = acceptBand(d.acceptanceRate);
              return (
                <div
                  key={d.date}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-2.5 border-b border-jb-line-soft px-3 py-2 last:border-b-0"
                >
                  <span className="tnum text-[12.5px] font-bold text-jb-ink">{fmtShortDate(d.date)}</span>
                  <span className="w-[46px] text-right">
                    <span className="tnum block text-[12.5px] font-black text-jb-ink">{fmtCount(d.completed)}</span>
                    {d.bmart.complete > 0 ? (
                      <span className="tnum block text-[9px] font-bold text-jb-ink-mute">
                        B마트 {fmtCount(d.bmart.complete)}
                      </span>
                    ) : null}
                    {d.store.complete > 0 ? (
                      <span className="tnum block text-[9px] font-bold text-jb-ink-mute">
                        스토어 {fmtCount(d.store.complete)}
                      </span>
                    ) : null}
                  </span>
                  <span className="w-[46px] text-right">
                    <span className="tnum block text-[12.5px] font-bold text-jb-ink-soft">{fmtCount(d.rejected)}</span>
                    {d.bmart.reject > 0 ? (
                      <span className="tnum block text-[9px] font-bold text-jb-ink-mute">
                        B마트 {fmtCount(d.bmart.reject)}
                      </span>
                    ) : null}
                    {d.store.reject > 0 ? (
                      <span className="tnum block text-[9px] font-bold text-jb-ink-mute">
                        스토어 {fmtCount(d.store.reject)}
                      </span>
                    ) : null}
                  </span>
                  <span className="tnum w-[30px] text-right text-[12.5px] font-bold text-jb-ink-soft">
                    {fmtCount(d.dispatchCanceled + d.deliveryCanceled)}
                  </span>
                  <span className="tnum w-[50px] text-right text-[12.5px] font-black" style={{ color: band.color }}>
                    {fmtPct(d.acceptanceRate)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        수락률은 배민 공식 산식(푸드 기준) · B마트·스토어 건 미포함
      </div>
    </div>
  );
}
