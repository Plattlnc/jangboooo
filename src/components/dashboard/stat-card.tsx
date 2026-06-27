import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "@/components/ui/icons";
import { InfoTip } from "@/components/ui/info-tip";
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
  /** tossface 액센트(05 §4) — 라벨 좌측 장식. aria-hidden. */
  emoji?: string;
  className?: string;
}

const VALUE_COLOR: Record<StatusColor, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
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
  emoji,
  className,
}: StatCardProps) {
  const missing = value == null;

  return (
    <Card className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-1 text-caption text-muted-foreground">
        {emoji ? <span aria-hidden="true" className="emoji text-sm">{emoji}</span> : null}
        <span>{label}</span>
        {tooltip ? <InfoTip label={`${label} 설명`} text={tooltip} /> : null}
      </div>

      <div className="flex items-baseline gap-1">
        {missing ? (
          <span className="text-h1 tabular-nums text-muted-foreground">—</span>
        ) : (
          <>
            <span
              className={cn(
                "text-h1 tabular-nums",
                valueStatus ? VALUE_COLOR[valueStatus] : "text-foreground",
              )}
            >
              {value.toLocaleString("ko-KR")}
            </span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </>
        )}
      </div>

      {missing ? (
        <span className="text-caption text-muted-foreground">데이터 없음</span>
      ) : note ? (
        <span className="text-caption text-muted-foreground">{note}</span>
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
