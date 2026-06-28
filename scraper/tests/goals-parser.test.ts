/**
 * 달성현황(beta) Looker 파서 오프라인 단위테스트.
 * 픽스처 = 실제 HAR 의 batchedDataV2 응답 원문(XSSI 프리픽스 포함, 단일 센터 5컬럼 행).
 * 구글 로그인 없이 파싱 계약을 검증한다.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parseLookerGoals, parseBatchedBody, isValidCenterGoals } from '../src/sources/baemin-goals'
import { PEAK_KEYS, PEAK_LABELS } from '../src/sources/baemin-goals-types'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(join(here, 'fixtures', 'looker-batched-single-center.txt'), 'utf8')

/** 테스트용 단일센터 5컬럼 응답 빌더(피크 셀 문자열 4개). */
function makeBody(centerLabel: string, cells: [string, string, string, string]): unknown {
  return {
    dataResponse: [
      {
        dataSubset: [
          {
            dataset: {
              tableDataset: {
                column: [
                  { stringColumn: { values: [centerLabel] } },
                  { stringColumn: { values: [cells[0]] } },
                  { stringColumn: { values: [cells[1]] } },
                  { stringColumn: { values: [cells[2]] } },
                  { stringColumn: { values: [cells[3]] } },
                ],
              },
            },
          },
        ],
      },
    ],
  }
}

test('XSSI 프리픽스 제거 후 JSON 파싱', () => {
  const obj = parseBatchedBody(fixture) as { dataResponse: unknown[] }
  assert.ok(Array.isArray(obj.dataResponse))
})

test('실 HAR 픽스처 → 센터 1곳, 4피크 매핑(ml/pl/d/pd, 순서 확정)', () => {
  const centers = parseLookerGoals([fixture])
  assert.equal(centers.length, 1)
  const c = centers[0]
  assert.equal(c.center_id, 'DP2504250236')
  assert.match(c.center_name ?? '', /DP2504250236/)
  assert.deepEqual(c.peaks.map((p) => p.peak_key), [...PEAK_KEYS]) // ml,pl,d,pd

  // HAR 실값: 810/528(100%), 389/352(100%), 0/560(0%), 0/480(0%)
  assert.deepEqual(
    c.peaks.map((p) => [p.peak_key, p.current, p.goal, p.pct]),
    [
      ['ml', 810, 528, 100],
      ['pl', 389, 352, 100],
      ['d', 0, 560, 0],
      ['pd', 0, 480, 0],
    ],
  )
})

test('퍼센트는 소스값(100 상한) — 810/528 은 153% 아니라 100%', () => {
  const c = parseLookerGoals([fixture])[0]
  const ml = c.peaks.find((p) => p.peak_key === 'ml')!
  assert.equal(ml.pct, 100)
  assert.ok(ml.current / ml.goal > 1) // 원시 비율은 100% 초과지만 pct 는 100
})

test('라벨 매핑 상수(디자인 확정값)', () => {
  assert.deepEqual(PEAK_LABELS, { ml: '아침점심', pl: '오후논피크', d: '저녁피크', pd: '심야논피크' })
})

test('합성 멀티센터 + XSSI: 두 센터, 마지막 값 우선', () => {
  const body = ")]}'\n\n" + JSON.stringify({
    dataResponse: [
      {
        dataSubset: [
          {
            dataset: {
              tableDataset: {
                column: [
                  { stringColumn: { values: ['A - DP0001', 'B - DP0002'] } },
                  { stringColumn: { values: ['10/20 (50%)', '5/5 (100%)'] } },
                  { stringColumn: { values: ['1/2 (50%)', '0/4 (0%)'] } },
                  { stringColumn: { values: ['3/3 (100%)', '7/7 (100%)'] } },
                  { stringColumn: { values: ['0/8 (0%)', '8/8 (100%)'] } },
                ],
              },
            },
          },
        ],
      },
    ],
  })
  const centers = parseLookerGoals([body])
  assert.equal(centers.length, 2)
  const b = centers.find((c) => c.center_id === 'DP0002')!
  assert.deepEqual(b.peaks.map((p) => [p.current, p.goal, p.pct]), [
    [5, 5, 100],
    [0, 4, 0],
    [7, 7, 100],
    [8, 8, 100],
  ])
})

test('피크 컬럼이 4개 아님/깨진 응답 → 빈 결과(견고)', () => {
  assert.deepEqual(parseLookerGoals(['not json']), [])
  assert.deepEqual(parseLookerGoals([{ dataResponse: [] }]), [])
  // 3 피크 컬럼만 → 공동목표 테이블 아님 → 무시
  const three = { dataResponse: [{ dataSubset: [{ dataset: { tableDataset: { column: [
    { stringColumn: { values: ['X - DP9'] } },
    { stringColumn: { values: ['1/2 (50%)'] } },
    { stringColumn: { values: ['1/2 (50%)'] } },
    { stringColumn: { values: ['1/2 (50%)'] } },
  ] } } }] }] }
  assert.deepEqual(parseLookerGoals([three]), [])
})

// ── 0% 초기화 회귀(P1) ────────────────────────────────────────
test('유효성: 실 HAR 은 유효(goal>0), 플레이스홀더 0/0 은 무효', () => {
  assert.equal(isValidCenterGoals(parseLookerGoals([fixture])[0]!), true)
  const placeholder = parseLookerGoals([makeBody('표준 - DP2504250236', ['0/0 (0%)', '0/0 (0%)', '0/0 (0%)', '0/0 (0%)'])])
  assert.equal(placeholder.length, 1) // 패턴은 통과(=파싱됨)…
  assert.equal(isValidCenterGoals(placeholder[0]!), false) // …그러나 goal 전부 0 → 무효
})

test('current=0 단독은 유효(영업일 초) — goal>0 이면 OK', () => {
  const start = parseLookerGoals([makeBody('표준 - DP1', ['0/336 (0%)', '0/336 (0%)', '0/384 (0%)', '0/480 (0%)'])])
  assert.equal(isValidCenterGoals(start[0]!), true)
})

test('덮어쓰기 방지: 플레이스홀더(0/0)는 좋은 값을 덮지 못함(순서 무관)', () => {
  const good = makeBody('표준 - DP2504250236', ['810/528 (100%)', '389/352 (100%)', '0/560 (0%)', '0/480 (0%)'])
  const empty = makeBody('표준 - DP2504250236', ['0/0 (0%)', '0/0 (0%)', '0/0 (0%)', '0/0 (0%)'])
  for (const order of [[good, empty], [empty, good]]) {
    const c = parseLookerGoals(order)[0]!
    assert.equal(isValidCenterGoals(c), true)
    assert.deepEqual(c.peaks.map((p) => [p.current, p.goal]), [[810, 528], [389, 352], [0, 560], [0, 480]])
  }
})

test('유효끼리는 마지막 우선(최신 갱신 반영)', () => {
  const older = makeBody('표준 - DP1', ['10/100 (10%)', '10/100 (10%)', '10/100 (10%)', '10/100 (10%)'])
  const newer = makeBody('표준 - DP1', ['90/100 (90%)', '90/100 (90%)', '90/100 (90%)', '90/100 (90%)'])
  const c = parseLookerGoals([older, newer])[0]!
  assert.equal(c.peaks[0]!.current, 90)
})
