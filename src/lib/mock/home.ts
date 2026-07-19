// 홈(SLA 대시보드) 표시용 뷰모델 타입.
// 실데이터는 서버에서 getDashboardData → toHomeMetrics(@/components/screens/home-view)로 매핑.
// 색은 시안 원색 유지. 파생값(완료율·막대 너비·피크 강조)은 화면에서 계산.
// (env 미설정 시 폴백 목 데이터의 출처는 src/app/(rider)/_lib/queries 의 MOCK_SUMMARY.)

export interface StatusDatum {
  label: string;
  /** 일반 배달(B마트 제외) 건수. bmart 미보유 데이터면 전체 합계. */
  value: number;
  /** B마트 건수 — 값이 있으면 타일에 "B마트 n" 서브라인 표시. */
  bmart?: number;
  color: string;
}
export interface CatDatum {
  label: string;
  value: number;
  color: string;
}
export interface PeakDatum {
  label: string;
  value: number;
}
export type GoalIcon = "dawn" | "noon" | "evening" | "night";
export interface GoalDatum {
  /** 가점 배지(+N점) — 실데이터 소스 없음. 있을 때만 표시. */
  badge?: string;
  label: string;
  actual: number;
  target: number;
  /** 달성률(%). 미수집이면 null → '—' 표시. */
  pct: number | null;
  icon: GoalIcon;
}

export interface HomeMetrics {
  period: string;
  count: number;
  revenue: number;
  accept: number;
  status: StatusDatum[];
  cats: CatDatum[];
  peaks: PeakDatum[];
  goals: GoalDatum[];
}

