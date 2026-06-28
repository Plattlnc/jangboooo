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
import { parseLookerGoals, parseBatchedBody } from '../src/sources/baemin-goals'
import { PEAK_KEYS, PEAK_LABELS } from '../src/sources/baemin-goals-types'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(join(here, 'fixtures', 'looker-batched-single-center.txt'), 'utf8')

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
