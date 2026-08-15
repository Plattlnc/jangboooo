/**
 * grider(jangboo.grider.ai) 주정산서 수집 — 추가지급('추가배달료' 시트) + 시간제보험료('을지' F열).
 *
 * 로그인 = 단순 ID/PW 폼(2FA 없음), PHP 세션 쿠키 기반. 매 수집마다 새 컨텍스트로 로그인 →
 * settlement-excel 직접 다운로드 → SheetJS 파싱. 세션 영속 불필요(2FA 없어 재로그인 저렴).
 *
 * 다운로드 URL(주정산서 = 을지/추가배달료/프로모션 포함):
 *   /settlement/weekly/settlement-excel?partner_company_id=&partner_company_name=&base_date=&end_date=
 */
import { chromium, type Browser, type Page } from 'playwright'
import * as XLSX from 'xlsx'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { serializeError } from '../logger'
import { TRAFFIC_ARGS } from '../browser'
import type { RiderContractStatus, RiderExtraPayment, RiderWeeklyInsurance } from '../types'

const GRIDER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** grider 로그인(ID/PW, 2FA 없음) → 인증된 page 반환. 호출부가 browser.close() 책임. */
async function griderLogin(cfg: Config): Promise<{ browser: Browser; page: Page }> {
  const { id, pw, baseUrl } = cfg.grider
  if (!id || !pw) throw new Error('grider 미설정(GRIDER_ID/PW)')
  const browser = await chromium.launch({ headless: cfg.headless, timeout: 60_000, args: [...TRAFFIC_ARGS] })
  try {
    const context = await browser.newContext({ userAgent: GRIDER_UA, viewport: { width: 1440, height: 900 }, locale: 'ko-KR' })
    context.setDefaultNavigationTimeout(cfg.navTimeoutMs)
    const page = await context.newPage()
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('#id', id)
    await page.fill('#password', pw)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: cfg.navTimeoutMs }).catch(() => {}),
      page.click('#loginBtn').catch(() => page.press('#password', 'Enter')),
    ])
    await page.waitForTimeout(1500)
    if (page.url().includes('/login')) throw new Error('grider 로그인 실패(자격증명 확인 필요)')
    return { browser, page }
  } catch (err) {
    await browser.close().catch(() => {})
    throw err
  }
}

const SHEET_EULJI_PREFIX = '을지' // 을지_협력사 소속 라이더 정산 확인용
const SHEET_EXTRA = '추가배달료'

export type GriderWeeklyResult = {
  weekStart: string
  weekEnd: string
  extra: RiderExtraPayment[]
  insurance: RiderWeeklyInsurance[]
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : 0
}
const str = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/** 을지 시트 → 라이더별 시간제보험료(F열, idx 10). User ID = idx 2, NO(idx 1)=숫자인 행이 데이터. */
function parseInsurance(wb: XLSX.WorkBook, weekStart: string, weekEnd: string): RiderWeeklyInsurance[] {
  const name = wb.SheetNames.find((n) => n.startsWith(SHEET_EULJI_PREFIX))
  if (!name) return []
  const ws = wb.Sheets[name]
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const out: RiderWeeklyInsurance[] = []
  for (const row of rows) {
    if (!row || row.length <= 10) continue
    if (typeof row[1] !== 'number' || row[2] == null) continue // NO 숫자 + User ID 존재
    const amount = num(row[10])
    if (amount <= 0) continue
    const uid = str(row[2])
    if (!uid) continue
    out.push({ week_start: weekStart, week_end: weekEnd, admin_rider_id: uid, rider_name: str(row[3]), amount_krw: amount })
  }
  return out
}

/** 추가배달료 시트 → 건별 추가지급. 헤더 '라이더ID'(idx 1) 행 이후 데이터. */
function parseExtra(wb: XLSX.WorkBook, weekStart: string, weekEnd: string): RiderExtraPayment[] {
  const ws = wb.Sheets[SHEET_EXTRA]
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const out: RiderExtraPayment[] = []
  let headerSeen = false
  for (const row of rows) {
    if (!row || row.length < 6) continue
    if (row[1] === '라이더ID') {
      headerSeen = true
      continue
    }
    if (!headerSeen || row[1] == null || row[3] == null) continue
    const uid = str(row[1])
    if (!uid) continue
    out.push({
      week_start: weekStart,
      week_end: weekEnd,
      admin_rider_id: uid,
      rider_name: str(row[2]),
      amount_krw: num(row[3]),
      delivery_info: str(row[4]) ?? '',
      reason: str(row[5]) ?? '',
    })
  }
  return out
}

