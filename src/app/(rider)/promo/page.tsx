// 프로모션 — 자사 프로모션 통합 대시보드. 이번 주(수~화) 진행 중인 모든 적립을 한눈에.
// 집계: 라이더 등급 보상(누진, 쌓이는 금액) + 출석체크(5일 달성 시) + 주간 보너스(151건 초과분).
// 데이터: getMyGrade / getMyAttendance(_lib) + weeklyPromo(순수 계산, 등급 완료건 재사용).

import Link from "next/link";
import { ChevronRight, CalendarDays, Gift } from "lucide-react";
import { getMyGrade, getMyAttendance } from "@/app/(rider)/_lib/grade";
import { seasonOf } from "@/lib/grade";
import { weeklyPromo, PROMO_WEEKLY_THRESHOLD, PROMO_UNIT_KRW } from "@/lib/promo";
import { ATTENDANCE_DAILY_TARGET, ATTENDANCE_DAYS_REQUIRED, ATTENDANCE_REWARD } from "@/lib/attendance";
import { TierBadge } from "@/components/ui/tier-badge";

export const dynamic = "force-dynamic";

function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}
function md(s: string | null): string {
  if (!s) return "";
  return `${Number(s.slice(5, 7))}월 ${Number(s.slice(8, 10))}일`;
}
function krw(n: number): string {
  return n.toLocaleString("ko-KR");
}

export default async function PromoPage() {
  const [grade, attendance] = await Promise.all([getMyGrade(), getMyAttendance()]);
  const season = seasonOf(kstToday());
  const seasonOpen = season.number != null;
  const promo = weeklyPromo(grade.completed);

  // 진행 중(쌓이고 있는) 금액 — 등급·출석은 시즌(8/12) 시작 후부터 집계
  const gradeReward = seasonOpen ? grade.reward : 0;
  const attReward = seasonOpen && attendance.reached ? ATTENDANCE_REWARD : 0;
  const total = gradeReward + attReward + promo.bonusKrw;

  const weekLabel = attendance.weekStart ? `${md(attendance.weekStart)} ~ ${md(attendance.weekEnd)}` : "이번 주";

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">프로모션</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">이번 주 진행 중인 자사 프로모션 적립을 한눈에</p>

      {/* 총 적립 히어로 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#4F6AF5,#5d77ff)] px-[18px] py-[17px] text-white shadow-[0_8px_16px_-4px_rgba(79,106,245,0.28)]">
        <div className="text-[11.5px] font-semibold opacity-90">이번 주 쌓이고 있는 적립</div>
        <div className="tnum mt-0.5 text-[30px] font-black leading-none tracking-[-0.02em]">
          {krw(total)}
          <span className="ml-1 text-[16px] font-bold opacity-90">원</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] font-semibold opacity-90">
          <span className="tnum">완료 {krw(grade.completed)}건</span>
          <span className="tnum">{weekLabel}</span>
        </div>
      </div>

      <div className="mb-2 mt-4 text-[13px] font-black text-jb-ink">진행 중인 프로모션</div>
      <div className="space-y-2">
        {/* 1) 라이더 등급 보상 */}
        <Link
          href="/grade"
          className="flex items-center gap-3 rounded-[14px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
        >
          <TierBadge tier={grade.tier} size={38} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-black text-jb-ink">라이더 등급 보상</div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-jb-ink-mute">
              현재 <span style={{ color: grade.tier.color }}>{grade.tier.name}</span>
              {grade.nextTier ? ` · ${grade.nextTier.name}까지 ${krw(grade.toNext)}건` : " · 최고 등급"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {seasonOpen ? (
              <>
                <div className="tnum text-[15px] font-black text-jb-green">{krw(gradeReward)}원</div>
                <div className="text-[10.5px] font-bold text-jb-ink-mute">쌓이는 중</div>
              </>
            ) : (
              <div className="text-[11px] font-bold text-jb-ink-mute">시즌 미오픈</div>
            )}
          </div>
          <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
        </Link>

        {/* 2) 출석체크 */}
        <Link
          href="/attendance"
          className="flex items-center gap-3 rounded-[14px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
        >
          <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-jb-teal-tint text-jb-teal">
            <CalendarDays size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-black text-jb-ink">출석체크</div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-jb-ink-mute">
              하루 {ATTENDANCE_DAILY_TARGET}건 · 달성 <span className="text-jb-ink">{attendance.achievedDays}</span>/
              {ATTENDANCE_DAYS_REQUIRED}일
            </div>
          </div>
          <div className="shrink-0 text-right">
            {!seasonOpen ? (
              <>
                <div className="tnum text-[15px] font-black text-jb-ink">{krw(ATTENDANCE_REWARD)}원</div>
                <div className="text-[10.5px] font-bold text-jb-ink-mute">시작 전</div>
              </>
            ) : attendance.reached ? (
              <>
                <div className="tnum text-[15px] font-black text-jb-green">{krw(ATTENDANCE_REWARD)}원</div>
                <div className="text-[10.5px] font-bold text-jb-green">달성</div>
              </>
            ) : attendance.failed ? (
              <>
                <div className="tnum text-[15px] font-black text-jb-ink-mute">{krw(ATTENDANCE_REWARD)}원</div>
                <div className="text-[10.5px] font-bold text-jb-red">미달성</div>
              </>
            ) : (
              <>
                <div className="tnum text-[15px] font-black text-jb-ink">{krw(ATTENDANCE_REWARD)}원</div>
                <div className="text-[10.5px] font-bold text-jb-ink-mute">{attendance.remainingDays}일 더</div>
              </>
            )}
          </div>
          <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
        </Link>

        {/* 3) 자사 주간 보너스 */}
        <div className="flex items-center gap-3 rounded-[14px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <span className="grid size-[38px] shrink-0 place-items-center rounded-full bg-jb-orange-tint text-jb-orange">
            <Gift size={19} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-black text-jb-ink">주간 보너스</div>
            <div className="mt-0.5 text-[11.5px] font-semibold text-jb-ink-mute">
              {PROMO_WEEKLY_THRESHOLD}건 초과분 건당 +{krw(PROMO_UNIT_KRW)}원 ·{" "}
              <span className="tnum text-jb-ink">{krw(promo.completed)}</span>/{PROMO_WEEKLY_THRESHOLD}건
            </div>
          </div>
          <div className="shrink-0 text-right">
            {promo.earning ? (
              <>
                <div className="tnum text-[15px] font-black text-jb-green">{krw(promo.bonusKrw)}원</div>
                <div className="text-[10.5px] font-bold text-jb-ink-mute">초과 {promo.bonusCount}건</div>
              </>
            ) : (
              <>
                <div className="tnum text-[15px] font-black text-jb-ink">0원</div>
                <div className="text-[10.5px] font-bold text-jb-ink-mute">{krw(promo.remaining)}건 남음</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[12px] bg-jb-surface px-4 py-3 text-[11.5px] leading-relaxed text-jb-ink-soft">
        모든 자사 프로모션은 주간(수요일~화요일) 기준으로 집계되며 매주 초기화됩니다. 금액은 완료 건수에 따라 실시간으로
        반영돼요.
      </div>
    </div>
  );
}
