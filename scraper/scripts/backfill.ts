/**
 * 과거 영업일 백필 — 라이더별 배달내역(rider-delivery-status)을 날짜별로 1일씩 조회해
 * sla_snapshots / rider_hourly_stats 에 적재한다. 1회성(또는 가끔) 실행.
 *
 *   npm run backfill -- --from 2026-06-22 --to 2026-06-27
 *   npm run backfill -- --days 7        # 어제부터 과거 7 영업일
 *
 * 오늘(현재 영업일)은 소스에서 조회 불가 → 제외. 오늘은 live 스크래퍼(배달현황)가 채운다.
 * 인증/스텔스/세션은 일반 스크래퍼와 동일(storageState). 멱등 upsert 라 재실행 안전.
 */
import { loadConfig } from '../src/config'
import { createLogger } from '../src/logger'
import { createDb, upsertRiders, upsertSlaSnapshots, upsertHourlyStats } from '../src/supabase'
import { BrowserSession } from '../src/browser'
import { captureApiHeaders, fetchHistoryDay } from '../src/sources/baemin'
import { businessDayInTz } from '../src/util'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** [from..to] 영업일 문자열을 오름차순으로 나열. */
function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

async function main(): Promise<void> {
  const cfg = loadConfig()
  const log = createLogger(cfg.logLevel, { svc: 'backfill' })
  const today = businessDayInTz(cfg.timezone) // 현재 영업일(제외 대상)

  const days = arg('days')
  let from = arg('from')
  let to = arg('to') ?? from
  if (days) {
    // 어제(오늘-1)부터 과거 N 영업일.
    to = addDays(today, -1)
    from = addDays(to, -(Number(days) - 1))
  }
  if (!from || !to) {
    throw new Error('사용: npm run backfill -- --from YYYY-MM-DD [--to YYYY-MM-DD]  또는  --days N')
  }

  const targets = dateRange(from, to).filter((d) => d < today)
  log.info('백필 시작', { from, to, today, days: targets.length })
  if (!targets.length) {
    log.warn('대상 영업일 없음(오늘/미래만 지정됨)')
    return
  }

  const db = createDb(cfg)
  const session = new BrowserSession(cfg, log)
  await session.start()
  const page = await session.newPage()
  try {
    const headers = await captureApiHeaders(page, cfg, log) // 1회 캡처 후 전 날짜 재사용
    let okDays = 0
    for (const day of targets) {
      const result = await fetchHistoryDay(page, headers, cfg, log, day)
      const capturedAt = new Date().toISOString()
      const riders = await upsertRiders(db, result.riders)
      const snapshots = await upsertSlaSnapshots(
        db,
        result.snapshots.map((s) => ({ captured_at: capturedAt, ...s })),
      )
      const hourly = await upsertHourlyStats(
        db,
        result.hourly.map((h) => ({ captured_at: capturedAt, ...h })),
      )
      log.info('백필 적재', { day, riders, snapshots, hourly })
      okDays += 1
    }
    log.info('백필 완료', { from, to, days: okDays })
  } finally {
    await page.close().catch(() => {})
    await session.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
