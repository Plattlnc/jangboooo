// 배달등급 — 주간(수~화) 누적 완료건 기준 7단계 + 구간별 누진(초과분만 새 단가) 프로모션 보상.
// 라이더 키 = admin_rider_id(=배민 User ID). 등급이 올라도 전체 단가가 바뀌지 않고 초과분만 가산.
// 이 파일 = 등급/단가 SSOT. 조건 변경 시 TIERS 만 수정.

export interface Tier {
  key: string;
  name: string;
  /** 하한(포함). */
  min: number;
  /** 상한(포함). 최상위는 Infinity. */
  max: number;
  /** 건당 보상(원). 0 = 보상 없음. */
  rate: number;
  /** 임시 색(사용자가 티어 아이콘 직접 디자인해 교체 예정). */
  color: string;
}

/** 배달등급 제도 시행 시작일(첫 시즌 첫 주의 수요일). 이 날짜 이전 주는 기록에 포함하지 않는다. */
export const GRADE_SEASON_START = "2026-08-12"; // 2026-08-12(수) ~ 첫 시즌

// 낮은 등급 → 높은 등급 순.
export const TIERS: Tier[] = [
  { key: "bronze", name: "브론즈", min: 0, max: 50, rate: 0, color: "#a9754e" },
  { key: "silver", name: "실버", min: 51, max: 100, rate: 0, color: "#98a2ad" },
  { key: "gold", name: "골드", min: 101, max: 150, rate: 100, color: "#d9a520" },
  { key: "platinum", name: "플래티넘", min: 151, max: 200, rate: 400, color: "#3fb7ab" },
  { key: "diamond", name: "다이아", min: 201, max: 250, rate: 600, color: "#45b6e8" },
  { key: "master", name: "마스터", min: 251, max: 400, rate: 800, color: "#7c5cff" },
  { key: "challenger", name: "챌린저", min: 401, max: Infinity, rate: 1000, color: "#e0323c" },
];

export interface GradeBreakdown {
  tier: Tier;
  /** 이 구간에 속한 건수. */
  count: number;
  /** 이 구간 보상액(원) = count × rate. */
  amount: number;
}

export interface GradeResult {
  completed: number;
  /** 현재 등급(완료건이 속한 구간). */
  tier: Tier;
  /** 누진 합산 보상(원). */
  reward: number;
  /** 보상 발생 구간별 내역. */
  breakdown: GradeBreakdown[];
  /** 다음 등급(없으면 최고). */
  nextTier: Tier | null;
  /** 다음 등급까지 남은 건수(0이면 최고 등급). */
  toNext: number;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface Season {
  /** 시즌 번호. null = 아직 미오픈(시즌 시작 전). */
  number: number | null;
  /** 시즌 주 시작(수) YYYY-MM-DD. */
  start: string;
  /** 시즌 주 끝(화) YYYY-MM-DD. */
  end: string;
}

/**
 * 해당 날짜의 시즌 — 수~화 주 단위, GRADE_SEASON_START(수)를 1시즌 첫날로. 매주 수요일에 시즌이 갱신.
 * 시작 전이면 number=null(미오픈).
 */
export function seasonOf(dateStr: string): Season {
  const start = new Date(`${GRADE_SEASON_START}T00:00:00Z`);
  const d = new Date(`${dateStr}T00:00:00Z`);
  const week = 7 * 86_400_000;
  if (d.getTime() < start.getTime()) {
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { number: null, start: GRADE_SEASON_START, end: ymd(end) };
  }
  const n = Math.floor((d.getTime() - start.getTime()) / week) + 1;
  const ws = new Date(start);
  ws.setUTCDate(ws.getUTCDate() + (n - 1) * 7);
  const we = new Date(ws);
  we.setUTCDate(we.getUTCDate() + 6);
  return { number: n, start: ymd(ws), end: ymd(we) };
}

/** 주간 누적 완료건 → 현재 등급 + 구간별 누진 보상. */
export function computeGrade(completed: number): GradeResult {
  const c = Math.max(0, Math.floor(completed || 0));
  const breakdown: GradeBreakdown[] = [];
  let reward = 0;
  for (const t of TIERS) {
    if (t.rate <= 0 || c < t.min) continue;
    const count = Math.min(c, t.max) - t.min + 1; // 구간 내 건수(초과분만)
    if (count <= 0) continue;
    const amount = count * t.rate;
    reward += amount;
    breakdown.push({ tier: t, count, amount });
  }
  const tier = TIERS.find((t) => c >= t.min && c <= t.max) ?? TIERS[0]!;
  const idx = TIERS.indexOf(tier);
  const nextTier = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1]! : null;
  const toNext = nextTier ? Math.max(0, nextTier.min - c) : 0;
  return { completed: c, tier, reward, breakdown, nextTier, toNext };
}
