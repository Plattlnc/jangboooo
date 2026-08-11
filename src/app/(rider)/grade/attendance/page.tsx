// 출석체크 — 주간(수~화) 완료건 기준. 30건당 출석 1회(최대 5), 5회 달성 시 35,000원.
// 데이터: getMyGrade().completed(배달등급과 동일 주간 완료건) → computeAttendance.

import Link from "next/link";
import { ChevronLeft, Check, Gift } from "lucide-react";
import { getMyGrade } from "@/app/(rider)/_lib/grade";
import { seasonOf } from "@/lib/grade";
import {
  computeAttendance,
  ATTENDANCE_PER_STAMP,
  ATTENDANCE_TARGET,
  ATTENDANCE_REWARD,
} from "@/lib/attendance";

export const dynamic = "force-dynamic";

/** 'YYYY-MM-DD' → 'M월 D일'. */
function md(s: string): string {
  return `${Number(s.slice(5, 7))}월 ${Number(s.slice(8, 10))}일`;
}

export default async function AttendancePage() {
  const g = await getMyGrade();
  const att = computeAttendance(g.completed);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const season = seasonOf(today);
  const seasonOpen = season.number != null;
  const wkStart = g.weekStart ?? season.start;
  const wkEnd = g.weekEnd ?? season.end;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Link
          href="/grade"
          aria-label="배달등급으로"
          className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-jb-line bg-white active:bg-jb-line-soft"
        >
          <ChevronLeft size={18} strokeWidth={2.4} className="text-jb-ink" />
        </Link>
        <h1 className="text-xl font-black tracking-[-0.03em]">출석체크</h1>
        <span
          className={
            "ml-0.5 rounded-full px-2 py-0.5 text-[11px] font-black " +
            (seasonOpen ? "bg-jb-indigo-tint text-jb-indigo" : "bg-jb-track text-jb-ink-mute")
          }
        >
          {seasonOpen ? `시즌 ${season.number}` : "시즌 미오픈"}
        </span>
      </div>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">
        주간(수~화) {ATTENDANCE_PER_STAMP}건당 출석 1회 · {ATTENDANCE_TARGET}회 달성 시{" "}
        {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원
      </p>

      {/* 메인 카드 — 주차·달성여부 + 스탬프 5칸 */}
      <div className="rounded-2xl border border-jb-line bg-white px-[18px] py-[17px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div className="tnum text-[13px] font-black text-jb-ink">
            {md(wkStart)} ~ {md(wkEnd)}
          </div>
          <span
            className={
              "rounded-full px-2.5 py-[3px] text-[11px] font-black " +
              (att.reached ? "bg-jb-green-tint text-jb-green" : "bg-jb-track text-jb-ink-mute")
            }
          >
            {att.reached ? "달성" : "미달성"}
          </span>
        </div>

        <div className="mt-1 tnum text-[13px] font-bold text-jb-ink-soft">
          이번 주 완료 <span className="font-black text-jb-ink">{att.completed.toLocaleString("ko-KR")}</span>건 · 출석{" "}
          <span className="font-black text-jb-indigo">{att.stamps}</span>/{att.target}회
        </div>

        {/* 스탬프 5칸 — 달성(채움+체크) / 미달성(빈칸). 마지막 칸=보상 마일스톤 */}
        <div className="mt-3.5 flex items-start justify-between gap-1.5">
          {Array.from({ length: ATTENDANCE_TARGET }, (_, i) => {
            const done = i < att.stamps;
            const isReward = i === ATTENDANCE_TARGET - 1;
            const threshold = (i + 1) * ATTENDANCE_PER_STAMP;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={
                    "grid size-11 place-items-center rounded-full " +
                    (done
                      ? "bg-jb-green text-white shadow-[0_2px_6px_rgba(0,0,0,0.14)]"
                      : "border-2 border-dashed border-jb-line bg-jb-surface text-jb-ink-mute")
                  }
                >
                  {done ? (
                    <Check size={20} strokeWidth={3} />
                  ) : isReward ? (
                    <Gift size={18} strokeWidth={2.2} />
                  ) : (
                    <span className="text-[13px] font-black">{i + 1}</span>
                  )}
                </div>
                <span className={"tnum text-[10.5px] font-bold " + (done ? "text-jb-ink" : "text-jb-ink-mute")}>
                  {threshold}건
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 보상 카드 */}
      <div className="mt-3 rounded-2xl border border-jb-line bg-white px-[18px] py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <div
            className={
              "grid size-11 shrink-0 place-items-center rounded-full " +
              (att.reached ? "bg-jb-green-tint text-jb-green" : "bg-jb-track text-jb-ink-mute")
            }
          >
            <Gift size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-jb-ink-mute">{ATTENDANCE_TARGET}회 달성 보상</div>
            <div
              className={
                "tnum text-[22px] font-black leading-tight tracking-[-0.02em] " +
                (att.reached ? "text-jb-green" : "text-jb-ink")
              }
            >
              {ATTENDANCE_REWARD.toLocaleString("ko-KR")}
              <span className="ml-1 text-[14px] font-bold text-jb-ink-mute">원</span>
            </div>
          </div>
        </div>
        <div
          className={
            "mt-3 rounded-[10px] px-3 py-2 text-[12px] font-bold " +
            (att.reached ? "bg-jb-green-tint text-jb-green" : "bg-jb-surface text-jb-ink")
          }
        >
          {att.reached ? (
            <>축하해요! 이번 주 5회 출석을 달성해 {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원이 적립돼요 🎉</>
          ) : (
            <>
              5회 달성까지 <span className="tnum">{att.toReward.toLocaleString("ko-KR")}</span>건 남았어요
              {att.toNextStamp > 0 ? (
                <>
                  {" "}
                  (다음 출석까지 <span className="tnum">{att.toNextStamp}</span>건)
                </>
              ) : null}
            </>
          )}
        </div>
        {!seasonOpen ? (
          <div className="mt-2 text-[11px] text-jb-ink-mute">시즌이 열리면 출석 보상이 지급돼요.</div>
        ) : null}
      </div>

      {/* 설명 */}
      <div className="mt-4 rounded-[12px] bg-jb-surface px-4 py-3 text-[11.5px] leading-relaxed text-jb-ink-soft">
        주간(수요일~화요일) 완료 <b>{ATTENDANCE_PER_STAMP}건당 출석 1회</b>가 적립되고, <b>{ATTENDANCE_TARGET}회(총{" "}
        {ATTENDANCE_TARGET * ATTENDANCE_PER_STAMP}건) 달성 시 {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원</b>이 지급돼요.
        출석은 매주 수요일에 초기화됩니다.
      </div>
    </div>
  );
}
