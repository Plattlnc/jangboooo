import { cn } from "@/lib/cn";

// 06 §E. 통계 3카드: 완료(블루)/거절(레드)/취소(블루). 라벨 + "N건". 표시 전용.
// 카피 SSOT: dashboard.md §4. 취소 = 배차취소 + 배달취소 합산(backend 확인 §9-6).

interface StatItem {
  label: string;
  /** 미수집이면 null (→ "—"). 0 은 유효값. */
  value: number | null;
  valueClass: string;
}

interface StatCardsProps {
  completed: number | null;
  rejected: number | null;
  canceled: number | null;
}

export function StatCards({ completed, rejected, canceled }: StatCardsProps) {
  const items: StatItem[] = [
    { label: "완료", value: completed, valueClass: "text-primary-strong" },
    { label: "거절", value: rejected, valueClass: "text-danger-strong" },
    { label: "취소", value: canceled, valueClass: "text-primary-strong" },
  ];

  return (
    <section aria-label="배달 통계" className="grid grid-cols-3 gap-3 sm:gap-[25px]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-card25 border border-surface-card-border bg-surface-card p-2 text-center"
        >
          <span className="text-sm font-bold text-text-secondary">{item.label}</span>
          <span className={cn("text-[20px] font-bold tabular-nums", item.valueClass)}>
            {item.value == null ? "—" : `${item.value.toLocaleString("ko-KR")}건`}
          </span>
        </div>
      ))}
    </section>
  );
}
