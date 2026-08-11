// 배달일지 — 특정 일자 배달건 상세. 배달처리비를 크게, 하단에 할증 분해.
// 취소건도 포함(수입 0원이어도). 데이터: getDayDeliveryDetails(delivery_fee_details).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getDayDeliveryDetails, type DeliveryDetail } from "@/app/(rider)/_lib/diary";

export const dynamic = "force-dynamic";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;
function weekdayOf(date: string): string {
  return WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? "";
}

/** 배달처리비 구성(0 초과분만). */
function feeParts(d: DeliveryDetail): { label: string; value: number }[] {
  return [
    { label: "기본단가", value: d.base },
    { label: "기상할증", value: d.weather },
    { label: "추가할증", value: d.extra },
    { label: "피크할증", value: d.peak },
    { label: "지역할증", value: d.region },
    { label: "대량할증", value: d.bulk },
  ].filter((p) => p.value > 0);
}

export default async function DiaryDayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const day = await getDayDeliveryDetails(date);
  const [y, m, d] = date.split("-");
  const wd = weekdayOf(date);
  const month = `${y}-${m}`;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/diary?m=${month}`}
          aria-label="배달일지로"
          className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-jb-line bg-white active:bg-jb-line-soft"
        >
          <ChevronLeft size={18} strokeWidth={2.4} className="text-jb-ink" />
        </Link>
        <h1 className="text-xl font-black tracking-[-0.03em]">
          {Number(m)}월 {Number(d)}일 <span className="text-jb-ink-mute">({wd})</span>
        </h1>
      </div>

      {/* 일 요약 히어로 */}
      <div className="mt-3 rounded-[12px] bg-[linear-gradient(135deg,#1E9E5A,#27b069)] px-[17px] py-[15px] text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.14)]">
        <div className="text-[11.5px] font-semibold opacity-90">이 날 수입 (세전)</div>
        <div className="tnum mt-0.5 text-[27px] font-black leading-none tracking-[-0.02em]">
          {(day?.totalFeeKrw ?? 0).toLocaleString("ko-KR")}
          <span className="ml-1 text-[16px] font-bold opacity-90">원</span>
        </div>
        <div className="mt-2 flex gap-3 text-[11.5px] font-semibold opacity-90">
          <span className="tnum">완료 {day?.completedCount ?? 0}건</span>
          {day && day.canceledCount > 0 ? <span className="tnum">취소 {day.canceledCount}건</span> : null}
        </div>
      </div>

      {/* 배달건 목록 */}
      {!day || day.deliveries.length === 0 ? (
        <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-9 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13.5px] font-bold text-jb-ink">이 날 배달 상세가 없어요</div>
          <p className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">배달처리비 상세가 집계되면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {day.deliveries.map((dv) => (
            <div
              key={dv.deliveryNo}
              className="rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* 배달번호(더 굵게) + 가게(픽업지) 이름 */}
                  <div className="flex items-center gap-1.5">
                    {dv.isCanceled ? (
                      <span className="shrink-0 rounded-[6px] bg-jb-red-tint px-1.5 py-0.5 text-[10.5px] font-black text-jb-red">
                        취소
                      </span>
                    ) : null}
                    <span className="tnum shrink-0 text-[14px] font-black text-jb-ink">{dv.deliveryNo}</span>
                    <span className="truncate text-[12.5px] font-semibold text-jb-ink-soft">
                      {dv.storeName ?? "가게 정보 없음"}
                    </span>
                  </div>
                  {/* 시간·거리 */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] font-semibold text-jb-ink-soft">
                    {dv.pickupTime ? <span className="tnum">픽업 {dv.pickupTime}</span> : null}
                    {dv.deliveredTime ? (
                      <>
                        <span className="text-jb-ink-mute">→</span>
                        <span className="tnum">전달 {dv.deliveredTime}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-1 text-[11.5px] text-jb-ink-mute">
                    {dv.distanceKm != null ? <span className="tnum">거리 {dv.distanceKm.toFixed(1)}KM</span> : null}
                  </div>
                </div>
                {/* 배달처리비(가장 크게) */}
                <div className="shrink-0 text-right">
                  <div
                    className={
                      "tnum text-[19px] font-black leading-none " +
                      (dv.feeKrw > 0 ? "text-jb-green" : "text-jb-ink-mute")
                    }
                  >
                    {dv.feeKrw.toLocaleString("ko-KR")}
                    <span className="ml-0.5 text-[12px] font-bold text-jb-ink-mute">원</span>
                  </div>
                </div>
              </div>

              {/* 배달처리비 구성(할증 분해) */}
              {feeParts(dv).length > 0 ? (
                <div className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1 border-t border-jb-line-soft pt-2.5 text-[11.5px] text-jb-ink-soft">
                  {feeParts(dv).map((p, i) => (
                    <span key={p.label} className="tnum">
                      {i > 0 ? <span className="mr-2.5 text-jb-ink-mute">+</span> : null}
                      {p.label} {p.value.toLocaleString("ko-KR")}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
