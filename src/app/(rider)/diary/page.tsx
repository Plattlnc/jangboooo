// 배달일지 — 내 일일 배달 완료 기록(월 단위, 최신일 우선). URL ?m=YYYY-MM 이 SSOT.
// 데이터: get_rider_daily_for(month) — 영업일(-6h) 경계는 대시보드와 동일.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDeliveryDiary } from "@/app/(rider)/_lib/diary";

export const dynamic = "force-dynamic";

/** 현재 KST 달력월 YYYY-MM. */
function currentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

/** YYYY-MM ± n개월. */
function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(raw: string | string[] | undefined, nowMonth: string): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return nowMonth;
  return value > nowMonth ? nowMonth : value; // 미래 월 금지
}

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const nowMonth = currentMonth();
  const month = parseMonth(sp.m, nowMonth);
  const diary = await getDeliveryDiary(month);

  const [y, m] = month.split("-");
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const hasNext = next <= nowMonth;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">배달일지</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">일별 배달 완료 기록</p>

      {/* 월 이동 + 월 합계 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1E9E5A,#27b069)] px-[17px] py-[15px] text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.14)]">
        <div className="flex items-center justify-between">
          <Link
            href={`/diary?m=${prev}`}
            aria-label="이전 달"
            className="grid size-8 place-items-center rounded-[8px] bg-white/15 active:bg-white/25"
          >
            <ChevronLeft size={17} strokeWidth={2.4} />
          </Link>
          <span className="text-[15px] font-black tracking-[-0.02em]">
            {y}년 {Number(m)}월
          </span>
          {hasNext ? (
            <Link
              href={`/diary?m=${next}`}
              aria-label="다음 달"
              className="grid size-8 place-items-center rounded-[8px] bg-white/15 active:bg-white/25"
            >
              <ChevronRight size={17} strokeWidth={2.4} />
            </Link>
          ) : (
            <span aria-hidden className="grid size-8 place-items-center rounded-[8px] bg-white/5 opacity-40">
              <ChevronRight size={17} strokeWidth={2.4} />
            </span>
          )}
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
          <div>
            <div className="text-[11.5px] font-semibold opacity-90">이 달 완료</div>
            <div className="tnum mt-0.5 text-[24px] font-black leading-none tracking-[-0.02em]">
              {diary.totalCompleted.toLocaleString("ko-KR")}
              <span className="ml-0.5 text-[13px] font-bold opacity-90">건</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11.5px] font-semibold opacity-90">활동일</div>
            <div className="tnum mt-0.5 text-[24px] font-black leading-none tracking-[-0.02em]">
              {diary.activeDays}
              <span className="ml-0.5 text-[13px] font-bold opacity-90">일</span>
            </div>
          </div>
        </div>
      </div>

      {/* 일별 목록 — 최신일 우선 */}
      <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-1.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        {diary.days.length === 0 ? (
          <div className="py-9 text-center">
            <div className="text-[13.5px] font-bold text-jb-ink">이 달 배달 기록이 없어요</div>
            <p className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
              배달이 집계되면 일별 기록이 여기에 쌓입니다.
            </p>
          </div>
        ) : (
          diary.days.map((d) => (
            <div key={d.date} className="flex items-center gap-3 border-t border-jb-line-soft py-2.5 first:border-t-0">
              <div className="w-[64px] shrink-0">
                <span className="tnum text-[13.5px] font-black text-jb-ink">
                  {Number(d.date.slice(5, 7))}.{d.date.slice(8, 10)}
                </span>
                <span
                  className={
                    "ml-1 text-[11.5px] font-bold " +
                    (d.weekday === "일" ? "text-[#D9342B]" : d.weekday === "토" ? "text-jb-indigo" : "text-jb-ink-mute")
                  }
                >
                  {d.weekday}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-[11.5px] text-jb-ink-mute">
                {d.rejected > 0 ? <span className="tnum mr-2">거절 {d.rejected}</span> : null}
                {d.canceled > 0 ? <span className="tnum mr-2">취소 {d.canceled}</span> : null}
                {d.acceptanceRate != null ? <span className="tnum">수락률 {d.acceptanceRate}%</span> : null}
              </div>
              <span className="tnum shrink-0 text-[15px] font-black text-jb-green">
                {d.completed.toLocaleString("ko-KR")}
                <span className="ml-0.5 text-[11.5px] font-semibold text-jb-ink-mute">건</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
