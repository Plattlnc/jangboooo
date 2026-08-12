"use client";

import { useRouter } from "next/navigation";

// 관리자 기간 선택 바 — 오늘 / 주(수~화) / 월 드롭다운. 선택 시 basePath?wk=/mo= 로 이동(extraQuery 유지).
export type ActivePeriod = "today" | "week" | "month";
interface Opt {
  value: string;
  label: string;
}

export function PeriodSelector({
  basePath,
  activePeriod,
  weekOptions,
  monthOptions,
  selectedWeek,
  selectedMonth,
  rangeLabel,
  extraQuery = {},
}: {
  basePath: string;
  activePeriod: ActivePeriod;
  weekOptions: Opt[];
  monthOptions: Opt[];
  selectedWeek: string;
  selectedMonth: string;
  rangeLabel?: string;
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const go = (params: Record<string, string>) => {
    const sp = new URLSearchParams({ ...extraQuery, ...params });
    const s = sp.toString();
    router.push(s ? `${basePath}?${s}` : basePath);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-0.5">
      <button
        type="button"
        onClick={() => go({})}
        className={
          "rounded-[12px] border px-3 py-1.5 text-[12.5px] font-bold transition-colors " +
          (activePeriod === "today"
            ? "border-jb-indigo bg-jb-indigo-tint text-jb-indigo"
            : "border-jb-line bg-jb-card text-jb-ink-mute")
        }
      >
        오늘
      </button>
      <Picker label="주" value={selectedWeek} options={weekOptions} active={activePeriod === "week"} onChange={(v) => go({ wk: v })} />
      <Picker label="월" value={selectedMonth} options={monthOptions} active={activePeriod === "month"} onChange={(v) => go({ mo: v })} />
      {rangeLabel ? <span className="ml-auto tnum text-[11px] font-semibold text-jb-ink-mute">{rangeLabel}</span> : null}
    </div>
  );
}

function Picker({
  label,
  value,
  options,
  active,
  onChange,
}: {
  label: string;
  value: string;
  options: Opt[];
  active: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <label
      className={
        "flex items-center gap-1.5 rounded-[12px] border px-2.5 py-1.5 " +
        (active ? "border-jb-indigo bg-jb-indigo-tint" : "border-jb-line bg-jb-card")
      }
    >
      <span className={"text-[11.5px] font-bold " + (active ? "text-jb-indigo" : "text-jb-ink-mute")}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} 기간 선택`}
        className="tnum bg-transparent text-[12.5px] font-bold text-jb-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
