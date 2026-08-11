// 배달일지 — 탭(배달일지/배달등급/프로모션). 배달일지 탭만 데이터 조회(공백 탭은 조회 없음).
// URL ?m=YYYY-MM(월), ?tab=grade|promo. 데이터: get_rider_daily_for + rider_daily_fees + delivery_fee_details.

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

  const tabRaw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: "diary" | "grade" | "promo" = tabRaw === "grade" ? "grade" : tabRaw === "promo" ? "promo" : "diary";
  const TABS = [
    { key: "diary", label: "배달일지", href: `/diary?m=${month}` },
    { key: "grade", label: "배달등급", href: "/diary?tab=grade" },
    { key: "promo", label: "프로모션", href: "/diary?tab=promo" },
  ] as const;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">배달일지</h1>

      {/* 탭: 배달일지 / 배달등급 / 프로모션 */}
      <div className="mb-3.5 mt-3 flex gap-1 rounded-[10px] bg-jb-tab-bg p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={
              "flex-1 rounded-[7px] py-[7px] text-center text-[12.5px] font-bold transition-colors " +
              (tab === t.key
                ? "bg-white text-jb-ink shadow-[0_1px_2px_0_rgba(0,0,0,0.06)]"
                : "text-jb-ink-mute active:text-jb-ink")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 배달일지 탭만 데이터 조회(공백 탭은 조회 없음 → egress 절감). */}
      {tab === "diary" ? (
        <DiaryTabContent month={month} nowMonth={nowMonth} />
      ) : (
        <div className="grid min-h-[50dvh] place-items-center">
          <span className="text-[12.5px] text-jb-ink-mute">준비 중입니다</span>
        </div>
      )}
    </div>
  );
}

// 배달일지 탭 본문 — 월 이동 + 월 수입 히어로 + 일별 카드. 렌더될 때만 조회된다.
async function DiaryTabContent({ month, nowMonth }: { month: string; nowMonth: string }) {
  const diary = await getDeliveryDiary(month);
  const [y, m] = month.split("-");
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const hasNext = next <= nowMonth;

  return (
    <>
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
        <div className="mt-3 border-t border-white/20 pt-3">
          {diary.totalFeeKrw != null ? (
            <>
              <div className="text-[11.5px] font-semibold opacity-90">이 달 수입 (세전)</div>
              <div className="tnum mt-0.5 text-[27px] font-black leading-none tracking-[-0.02em]">
                {diary.totalFeeKrw.toLocaleString("ko-KR")}
                <span className="ml-1 text-[16px] font-bold opacity-90">원</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold opacity-90">
                <span className="tnum">완료 {diary.totalCompleted.toLocaleString("ko-KR")}건</span>
                <span className="tnum">활동일 {diary.activeDays}일</span>
                {diary.totalMissionKrw > 0 ? (
                  <span className="tnum">미션 +{diary.totalMissionKrw.toLocaleString("ko-KR")}원</span>
                ) : null}
              </div>
              {diary.hourlyKrw != null || diary.perKmKrw != null ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/20 pt-2.5 text-[12px] font-bold">
                  {diary.hourlyKrw != null ? (
                    <span className="tnum">
                      내 시급 <span className="text-[13px] font-black">{diary.hourlyKrw.toLocaleString("ko-KR")}</span>원
                    </span>
                  ) : null}
                  {diary.perKmKrw != null ? (
                    <span className="tnum">
                      KM당 <span className="text-[13px] font-black">{diary.perKmKrw.toLocaleString("ko-KR")}</span>원
                    </span>
                  ) : null}
                  {diary.totalDistanceKm != null ? (
                    <span className="tnum opacity-80">총 {diary.totalDistanceKm.toFixed(1)}KM</span>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-end justify-between">
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
          )}
        </div>
      </div>

      {/* 일별 목록 — 최신일 우선. 각 일자 카드 터치 시 배달건 상세로 이동. */}
      {diary.days.length === 0 ? (
        <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-9 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13.5px] font-bold text-jb-ink">이 달 배달 기록이 없어요</div>
          <p className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">배달이 집계되면 일별 기록이 여기에 쌓입니다.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {diary.days.map((d) => (
            <Link
              key={d.date}
              href={`/diary/${d.date}`}
              className="flex items-center gap-3 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
            >
              <div className="w-[56px] shrink-0">
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
              <div className="min-w-0 flex-1">
                <div className="tnum text-[13px] font-bold text-jb-ink">완료 {d.completed.toLocaleString("ko-KR")}건</div>
                <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-jb-ink-mute">
                  {d.rejected > 0 ? <span className="tnum">거절 {d.rejected}</span> : null}
                  {d.canceled > 0 ? <span className="tnum">취소 {d.canceled}</span> : null}
                  {d.acceptanceRate != null ? <span className="tnum">수락률 {d.acceptanceRate}%</span> : null}
                </div>
                {d.perKmKrw != null || d.hourlyKrw != null ? (
                  <div className="mt-1 flex flex-wrap gap-x-2.5 text-[11px] font-bold text-jb-indigo">
                    {d.hourlyKrw != null ? <span className="tnum">시급 {d.hourlyKrw.toLocaleString("ko-KR")}원</span> : null}
                    {d.perKmKrw != null ? <span className="tnum">KM당 {d.perKmKrw.toLocaleString("ko-KR")}원</span> : null}
                  </div>
                ) : null}
              </div>
              {d.feeKrw != null ? (
                <div className="shrink-0 text-right">
                  <div className="tnum text-[16px] font-black text-jb-green">
                    {d.feeKrw.toLocaleString("ko-KR")}
                    <span className="ml-0.5 text-[11px] font-bold text-jb-ink-mute">원</span>
                  </div>
                  {d.missionKrw > 0 ? (
                    <div className="tnum mt-1 text-[11.5px] font-bold text-jb-indigo">
                      +{d.missionKrw.toLocaleString("ko-KR")}원 미션
                    </div>
                  ) : null}
                </div>
              ) : (
                <span className="tnum shrink-0 text-[15px] font-black text-jb-green">
                  {d.completed.toLocaleString("ko-KR")}
                  <span className="ml-0.5 text-[11.5px] font-semibold text-jb-ink-mute">건</span>
                </span>
              )}
              <ChevronRight size={17} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
