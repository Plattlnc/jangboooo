/**
 * 배민커넥트비즈 "달성현황(beta)" = 구글 Looker Studio 임베드 리포트.
 * 데이터는 datastudio/lookerstudio `batchedDataV2`(POST) 응답으로 들어온다.
 * 출처/매핑 근거: docs/api/center-goals.md (HAR 직접 분석, 2026-06-28).
 *
 * 응답 골격(필요한 부분만):
 *   { dataResponse: [ { dataSubset: [ { dataset: { tableDataset: {
 *       column: [ { stringColumn: { values: string[] }, nullIndex?: ... }, ... ]
 *   } } } ] } ] }
 * 5컬럼 행 = [센터라벨, 피크1, 피크2, 피크3, 피크4].
 *   센터라벨 예: "표준인천서B - DP2504250236"
 *   피크값 예  : "810/528 (100%)"  (= 현재/목표 (퍼센트), 퍼센트는 소스에서 100 상한 적용)
 * 컬럼 순서(요청 queryFields 순서, getSchema displayName 으로 확정):
 *   _value_ml_(아침점심) → _value_pl_(오후논피크) → _value_d_(저녁피크) → _value_pd_(심야논피크)
 */

/** 피크 키(소스 필드 _value_<key>_ 와 1:1). 표시순서 ml→pl→d→pd. */
export const PEAK_KEYS = ['ml', 'pl', 'd', 'pd'] as const
export type PeakKey = (typeof PEAK_KEYS)[number]

/** 피크 키 → 표시 라벨(디자인 확정값). frontend 가 카피를 덮어쓸 수 있다. */
export const PEAK_LABELS: Record<PeakKey, string> = {
  ml: '아침점심',
  pl: '오후논피크',
  d: '저녁피크',
  pd: '심야논피크',
}

/** 한 피크의 파싱 결과. percent 는 소스 제공값(100 상한 반영). */
export type PeakGoal = {
  peak_key: PeakKey
  current: number
  goal: number
  /** 소스가 표기한 퍼센트(예: 810/528 → 100). 미상이면 null. */
  pct: number | null
}

/** 한 센터의 4피크 공동목표. */
export type CenterGoals = {
  center_id: string
  center_name: string | null
  peaks: PeakGoal[] // 항상 PEAK_KEYS 순서(ml,pl,d,pd)
}

/** Looker batchedDataV2 응답(최소 형태). 안전 파싱을 위해 모두 optional. */
export type LookerColumn = {
  stringColumn?: { values?: string[] }
}
export type LookerTableDataset = {
  column?: LookerColumn[]
}
