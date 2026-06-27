"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SLA_PERIODS } from "@/app/(rider)/_lib/queries";
import { PERIOD_LABEL } from "@/app/(rider)/_lib/metrics";
import type { SlaPeriod } from "@/types/database";

// 03 §B. 기간 탭 — sticky, URL(period)이 SSOT. 인디케이터는 즉시(optimistic) 이동.
export function PeriodTabs({ active }: { active: SlaPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // 서버 라운드트립 전에 탭 인디케이터를 즉시 옮기기 위한 낙관적 상태.
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
    <div className="sticky top-0 z-[100] -mx-4 bg-bg/90 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
      <SegmentedTabs<SlaPeriod>
        options={options}
        value={optimistic}
        onChange={change}
        ariaLabel="기간 선택"
      />
    </div>
  );
}
