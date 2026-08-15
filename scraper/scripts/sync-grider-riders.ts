/**
 * grider 라이더 계약상태 즉시 동기화(수동) — rider_contract_status 전량 upsert.
 *   set -a; source .env; set +a; npx tsx scripts/sync-grider-riders.ts
 * 스크래퍼가 하루 1회 자동 수집하지만, 즉시 반영이 필요할 때 사용.
 */
import { loadConfig } from '../src/config'
import { createLogger } from '../src/logger'
import { createDb, upsertRiderContractStatus } from '../src/supabase'
import { collectGriderRiders } from '../src/sources/grider'

async function main(): Promise<void> {
  const cfg = loadConfig()
  const log = createLogger(cfg.logLevel, { svc: 'sync-grider-riders' })
  if (!cfg.grider.configured) throw new Error('GRIDER_ID/GRIDER_PW 필요')
  const db = createDb(cfg)
  const riders = await collectGriderRiders(cfg, log)
  const n = await upsertRiderContractStatus(db, riders)
  const term = riders.filter((r) => r.is_terminated)
  console.log(`적재 완료: ${n}명 (계약종료 ${term.length}명)`)
  console.log('계약종료:', term.map((r) => `${r.rider_name}(${r.admin_rider_id})`).join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
