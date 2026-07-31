// 배달 랭킹 데이터 접근 — 서버 전용. RPC get_rider_ranking(0016) 호출.
// 집계는 DB 측(기간 완료건 합, 활동자만) — PostgREST 1000행 제한 무관.
// 폴백: DEMO_MODE 또는 Supabase env 미설정 시 결정적 목 데이터.

import type { SlaPeriod } from "@/types/database";
import { DEMO_MODE } from "@/lib/demo";

export interface RankingEntry {
  rank: number;
  uid: string;
  name: string;
  /** 프로필 사진 공개 URL — 없으면 이니셜 표시. */
  avatarUrl: string | null;
  completed: number;
}

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// 데모용 결정적 목 랭킹 — 기간별 배수만 달리해 탭 전환이 보이게.
const DEMO_NAMES = [
  "김민준", "이서연", "박도윤", "최지우", "정하준", "강서준", "조은우",
  "윤시우", "장하은", "임지호", "한유나", "오건우", "서지안", "신라온",
];
const DEMO_MULTIPLIER: Record<SlaPeriod, number> = { today: 1, week: 6, month: 24 };

function demoRanking(period: SlaPeriod): RankingEntry[] {
  const m = DEMO_MULTIPLIER[period];
  const rows = DEMO_NAMES.map((name, i) => ({
    uid: `MOCK-${String(i + 1).padStart(3, "0")}`,
    name,
    avatarUrl: null,
    completed: (52 - i * 3 - (i % 3)) * m,
  })).sort((a, b) => b.completed - a.completed);
  // 동률 공동 순위(rank) — RPC 와 동일 규칙.
  return rows.map((r, i) => ({
    ...r,
    rank: i > 0 && rows[i - 1].completed === r.completed ? 0 : i + 1,
  })).map((r, i, arr) => (r.rank === 0 ? { ...r, rank: arr[i - 1].rank } : r));
}

export async function getRiderRanking(period: SlaPeriod): Promise<RankingEntry[]> {
  if (DEMO_MODE || !hasSupabaseEnv()) return demoRanking(period);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_rider_ranking", { p_period: period });
  if (error || !data) return [];

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return data.map((r) => ({
    rank: r.rnk,
    uid: r.admin_rider_id,
    name: r.rider_name,
    avatarUrl: r.avatar_path ? `${base}/storage/v1/object/public/avatars/${r.avatar_path}` : null,
    completed: r.completed,
  }));
}
