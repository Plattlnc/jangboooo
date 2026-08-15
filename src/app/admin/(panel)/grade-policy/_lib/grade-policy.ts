import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 신규 등급제 현황 — 이번 주 공동목표(슬롯) 달성/미달성 실시간 집계 + 최근 주차 실적.
// 정책은 정적(뷰), 우리 실적만 라이브. 주 슬롯 = 4피크 × 7일 = 28.

const PEAKS = [
  { key: "ml", label: "아침점심" },
  { key: "pl", label: "오후논피" },
  { key: "d", label: "저녁피크" },
  { key: "pd", label: "심야논피" },
] as const;
const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export interface PeakCell {
  key: string;
  label: string;
  goal: number | null;
  current: number | null;
  pct: number | null;
  status: "hit" | "miss" | "none";
}
export interface DayRow {
  date: string;
  dow: string;
  cells: PeakCell[];
  missed: number;
  done: boolean;
}
export interface HistoryRow {
  weekStart: string;
  weekEnd: string;
  setCount: number | null;
  achieved: number | null;
  total: number | null;
  missed: number | null;
  acceptance: number | null;
}
export interface GradeStatus {
  weekStart: string;
  weekEnd: string;
  days: DayRow[];
  missedThisWeek: number;
  evaluatedSlots: number;
  adaptationGrade: string; // 이번주 적응기준
  recent4Missed: number | null;
  officialGrade: string; // 정식(4주 합산)
  setCount: number | null;
  acceptance: number | null;
  history: HistoryRow[];
}

function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** 그 날짜가 속한 정산 주(수~화)의 시작(수요일). */
function weekWed(ymd: string): string {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay(); // 0일..3수
  return addDays(ymd, -((dow - 3 + 7) % 7));
}
function dowOf(ymd: string): string {
  return DOW[new Date(`${ymd}T00:00:00Z`).getUTCDay()];
}

/** 세트수는 항상 8+ 가정(우리 실적). 미달성 슬롯으로 등급 판정. */
function adaptationGrade(missed: number): string {
  if (missed <= 0) return "마스터";
  if (missed <= 1) return "다이아";
  if (missed <= 2) return "골드";
  if (missed <= 3) return "실버";
  return "브론즈";
}
function officialGrade(missed4w: number): string {
  if (missed4w <= 2) return "마스터";
  if (missed4w <= 3) return "다이아";
  if (missed4w <= 6) return "골드";
  if (missed4w <= 12) return "실버";
  return "브론즈";
}

export async function fetchGradeStatus(): Promise<GradeStatus> {
  const supabase = createAdminClient();
  const today = kstToday();
  const weekStart = weekWed(today);
  const weekEnd = addDays(weekStart, 6);

  // 이번 주 공동목표(슬롯)
  const { data: goals } = await supabase
    .from("center_peak_goals")
    .select("snapshot_date, peak_key, goal, current, pct")
    .gte("snapshot_date", weekStart)
    .lte("snapshot_date", weekEnd);

  const byDate = new Map<string, Map<string, { goal: number | null; current: number | null; pct: number | null }>>();
  for (const g of goals ?? []) {
    if (!byDate.has(g.snapshot_date)) byDate.set(g.snapshot_date, new Map());
    byDate.get(g.snapshot_date)!.set(g.peak_key, { goal: g.goal, current: g.current, pct: g.pct });
  }

  const days: DayRow[] = [];
  let missedThisWeek = 0;
  let evaluatedSlots = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const m = byDate.get(date);
    const cells: PeakCell[] = PEAKS.map((p) => {
      const v = m?.get(p.key);
      const goal = v?.goal ?? null;
      const current = v?.current ?? null;
      let status: PeakCell["status"] = "none";
      if (goal != null && current != null && goal > 0) status = current >= goal ? "hit" : "miss";
      return { key: p.key, label: p.label, goal, current, pct: v?.pct ?? null, status };
    });
    const dayMissed = cells.filter((c) => c.status === "miss").length;
    const dayEval = cells.filter((c) => c.status !== "none").length;
    // '완결일' = 해당일이 오늘 이전(오늘은 진행중이라 제외). 미달성 판정은 완결일만.
    const done = date < today && dayEval > 0;
    if (done) {
      missedThisWeek += dayMissed;
      evaluatedSlots += dayEval;
    }
    days.push({ date, dow: dowOf(date), cells, missed: dayMissed, done });
  }

  // 최근 완결 주차(정식 4주 합산 + 이력)
  const { data: rev } = await supabase
    .from("weekly_revenue")
    .select("week_start, week_end, set_count, achieved_slots, total_slots, missed_slots, acceptance_rate")
    .order("week_start", { ascending: false })
    .limit(8);
  const history: HistoryRow[] = (rev ?? []).map((r) => ({
    weekStart: r.week_start,
    weekEnd: r.week_end,
    setCount: r.set_count,
    achieved: r.achieved_slots,
    total: r.total_slots,
    missed: r.missed_slots,
    acceptance: r.acceptance_rate,
  }));
  const last4 = history.slice(0, 4);
  const recent4Missed = last4.length ? last4.reduce((s, r) => s + (r.missed ?? 0), 0) : null;

  return {
    weekStart,
    weekEnd,
    days,
    missedThisWeek,
    evaluatedSlots,
    adaptationGrade: adaptationGrade(missedThisWeek),
    recent4Missed,
    officialGrade: recent4Missed == null ? "—" : officialGrade(recent4Missed),
    setCount: history[0]?.setCount ?? null,
    acceptance: history[0]?.acceptance ?? null,
    history,
  };
}
