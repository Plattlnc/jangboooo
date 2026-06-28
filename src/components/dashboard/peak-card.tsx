"use client";

import { useEffect, useState } from "react";
import type { PeakBucket } from "@/app/(rider)/_lib/metrics";

// 06 §F. 피크타임 완료 현황 — 4버킷 막대. 트랙(bar-track) + 진행(primary).
// width% = count / max(버킷) × 100. 카피 SSOT: dashboard.md §5.

export function PeakCard({ buckets }: { buckets: PeakBucket[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0);

  return (
    <section
      aria-label="피크타임 완료 현황"
      className="flex flex-col gap-3 rounded-card25 border border-surface-card-border bg-surface-card p-5"
    >
      <h2 className="text-sm font-bold text-text-secondary">피크타임 완료 현황</h2>
      <ul className="flex flex-col gap-2.5">
        {buckets.map((b, i) => {
          const pct = max === 0 ? 0 : Math.round((b.count / max) * 100);
          return (
            <li key={b.key} className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-xs font-semibold text-text-muted-strong">
                {b.label}
              </span>
              <div
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-bar-track"
                role="img"
                aria-label={`${b.label} ${b.count}건`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-standard)]"
                  style={{ width: mounted ? `${pct}%` : "0%", transitionDelay: `${i * 60}ms` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums text-primary-strong">
                {b.count}건
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
