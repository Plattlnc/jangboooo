// 출석체크 — 주간(수~화) 일별 목표 달성. 7일 중 5일 달성이면 보상 지급(상수=@/lib/attendance).
// 데이터: getMyAttendance() (get_rider_daily_for('week') 일별 완료건). 드로어 최상위 진입.

import { Gift } from "lucide-react";
import { getMyAttendance } from "@/app/(rider)/_lib/grade";
import { seasonOf, GRADE_SEASON_START } from "@/lib/grade";
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

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;
/** 이벤트 시작일 라벨 — '8월 12일(수)'. (라이더 등급 시즌과 동일 시작) */
function eventStartLabel(): string {
  const d = new Date(`${GRADE_SEASON_START}T12:00:00Z`);
  return `${md(GRADE_SEASON_START)}(${WEEKDAY[d.getUTCDay()]})`;
}

export default async function AttendancePage() {
  const att = await getMyAttendance();

  const season = seasonOf(att.today);
  const seasonOpen = season.number != null;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      {/* 헤더 */}
      <h1 className="text-xl font-black tracking-[-0.03em]">출석체크</h1>
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
              (!seasonOpen
                ? "bg-jb-track text-jb-ink-mute"
                : att.reached
                  ? "bg-jb-green-tint text-jb-green"
                  : att.failed
                    ? "bg-jb-red-tint text-jb-red"
                    : "bg-jb-track text-jb-ink-mute")
            }
          >
            <Gift size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[12px] font-semibold text-jb-ink-mute">{ATTENDANCE_DAYS_REQUIRED}일 달성 보상</span>
              <span
                className={
                  "rounded-full px-2 py-0.5 text-[10.5px] font-black " +
                  (!seasonOpen
                    ? "bg-jb-track text-jb-ink-mute"
                    : att.reached
                      ? "bg-jb-green-tint text-jb-green"
                      : att.failed
                        ? "bg-jb-red-tint text-jb-red"
                        : "bg-jb-indigo-tint text-jb-indigo")
                }
              >
                {!seasonOpen ? "시작 전" : att.reached ? "달성" : att.failed ? "미달성" : "진행중"}
              </span>
            </div>
            <div
              className={
                "tnum text-[22px] font-black leading-tight tracking-[-0.02em] " +
                (!seasonOpen ? "text-jb-ink" : att.reached ? "text-jb-green" : att.failed ? "text-jb-red" : "text-jb-ink")
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
            (!seasonOpen
              ? "bg-jb-indigo-tint text-jb-indigo"
              : att.reached
                ? "bg-jb-green-tint text-jb-green"
                : att.failed
                  ? "bg-jb-red-tint text-jb-red"
                  : "bg-jb-surface text-jb-ink")
          }
        >
          {!seasonOpen ? (
            <>출석체크 이벤트는 {eventStartLabel()}부터 시작돼요</>
          ) : att.reached ? (
            <>이번 주 {att.required}일 달성! {ATTENDANCE_REWARD.toLocaleString("ko-KR")}원이 적립돼요 🎉</>
          ) : att.failed ? (
            <>남은 일수로는 {att.required}일 달성이 어려워 이번 주는 미달성이에요</>
          ) : (
            <>
              보상까지 <span className="tnum">{att.remainingDays}</span>일 더 달성하면 돼요 (하루 {ATTENDANCE_DAILY_TARGET}건)
            </>
          )}
        </div>
      </div>

      {/* 메인 카드 — 주차·달성일 + 7일 일별 진행 (시작 전이면 안내) */}
      <div className="mt-3 rounded-2xl border border-jb-line bg-white px-[18px] py-[17px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        {!seasonOpen ? (
          <div className="py-8 text-center">
            <div className="text-[13.5px] font-bold text-jb-ink">아직 시작 전이에요</div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-jb-ink-mute">
              <b className="text-jb-ink">{eventStartLabel()}부터</b> 매주(수~화) 출석 현황이 여기에 표시돼요.
            </p>
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between">
          <div className="tnum text-[13px] font-black text-jb-ink">
            {md(att.weekStart)} ~ {md(att.weekEnd)}
          </div>
          <span
            className={
              "rounded-full px-2.5 py-[3px] text-[11px] font-black " +
              (att.reached
                ? "bg-jb-green-tint text-jb-green"
                : att.failed
                  ? "bg-jb-red-tint text-jb-red"
                  : "bg-jb-indigo-tint text-jb-indigo")
            }
          >
            {att.reached ? "달성" : att.failed ? "미달성" : "진행중"}
          </span>
        </div>

        <div className="mt-1 text-[13px] font-bold text-jb-ink-soft">
          달성 <span className="font-black text-jb-green">{att.achievedDays}</span> / {att.required}일
          <span className="ml-1 text-jb-ink-mute">({ATTENDANCE_DAILY_TARGET}건 이상인 날)</span>
        </div>

        {/* 7일 일별 진행 — 수~화 */}
        <div className="mt-3 space-y-1.5">
          {att.days.map((d) => {
            const isToday = d.date === att.today;
            const pct = Math.min(100, Math.round((d.completed / ATTENDANCE_DAILY_TARGET) * 100));
            const wdColor =
              d.status === "done" ? "text-jb-green" : d.status === "missed" ? "text-jb-red" : "text-jb-ink-soft";
            const cntColor =
              d.status === "done" ? "text-jb-green" : d.status === "missed" ? "text-jb-red" : "text-jb-ink";
            const barColor =
              d.status === "done" ? "var(--jb-green)" : d.status === "missed" ? "var(--jb-red)" : "var(--jb-indigo)";
            return (
              <div key={d.date} className="flex items-center gap-2.5 rounded-[12px] bg-jb-surface px-2.5 py-2">
                <span className={"w-7 shrink-0 text-center text-[14px] font-black " + wdColor}>{d.weekday}</span>
                <div className="min-w-0 flex-1">
                  <div className="tnum text-[12px] font-bold text-jb-ink-soft">
                    <span className={"font-black " + cntColor}>{d.completed}</span>
                    <span className="text-jb-ink-mute"> / {ATTENDANCE_DAILY_TARGET}건</span>
                    {isToday ? <span className="ml-1.5 text-[10.5px] font-black text-jb-indigo">오늘</span> : null}
                  </div>
                  <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-jb-track">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
        )}
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
