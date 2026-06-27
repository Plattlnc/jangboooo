"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { RiderHourlyRow } from "@/types/database";
import { peakWindow } from "@/app/(rider)/_lib/metrics";

// 03 §F / 01 §F. 시간대별 막대. 진입 stagger(scaleY) + 피크 강조 + 탭 툴팁.
// 카피 SSOT: docs/copy/dashboard.md §4.

interface PeakHourChartProps {
  data: RiderHourlyRow[];
}

export function PeakHourChart({ data }: PeakHourChartProps) {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  // 진입 stagger: 첫 페인트(scaleY 0) 후 다음 프레임에 펼친다.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const max = data.reduce((m, b) => Math.max(m, b.completed), 0);
  const peak = peakWindow(data);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h3 text-fg">시간대별 실적</h2>
        {peak ? (
          <p className="text-sm text-muted">
            {peak.start}~{peak.end}시에 가장 많이 달렸어요
          </p>
        ) : (
          <p className="text-caption text-muted">내가 가장 많이 달린 시간대예요.</p>
        )}
      </div>

      {max === 0 ? (
        <EmptyState compact title="이 기간 실적이 없어요" />
      ) : (
        <div
          role="img"
          aria-label={
            peak
              ? `시간대별 완료 건수. ${peak.start}시에서 ${peak.end}시 사이가 가장 많아요.`
              : "시간대별 완료 건수"
          }
          className="flex h-36 items-end gap-px"
        >
          {data.map((bucket) => {
            const pct = max === 0 ? 0 : Math.round((bucket.completed / max) * 100);
            const isPeak = peak != null && bucket.hour === peak.start;
            const isActive = active === bucket.hour;
            return (
              <div key={bucket.hour} className="flex flex-1 flex-col items-center justify-end gap-1">
                {isActive ? (
                  <span className="text-caption tabular-nums text-fg">{bucket.completed}</span>
                ) : null}
                <button
                  type="button"
                  aria-label={`${bucket.hour}시 ${bucket.completed}건`}
                  onClick={() => setActive(isActive ? null : bucket.hour)}
                  onMouseEnter={() => setActive(bucket.hour)}
                  onMouseLeave={() => setActive(null)}
                  className={cn(
                    "w-full origin-bottom rounded-sm transition-transform duration-300 ease-[var(--ease-out)]",
                    isPeak ? "bg-primary" : "bg-primary/70",
                    active != null && !isActive && "opacity-60",
                  )}
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                    transitionDelay: `${bucket.hour * 25}ms`,
                  }}
                />
                {bucket.hour % 3 === 0 ? (
                  <span className="text-[10px] leading-none text-subtle">{bucket.hour}</span>
                ) : (
                  <span className="text-[10px] leading-none text-transparent">.</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
