/**
 * grider 주정산서 과거 백필 — 지정 주차들의 추가지급·시간제보험료를 재수집·멱등 적재.
 *
 *   set -a; source .env; set +a
 *   npx tsx scripts/backfill-grider.ts --from 2026-06-10 --to 2026-08-11
 *
 * from/to 는 아무 날짜나 줘도 되며, 내부에서 '주 시작(수요일)'로 정렬해 주 단위로 순회한다.
 * 인증/세션은 매 주차 grider 재로그인(2FA 없어 저렴). 멱등 upsert 라 재실행 안전.
 */
import { loadConfig } from '../src/config'
import { createLogger } from '../src/logger'
import { createDb, upsertRiderExtraPayments, upsertRiderWeeklyInsurance } from '../src/supabase'
import { collectGriderWeekly } from '../src/sources/grider'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function addDays(date: string, n: number): string {
  const dt = new Date(`${date}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/** 날짜가 속한 정산 주(수~화)의 시작(수요일). */
function weekStartOf(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay() // 0=일 … 3=수
  const sinceWed = (dow - 3 + 7) % 7
  return addDays(date, -sinceWed)
}

async function main(): Promise<void> {
  const cfg = loadConfig()
  const log = createLogger(cfg.logLevel, { svc: 'backfill-grider' })
  if (!cfg.grider.configured) throw new Error('GRIDER_ID/GRIDER_PW 필요')
  const from = arg('from')
  const to = arg('to') ?? from
  if (!from || !to) throw new Error('사용: --from YYYY-MM-DD [--to YYYY-MM-DD]')

  const weeks: string[] = []
  for (let w = weekStartOf(from); w <= to; w = addDays(w, 7)) weeks.push(w)
  log.info('grider 백필 시작', { from, to, weeks: weeks.length })

  const db = createDb(cfg)
  let ok = 0
  let totIns = 0
  let totExtra = 0
  for (const start of weeks) {
    const end = addDays(start, 6)
    try {
      const res = await collectGriderWeekly(cfg, log, start, end)
      const ni = await upsertRiderWeeklyInsurance(db, res.insurance)
      const ne = await upsertRiderExtraPayments(db, res.extra)
      totIns += ni
      totExtra += ne
      ok += 1
      log.info('백필 적재', { week: `${start}~${end}`, insurance: ni, extra: ne })
    } catch (e) {
      log.error('백필 실패(해당 주 건너뜀)', { week: start, err: String(e) })
    }
  }
  log.info('grider 백필 완료', { weeks: weeks.length, ok, totInsurance: totIns, totExtra })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
