/**
 * 배달처리비 상세(가맹점명 포함) 과거 백필 — 지정 기간을 1일씩 다시 다운로드해
 * rider_daily_fees / delivery_fee_details 를 멱등 재적재한다. store_name(가맹점명) 소급용.
 *
 *   railway run npm run backfill:fees -- --from 2026-07-01 --to 2026-08-10
 *
 * ⚠️ 규제 데이터(라이더 급여성 PII): 다운로드마다 사유 전송, 원본 바이너리는 메모리에만 두고 파기.
 * 인증/세션은 일반 스크래퍼와 동일(storageState). 멱등 upsert(키 delivery_no) 라 재실행 안전.
 */
import { loadConfig } from '../src/config'
import { createLogger } from '../src/logger'
import { createDb, upsertRiderDailyFees, upsertDeliveryFeeDetails } from '../src/supabase'
import { BrowserSession } from '../src/browser'
import { captureApiHeaders } from '../src/sources/baemin'
import { collectDeliveryFees } from '../src/sources/baemin-fees'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** [from..to] 날짜 문자열 오름차순. */
function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

async function main(): Promise<void> {
  const cfg = loadConfig()
  const log = createLogger(cfg.logLevel, { svc: 'backfill-fees' })
  const from = arg('from')
  const to = arg('to') ?? from
  if (!from || !to) {
    throw new Error('사용: npm run backfill:fees -- --from YYYY-MM-DD [--to YYYY-MM-DD]')
  }
  if (!cfg.fees.password) {
    throw new Error('DELIVERY_FEE_PASSWORD 필요(배달처리비 다운로드 비번=계정 ID). railway run 으로 실행하세요.')
  }
  const targets = dateRange(from, to)
  log.info('배달처리비 백필 시작', { from, to, days: targets.length })

  const db = createDb(cfg)
  const session = new BrowserSession(cfg, log)
  await session.start()
  const page = await session.newPage()
  try {
    const headers = await captureApiHeaders(page, cfg, log) // 1회 캡처 후 전 날짜 재사용
    let okDays = 0
    let totDaily = 0
    let totDetails = 0
    for (const day of targets) {
      try {
        const parsed = await collectDeliveryFees(page, headers, cfg.fees.password, cfg.fees.reason, day, log)
        const daily = await upsertRiderDailyFees(db, parsed.daily)
        const details = await upsertDeliveryFeeDetails(db, parsed.details)
        totDaily += daily
        totDetails += details
        okDays += 1
        log.info('백필 적재', { day, daily, details })
      } catch (e) {
        log.error('백필 실패(해당일 건너뜀)', { day, err: String(e) })
      }
    }
    log.info('배달처리비 백필 완료', { from, to, okDays, totDaily, totDetails })
  } finally {
    await page.close().catch(() => {})
    await session.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
