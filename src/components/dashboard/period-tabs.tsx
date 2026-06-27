// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 기간 탭(오늘/주/월) URL 상태 골격 — searchParams 기반.
// 서버 렌더 가능한 프레젠테이션 컴포넌트(훅 미사용). 디자인 토큰 미사용, 중립 클래스만.

import Link from "next/link";
import { PERIOD_LABELS, SLA_PERIODS } from "@/app/(rider)/_lib/queries";
import type { SlaPeriod } from "@/types/database";

interface PeriodTabsProps {
  /** 현재 활성 기간 (서버에서 searchParams 파싱 결과). */
  active: SlaPeriod;
  /** 탭이 가리킬 기준 경로 (기본 /dashboard). */
  basePath?: string;
}

/**
 * 각 탭은 `?period=` 쿼리만 바꾸는 Link.
 * URL 이 단일 진실 소스 — 클라이언트 상태 없음.
 */
export function PeriodTabs({ active, basePath = "/dashboard" }: PeriodTabsProps) {
  return (
    <nav aria-label="기간 선택" className="inline-flex gap-1 rounded-lg border p-1">
      {SLA_PERIODS.map((period: SlaPeriod) => {
        const isActive = period === active;
        return (
          <Link
            key={period}
            href={`${basePath}?period=${period}`}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              isActive ? "bg-black/10 dark:bg-white/15" : "opacity-70"
            }`}
          >
            {PERIOD_LABELS[period]}
          </Link>
        );
      })}
    </nav>
  );
}
