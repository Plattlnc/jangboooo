"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { PERIOD_LABEL, SLA_PERIODS } from "@/app/(rider)/_lib/metrics";
import type { SlaPeriod } from "@/types/database";

// 06 §C. 기간 탭 — pill 세그먼트(primary 트랙·흰 활성). URL(period)이 SSOT.
// 인디케이터는 서버 라운드트립 전에 즉시(optimistic) 이동.
export function PeriodTabs({ active }: { active: SlaPeriod }) {
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
    <div className="sticky top-[50px] z-[100] -mx-[26px] bg-background/90 px-[26px] py-2 backdrop-blur">
      <SegmentedTabs<SlaPeriod>
        options={options}
        value={optimistic}
        onChange={change}
        variant="onPrimary"
        ariaLabel="기간 선택"
      />
    </div>
  );
}
