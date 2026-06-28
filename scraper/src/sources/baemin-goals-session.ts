/**
 * 달성현황(beta) 수집기 — 저장된 "구글 로그인 세션"(storageState)으로 Looker 임베드
 * 리포트를 띄우고, SPA 가 발사하는 batchedDataV2 응답을 가로채 파서(baemin-goals.ts)로 매핑.
 *
 * 배민 세션(BrowserSession)과 쿠키 도메인이 달라(google.com) 별도 컨텍스트를 쓴다.
 * x-rap-xsrf-token 은 세션 바운드라 우리가 다루지 않고, SPA 가 자체 요청에 실어 보낸다.
 * best-effort: 세션 없음/만료/리포트 변경 시 빈 배열 반환(배달현황 수집엔 영향 없음).
 */
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium, type BrowserContextOptions } from 'playwright'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { serializeError } from '../logger'
import { businessDayInTz } from '../util'
import type { CenterGoalUpsert } from '../types'
import { isValidCenterGoals, parseLookerGoals } from './baemin-goals'

const GOOGLE_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const PEAK_CELL_GLOBAL = /\d+\/\d+ \(\d+%\)/

/** Railway 등: GOOGLE_STORAGE_STATE_B64 가 있고 파일이 없으면 파일로 복원. */
async function restoreGoogleStateFromB64(cfg: Config, log: Logger): Promise<void> {
  const b64 = cfg.goals.googleStorageStateB64
  if (!b64) return
  try {
    await access(cfg.goals.googleStorageStatePath)
    return // 이미 있음
  } catch {
    /* 없음 → 복원 */
  }
  try {
    const json = Buffer.from(b64, 'base64').toString('utf8')
    JSON.parse(json)
    await mkdir(dirname(cfg.goals.googleStorageStatePath), { recursive: true })
    await writeFile(cfg.goals.googleStorageStatePath, json)
    log.info('GOOGLE_STORAGE_STATE_B64 → 구글 세션 파일 복원', { path: cfg.goals.googleStorageStatePath })
  } catch (err) {
    log.warn('구글 세션 B64 복원 실패(스킵 가능)', serializeError(err))
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * 공동목표 1회 수집 → center_peak_goals upsert 행 배열.
 * 자체 브라우저 수명(launch→close). 실패/미확보는 빈 배열(호출부에서 best-effort 처리).
 */
export async function collectCenterGoals(cfg: Config, log: Logger): Promise<CenterGoalUpsert[]> {
  await restoreGoogleStateFromB64(cfg, log)

  const browser = await chromium.launch({ headless: cfg.headless })
  try {
    const opts: BrowserContextOptions = { userAgent: GOOGLE_UA, locale: 'ko-KR' }
    if (await fileExists(cfg.goals.googleStorageStatePath)) {
      opts.storageState = cfg.goals.googleStorageStatePath
    }
    const context = await browser.newContext(opts)
    context.setDefaultNavigationTimeout(cfg.navTimeoutMs)
    const page = await context.newPage()

    const bodies: string[] = []
    page.on('response', (res) => {
      if (!res.url().includes('batchedDataV2')) return
      res
        .text()
        .then((t) => bodies.push(t))
        .catch(() => {})
    })

    await page.goto(cfg.goals.reportUrl, { waitUntil: 'networkidle' }).catch((err) => {
      log.warn('Looker 리포트 네비 경고(계속 시도)', serializeError(err))
    })
    // 데이터가 렌더된 "유효 목표(goal>0)" 응답이 올 때까지 대기(최대 ~30s).
    // 로딩 중에는 "0/0 (0%)" 플레이스홀더가 오므로, 패턴만 보지 말고 파싱 결과의 유효성으로 판단.
    let centers = parseLookerGoals(bodies)
    for (let i = 0; i < 60 && !centers.some(isValidCenterGoals); i++) {
      await page.waitForTimeout(500)
      centers = parseLookerGoals(bodies)
    }

    // (B) 비파괴 가드: 유효(goal>0) 센터만 채택. 없으면 upsert 스킵(기존 값 보존) — 0 으로 덮어쓰지 않음.
    const validCenters = centers.filter(isValidCenterGoals)
    if (validCenters.length === 0) {
      const sawPeakCell = bodies.some((b) => PEAK_CELL_GLOBAL.test(b))
      log.warn('공동목표 유효데이터 없음 — 스킵(기존 유지)', {
        batchedResponses: bodies.length,
        parsedCenters: centers.length, // >0 인데 전부 무효면 로딩/0초기화, 0이면 세션만료/접근불가
        sawPeakCell, // false 면 세션 만료/접근불가 가능, true 면 로딩/플레이스홀더 가능
      })
      return []
    }

    const snapshot_date = businessDayInTz(cfg.timezone)
    const captured_at = new Date().toISOString()
    const rows: CenterGoalUpsert[] = []
    for (const c of validCenters) {
      for (const p of c.peaks) {
        rows.push({
          center_id: c.center_id,
          center_name: c.center_name,
          snapshot_date,
          peak_key: p.peak_key,
          current: p.current,
          goal: p.goal,
          pct: p.pct,
          captured_at,
        })
      }
    }
    log.info('공동목표 수집 완료', { centers: validCenters.length, rows: rows.length, snapshot_date })
    return rows
  } finally {
    await browser.close().catch(() => {})
  }
}
