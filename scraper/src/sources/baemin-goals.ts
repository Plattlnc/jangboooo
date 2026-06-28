/**
 * 달성현황(beta) Looker batchedDataV2 응답 → 센터별 4피크 공동목표 파서(순수 함수).
 * Playwright 런타임 의존 없음(오프라인 단위테스트 가능). 브라우저 수집은 baemin-goals-session.ts.
 *
 * 근거/매핑: docs/api/center-goals.md (HAR 분석). 컬럼 순서 ml→pl→d→pd.
 */
import {
  PEAK_KEYS,
  type CenterGoals,
  type LookerColumn,
  type LookerTableDataset,
  type PeakGoal,
} from './baemin-goals-types'

/** 피크 셀: "현재/목표 (퍼센트%)" 예 "810/528 (100%)". 퍼센트는 소스값(100 상한 반영). */
const PEAK_CELL_RE = /^(\d+)\s*\/\s*(\d+)\s*\((\d+)%\)$/
/** 센터 라벨에서 협력사 ID(DP…) 추출. 예 "표준인천서B - DP2504250236". */
const CENTER_ID_RE = /(DP\w+)/

/** Google JSON XSSI 프리픽스 `)]}'` 제거 후 JSON.parse. 이미 객체면 그대로. */
export function parseBatchedBody(raw: string | unknown): unknown {
  if (typeof raw !== 'string') return raw
  const stripped = raw.replace(/^\)\]\}'?\s*/, '')
  return JSON.parse(stripped)
}

/** 응답 트리에서 모든 tableDataset 을 수집. */
function collectTableDatasets(node: unknown, out: LookerTableDataset[]): void {
  if (!node || typeof node !== 'object') return
  const rec = node as Record<string, unknown>
  if (rec.tableDataset && typeof rec.tableDataset === 'object') {
    out.push(rec.tableDataset as LookerTableDataset)
  }
  for (const k of Object.keys(rec)) collectTableDatasets(rec[k], out)
}

function columnValues(col: LookerColumn): string[] {
  return col.stringColumn?.values ?? []
}

/** 한 셀 파싱. 형식 불일치/빈 값이면 null. */
function parsePeakCell(cell: string | undefined): { current: number; goal: number; pct: number } | null {
  if (!cell) return null
  const m = PEAK_CELL_RE.exec(cell.trim())
  if (!m) return null
  return { current: Number(m[1]), goal: Number(m[2]), pct: Number(m[3]) }
}

/** 모든 값이 피크 셀 형식인 컬럼인가(빈 컬럼 제외). */
function isPeakColumn(col: LookerColumn): boolean {
  const vals = columnValues(col).filter((v) => v != null && v !== '')
  return vals.length > 0 && vals.every((v) => PEAK_CELL_RE.test(v.trim()))
}

/** 값 중 하나라도 협력사 ID(DP…)를 포함하는 컬럼인가. */
function isCenterColumn(col: LookerColumn): boolean {
  return columnValues(col).some((v) => typeof v === 'string' && CENTER_ID_RE.test(v))
}

/**
 * 센터 공동목표가 "유효"한가 = 피크 중 하나라도 goal>0.
 * 로딩/플레이스홀더 응답은 셀이 "0/0 (0%)" 라 패턴은 통과하지만 goal 이 전부 0 → 무효.
 * (current=0 자체는 영업일 초 정상값이므로 무효 판정 기준은 goal 이다.)
 */
export function isValidCenterGoals(c: CenterGoals): boolean {
  return c.peaks.some((p) => p.goal != null && p.goal > 0)
}

/**
 * batchedDataV2 응답들(원문 문자열 또는 파싱된 객체)에서 센터별 4피크 공동목표를 추출.
 * 5컬럼 [센터, ml, pl, d, pd] 형태의 tableDataset 을 찾아 행 단위로 매핑.
 * 같은 센터가 여러 응답/행에 나오면 **유효(goal>0) 값을 우선**하고, 유효끼리는 마지막이 우선.
 * (로딩/플레이스홀더 "0/0 (0%)" 응답이 좋은 값을 0 으로 덮어쓰는 회귀 방지.)
 */
export function parseLookerGoals(bodies: Array<string | unknown>): CenterGoals[] {
  const byCenter = new Map<string, CenterGoals>()
  const setBest = (cand: CenterGoals): void => {
    const prev = byCenter.get(cand.center_id)
    if (!prev) {
      byCenter.set(cand.center_id, cand)
      return
    }
    // 유효 후보가 무효 기존을 덮을 수 있고, 무효 후보는 유효 기존을 못 덮는다.
    if (isValidCenterGoals(cand) || !isValidCenterGoals(prev)) {
      byCenter.set(cand.center_id, cand)
    }
  }

  for (const body of bodies) {
    let parsed: unknown
    try {
      parsed = parseBatchedBody(body)
    } catch {
      continue // 비 JSON/깨진 응답은 스킵
    }
    const tables: LookerTableDataset[] = []
    collectTableDatasets(parsed, tables)

    for (const t of tables) {
      const cols = t.column ?? []
      const peakCols = cols.filter(isPeakColumn)
      const centerCol = cols.find(isCenterColumn)
      // 공동목표 테이블 = 피크 컬럼 정확히 4개 + 센터 컬럼 존재.
      if (peakCols.length !== 4 || !centerCol) continue

      const centerVals = columnValues(centerCol)
      const rowCount = Math.max(...peakCols.map((c) => columnValues(c).length), centerVals.length)
      for (let r = 0; r < rowCount; r++) {
        const label = centerVals[r]
        if (!label) continue
        const idMatch = CENTER_ID_RE.exec(label)
        const centerId = idMatch?.[1]
        if (!centerId) continue
        const peaks: PeakGoal[] = PEAK_KEYS.map((key, i) => {
          const col = peakCols[i]
          const cell = col ? parsePeakCell(columnValues(col)[r]) : null
          return {
            peak_key: key,
            current: cell?.current ?? 0,
            goal: cell?.goal ?? 0,
            pct: cell?.pct ?? null,
          }
        })
        setBest({ center_id: centerId, center_name: label.trim(), peaks })
      }
    }
  }

  return [...byCenter.values()]
}