/** 로그인 후 특정 주차(base_date~end_date) 주정산서 xlsx 를 페이지 컨텍스트 fetch 로 받아 파싱. */
export async function collectGriderWeekly(
  cfg: Config,
  log: Logger,
  weekStart: string,
  weekEnd: string,
): Promise<GriderWeeklyResult> {
  if (!cfg.grider.configured) throw new Error('grider 미설정(GRIDER_ID/PW)')
  const { id, baseUrl } = cfg.grider
  const { browser, page } = await griderLogin(cfg)
  try {
    // 주정산서 엑셀 직접 다운로드(세션 쿠키 포함). partner_company_name 은 URL 인코딩.
    const q = new URLSearchParams({
      partner_company_id: id!,
      partner_company_name: '인천서구8B',
      base_date: weekStart,
      end_date: weekEnd,
    }).toString()
    const url = `${baseUrl}/settlement/weekly/settlement-excel?${q}`
    const b64 = await page.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const buf = await r.arrayBuffer()
      let bin = ''
      for (const byte of new Uint8Array(buf)) bin += String.fromCharCode(byte)
      return btoa(bin)
    }, url)
    const buf = Buffer.from(b64, 'base64')
    if (buf.length < 1000 || buf.slice(0, 2).toString('ascii') !== 'PK') {
      throw new Error(`주정산서 다운로드 실패(size=${buf.length}, 매직=${buf.slice(0, 4).toString('hex')})`)
    }

    const wb = XLSX.read(buf, { type: 'buffer', dense: true })
    const extra = parseExtra(wb, weekStart, weekEnd)
    const insurance = parseInsurance(wb, weekStart, weekEnd)
    log.info('grider 주정산서 수집', {
      week: `${weekStart}~${weekEnd}`,
      extra: extra.length,
      extraKrw: extra.reduce((s, r) => s + r.amount_krw, 0),
      insurance: insurance.length,
      insuranceKrw: insurance.reduce((s, r) => s + r.amount_krw, 0),
    })
    return { weekStart, weekEnd, extra, insurance }
  } finally {
    await browser.close().catch(() => {})
  }
}

/** best-effort 래퍼 — 실패 시 null(호출부에서 스킵 처리, 다른 수집 무영향). */
export async function tryCollectGriderWeekly(
  cfg: Config,
  log: Logger,
  weekStart: string,
  weekEnd: string,
): Promise<GriderWeeklyResult | null> {
  try {
    return await collectGriderWeekly(cfg, log, weekStart, weekEnd)
  } catch (err) {
    log.warn('grider 주정산서 수집 실패(스킵)', serializeError(err))
    return null
  }
}

/**
 * grider 라이더 관리(/partners/riders) 전량 수집 → 계약상태(계약중/계약종료).
 * 테이블 컬럼: [_, 협력사명, 협력사ID, 라이더ID(3), 라이더명(4), 휴대폰(5), 계약상태(6), ...].
 * 페이지당 20행, ?page=N 순회. 20행 미만이면 마지막 페이지.
 */
export async function collectGriderRiders(cfg: Config, log: Logger): Promise<RiderContractStatus[]> {
  if (!cfg.grider.configured) throw new Error('grider 미설정(GRIDER_ID/PW)')
  const { baseUrl } = cfg.grider
  const { browser, page } = await griderLogin(cfg)
  try {
    const out: RiderContractStatus[] = []
    const seen = new Set<string>()
    for (let pageNo = 1; pageNo <= 40; pageNo++) {
      await page.goto(`${baseUrl}/partners/riders?page=${pageNo}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      const rows: string[][] = await page.evaluate(() => {
        const doc = (globalThis as { document?: { querySelectorAll(s: string): ArrayLike<{ querySelectorAll(s: string): ArrayLike<{ textContent: string | null }> }> } }).document
        const res: string[][] = []
        if (!doc) return res
        const trs = doc.querySelectorAll('table tbody tr')
        for (let i = 0; i < trs.length; i++) {
          const tds = trs[i]!.querySelectorAll('td')
          const cells: string[] = []
          for (let j = 0; j < tds.length; j++) cells.push((tds[j]!.textContent ?? '').trim().replace(/\s+/g, ' '))
          res.push(cells)
        }
        return res
      })
      if (rows.length === 0) break
      let added = 0
      for (const r of rows) {
        const rid = str(r[3])
        if (!rid || seen.has(rid)) continue
        seen.add(rid)
        added += 1
        const status = str(r[6]) ?? ''
        out.push({
          admin_rider_id: rid,
          rider_name: str(r[4]),
          phone: str(r[5]),
          status,
          is_terminated: status.includes('종료') || status.includes('해지') || status.includes('탈퇴'),
        })
      }
      if (rows.length < 20 || added === 0) break
    }
    log.info('grider 계약상태 수집', {
      total: out.length,
      terminated: out.filter((r) => r.is_terminated).length,
    })
    return out
  } finally {
    await browser.close().catch(() => {})
  }
}

/** best-effort 래퍼 — 실패 시 null. */
export async function tryCollectGriderRiders(cfg: Config, log: Logger): Promise<RiderContractStatus[] | null> {
  try {
    return await collectGriderRiders(cfg, log)
  } catch (err) {
    log.warn('grider 계약상태 수집 실패(스킵)', serializeError(err))
    return null
  }
}
