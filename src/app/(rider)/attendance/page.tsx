// 출석체크 — 주간(수~화) 일별 30건 달성. 7일 중 5일 30건 이상이면 35,000원 지급.
// 데이터: getMyAttendance() (get_rider_daily_for('week') 일별 완료건). 드로어 최상위 진입.

import { Check, Gift } from "lucide-react";
import { getMyAttendance } from "@/app/(rider)/_lib/grade";
import { seasonOf } from "@/lib/grade";
import {
  ATTENDANCE_DAILY_TARGET,
  ATTENDANCE_DAYS_REQUIRED,
  ATTENDANCE_REWARD,
  ATTENDANCE_WEEK_DAYS,
} from "@/lib/attendance";

export const dynamic = "force-dynamic";

/** 'YYYY-MM-DD' → 'M월 D일'. */
function md(s: string): string {
  return `${Number(s.slice(5, 7))}월 ${Number(s.slice(8, 10))}일`;
}

export default async function AttendancePage() {
  const att = await getMyAttendance();

  const season = seasonOf(att.today);
  const seasonOpen = season.number != null;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black tracking-[-0.03em]">출석체크</h1>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[11px] font-black " +
            (seasonOpen ? "bg-jb-indigo-tint text-jb-indigo" : "bg-jb-track text-jb-ink-mute")
          }
        >
          {seasonOpen ? `시즌 ${season.number}` : "시즌 미오픈"}
        </span>
      </div>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">
        하루 {ATTENDANCE_DAILY_TARGET}건 완료 시 출석 · 주간(수~화) {ATTENDANCE_WEEK_DAYS}일 중{" "}
        {ATTENDANCE_DAYS_REQUIRED}일 달성 시 {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원
      </p>

      {/* 보상 카드 (상단) */}
      <div className="rounded-2xl border border-jb-line bg-white px-[18px] py-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
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
            <div className="text-[12px] font-semibold text-jb-ink-mute">{ATTENDANCE_DAYS_REQUIRED}일 달성 보상</div>
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
            <>이번 주 {att.required}일 달성! {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원이 적립돼요 🎉</>
          ) : (
            <>
              보상까지 <span className="tnum">{att.remainingDays}</span>일 더 달성하면 돼요 (하루 {ATTENDANCE_DAILY_TARGET}건)
            </>
          )}
        </div>
        {!seasonOpen ? (
          <div className="mt-2 text-[11px] text-jb-ink-mute">시즌이 열리면 출석 보상이 지급돼요.</div>
        ) : null}
      </div>

      {/* 메인 카드 — 주차·달성일 + 7일 일별 진행 */}
      <div className="mt-3 rounded-2xl border border-jb-line bg-white px-[18px] py-[17px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between">
          <div className="tnum text-[13px] font-black text-jb-ink">
            {md(att.weekStart)} ~ {md(att.weekEnd)}
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

        <div className="mt-1 text-[13px] font-bold text-jb-ink-soft">
          달성 <span className="font-black text-jb-green">{att.achievedDays}</span> / {att.required}일
          <span className="ml-1 text-jb-ink-mute">(30건 이상인 날)</span>
        </div>

        {/* 7일 일별 진행 — 수~화 */}
        <div className="mt-3 space-y-1.5">
          {att.days.map((d) => {
            const isToday = d.date === att.today;
            const pct = Math.min(100, Math.round((d.completed / ATTENDANCE_DAILY_TARGET) * 100));
            return (
              <div
                key={d.date}
                className={
                  "flex items-center gap-2.5 rounded-[12px] px-2.5 py-2 " +
                  (d.done ? "bg-jb-green-tint" : isToday ? "bg-jb-surface" : "bg-jb-surface/60")
                }
              >
                <span
                  className={
                    "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-black " +
                    (d.done ? "bg-jb-green text-white" : "bg-white text-jb-ink-mute ring-1 ring-jb-line")
                  }
                >
                  {d.weekday}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="tnum text-[12px] font-bold text-jb-ink-soft">
                      <span className={"font-black " + (d.done ? "text-jb-green" : "text-jb-ink")}>{d.completed}</span>
                      <span className="text-jb-ink-mute"> / {ATTENDANCE_DAILY_TARGET}건</span>
                      {isToday ? <span className="ml-1.5 text-[10.5px] font-black text-jb-indigo">오늘</span> : null}
                    </span>
                    {d.done ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-black text-jb-green">
                        <Check size={13} strokeWidth={3} />
                        달성
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-jb-ink-mute">미달성</span>
                    )}
                  </div>
                  <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-jb-track">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: d.done ? "var(--jb-green)" : "var(--jb-indigo)" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 설명 */}
      <div className="mt-4 rounded-[12px] bg-jb-surface px-4 py-3 text-[11.5px] leading-relaxed text-jb-ink-soft">
        하루 완료 <b>{ATTENDANCE_DAILY_TARGET}건 이상이면 그날 출석</b>으로 인정돼요. 주간(수요일~화요일) 7일 중{" "}
        <b>{ATTENDANCE_DAYS_REQUIRED}일 달성 시 {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원</b>이 지급되며, 매주 수요일에
        초기화됩니다.
      </div>
    </div>
  );
}
