"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { PERIOD_LABEL, SLA_PERIODS } from "@/app/(rider)/_lib/metrics";
import type { SlaPeriod } from "@/types/database";

// 랭킹 기간 탭 — URL(period)이 SSOT. PeriodTabs(대시보드, sticky·onPrimary)와 동일
// optimistic 패턴이되 일반 배치·default 변형(흰 카드 위)이라 별도 래퍼.
export function RankingTabs({ active }: { active: SlaPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // active(URL) 가 따라잡으면 render-phase 로 동기화 (effect setState 회피, React 19).
  const [optimistic, setOptimistic] = useState<SlaPeriod>(active);
  const [prevActive, setPrevActive] = useState<SlaPeriod>(active);
  if (active !== prevActive) {
    setPrevActive(active);
    setOptimistic(active);
  }

  function change(next: SlaPeriod) {
    if (next === optimistic) return;
    setOptimistic(next);
    const sp = new URLSearchParams(params.toString());
    sp.set("period", next);
    router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
  }

  const options = SLA_PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }));

  return (
    <SegmentedTabs<SlaPeriod>
      options={options}
      value={optimistic}
      onChange={change}
      ariaLabel="랭킹 기간 선택"
    />
  );
}
