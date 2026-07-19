import Link from "next/link";
import type { SlaPeriod } from "@/types/database";

// 기간 전환 탭(서버 렌더 링크형) — 목록/지표 페이지 공용. q 등 부가 쿼리는 보존.
// 'custom' = 날짜 직접 선택 상태(from/to 쿼리) — 활성 표시 전용 탭이 추가로 렌더된다.
// 일간/주간/월간 링크는 from/to 를 실지 않아 클릭 시 커스텀이 자연 해제된다.
const PERIODS: { key: SlaPeriod; label: string }[] = [
  { key: "today", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

export type PeriodTabKey = SlaPeriod | "custom";

export function PeriodTabs({
  period,
  basePath,
  extraQuery = {},
}: {
  period: PeriodTabKey;
  basePath: string;
  extraQuery?: Record<string, string>;
}) {
  return (
    <div className="flex gap-1 bg-jb-tab-bg p-1">
      {PERIODS.map((p) => {
        const params = new URLSearchParams({ ...extraQuery, period: p.key });
        const active = period === p.key;
        return (
          <Link
            key={p.key}
            href={`${basePath}?${params.toString()}`}
            className={
              "flex-1 py-[9px] text-center text-[13.5px] transition-all " +
              (active
                ? "bg-white font-black text-jb-ink shadow-[0_1px_3px_rgba(20,23,46,0.1)]"
                : "bg-transparent font-bold text-jb-ink-mute")
            }
          >
            {p.label}
          </Link>
        );
      })}
      {period === "custom" ? (
        <span className="flex-1 bg-white py-[9px] text-center text-[13.5px] font-black text-jb-indigo shadow-[0_1px_3px_rgba(20,23,46,0.1)]">
          기간
        </span>
      ) : null}
    </div>
  );
}
