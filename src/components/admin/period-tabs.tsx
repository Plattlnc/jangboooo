import Link from "next/link";
import type { SlaPeriod } from "@/types/database";

// 기간 전환 탭(서버 렌더 링크형) — 목록/지표 페이지 공용. q 등 부가 쿼리는 보존.
const PERIODS: { key: SlaPeriod; label: string }[] = [
  { key: "today", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
];

export function PeriodTabs({
  period,
  basePath,
  extraQuery = {},
}: {
  period: SlaPeriod;
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
    </div>
  );
}
