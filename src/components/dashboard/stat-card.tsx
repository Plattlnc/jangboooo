import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Info } from "@/components/ui/icons";
import {
  deltaTone,
  type GoodDirection,
  type StatusColor,
} from "@/app/(rider)/_lib/metrics";

// 03 §E / 01 §C(StatCard). 값이 주인공, 색은 점적. 0(유효) vs —(미수집) 구분.

interface StatCardProps {
  label: string;
  tooltip?: string;
  /** 미수집이면 null (→ "—"), 0 은 유효값 */
  value: number | null;
  unit: string;
  /** 직전 기간 대비 증감(같은 단위). null 이면 델타 미표시 */
  delta?: number | null;
  good?: GoodDirection;
  /** 값 자체에 상태색을 줄 때(수락률 등) */
  valueStatus?: StatusColor;
  note?: string;
  className?: string;
}

const VALUE_COLOR: Record<StatusColor, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function StatCard({
  label,
  tooltip,
  value,
  unit,
  delta = null,
  good = "up",
  valueStatus,
  note,
  className,
}: StatCardProps) {
  const missing = value == null;

  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1 text-caption text-muted">
        <span>{label}</span>
        {tooltip ? (
          <button
            type="button"
            className="touch-target -m-2 grid place-items-center text-subtle"
            aria-label={`${label} 설명`}
            title={tooltip}
          >
            <Info size={14} />
          </button>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1">
        {missing ? (
          <span className="text-h1 tabular-nums text-subtle">—</span>
        ) : (
          <>
            <span
              className={cn(
                "text-h1 tabular-nums",
                valueStatus ? VALUE_COLOR[valueStatus] : "text-fg",
              )}
            >
              {value.toLocaleString("ko-KR")}
            </span>
            <span className="text-sm text-muted">{unit}</span>
          </>
        )}
      </div>

      {missing ? (
        <span className="text-caption text-subtle">데이터 없음</span>
      ) : note ? (
        <span className="text-caption text-muted">{note}</span>
      ) : delta != null ? (
        <DeltaBadge delta={delta} good={good} unit={unit} />
      ) : null}
    </Card>
  );
}

function DeltaBadge({
  delta,
  good,
  unit,
}: {
  delta: number;
  good: GoodDirection;
  unit: string;
}) {
  const tone = deltaTone(delta, good);
  if (tone === "neutral") {
    return <Badge variant="neutral">비슷해요</Badge>;
  }
  const up = delta > 0;
  return (
    <Badge
      variant={tone}
      icon={up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
    >
      {Math.abs(delta).toLocaleString("ko-KR")}
      {unit}
    </Badge>
  );
}
