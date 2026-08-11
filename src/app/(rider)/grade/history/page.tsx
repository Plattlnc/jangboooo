// 내 등급 기록 — 시즌 시작(8/12 수) 이후 완료된 주(수~화)별 등급·보상.
// 진행 중인 이번 주는 제외. 아직 완료 시즌이 없으면 빈 상태.

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getMyGradeHistory } from "@/app/(rider)/_lib/grade";
import { GRADE_SEASON_START, type Tier } from "@/lib/grade";

export const dynamic = "force-dynamic";

/** 임시 티어 아이콘 — 색상 타일 + 이니셜(사용자 디자인 교체 예정). */
function TierBadge({ tier, size = 40 }: { tier: Tier; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-[12px] font-black text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
      style={{ width: size, height: size, background: tier.color, fontSize: Math.round(size * 0.4) }}
    >
      {tier.name.slice(0, 1)}
    </span>
  );
}

/** 'YYYY-MM-DD' → 'M월 D일'. */
function md(s: string): string {
  return `${Number(s.slice(5, 7))}월 ${Number(s.slice(8, 10))}일`;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;
function seasonStartLabel(): string {
  const d = new Date(`${GRADE_SEASON_START}T12:00:00Z`);
  return `${md(GRADE_SEASON_START)}(${WEEKDAY[d.getUTCDay()]})`;
}

export default async function GradeHistoryPage() {
  const weeks = await getMyGradeHistory();

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
        <h1 className="text-xl font-black tracking-[-0.03em]">내 등급 기록</h1>
      </div>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">주차별(수~화) 등급과 보상</p>

      {weeks.length === 0 ? (
        <div className="mt-2 rounded-[12px] border border-jb-line bg-white px-4 py-12 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13.5px] font-bold text-jb-ink">아직 등급 기록이 없어요</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-jb-ink-mute">
            첫 시즌은 <b className="text-jb-ink">{seasonStartLabel()}부터</b> 시작됩니다.
            <br />한 주(수~화)가 끝나면 그 주의 등급과 보상이 여기에 쌓입니다.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {weeks.map((w) => (
            <div
              key={w.weekStart}
              className="flex items-center gap-3 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
            >
              <TierBadge tier={w.tier} size={40} />
              <div className="min-w-0 flex-1">
                <div className="tnum text-[13px] font-black text-jb-ink">
                  {md(w.weekStart)} ~ {md(w.weekEnd)}
                </div>
                <div className="mt-0.5 text-[11.5px] font-semibold text-jb-ink-mute">
                  {w.tier.name} · <span className="tnum">완료 {w.completed.toLocaleString("ko-KR")}건</span>
                </div>
              </div>
              <span className="tnum shrink-0 text-[15px] font-black text-jb-green">
                {w.reward.toLocaleString("ko-KR")}
                <span className="ml-0.5 text-[11px] font-bold text-jb-ink-mute">원</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
