/**
 * 영업일 전환 그레이스(isBusinessDayRollover) 단위테스트 — 2026-08-14 오염 사고 회귀 방지.
 * 06:00~06:10(KST) 구간에만 true, 그 외 false.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isBusinessDayRollover } from '../src/util'

const KST = 'Asia/Seoul'
/** KST 벽시계 시각 → Date (KST = UTC+9 고정, DST 없음). */
function kst(iso: string): Date {
  return new Date(`${iso}+09:00`)
}

test('06:00 정각(전환 직후) → true', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T06:00:00')), true)
})

test('06:09(그레이스 내) → true', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T06:09:59')), true)
})

test('06:10(그레이스 종료) → false', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T06:10:00')), false)
})

test('05:59(전일 영업일 마지막 분) → false', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T05:59:59')), false)
})

test('일과 시간(12:00) → false', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T12:00:00')), false)
})

test('자정(00:00, 영업일 중간) → false', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T00:00:00')), false)
})

test('graceMinutes 커스텀(5분) — 06:07 은 false', () => {
  assert.equal(isBusinessDayRollover(KST, kst('2026-08-14T06:07:00'), 5), false)
})
