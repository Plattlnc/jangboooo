/**
 * grider(jangboo.grider.ai) 주정산서 수집 — 추가지급('추가배달료' 시트) + 시간제보험료('을지' F열).
 *
 * 로그인 = 단순 ID/PW 폼(2FA 없음), PHP 세션 쿠키 기반. 매 수집마다 새 컨텍스트로 로그인 →
 * settlement-excel 직접 다운로드 → SheetJS 파싱. 세션 영속 불필요(2FA 없어 재로그인 저렴).
 *
 * 다운로드 URL(주정산서 = 을지/추가배달료/프로모션 포함):
 *   /settlement/weekly/settlement-excel?partner_company_id=&partner_company_name=&base_date=&end_date=
 */
import { chromium } from 'playwright'
import * as XLSX from 'xlsx'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { serializeError } from '../logger'
import { TRAFFIC_ARGS } from '../browser'
import type { RiderExtraPayment, RiderWeeklyInsurance } from '../types'

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
  const { id, pw, baseUrl } = cfg.grider
  const browser = await chromium.launch({ headless: cfg.headless, timeout: 60_000, args: [...TRAFFIC_ARGS] })
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'ko-KR',
    })
    context.setDefaultNavigationTimeout(cfg.navTimeoutMs)
    const page = await context.newPage()

    // 로그인 — id/password 필드는 name 이 아니라 element id.
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('#id', id!)
    await page.fill('#password', pw!)
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: cfg.navTimeoutMs }).catch(() => {}),
      page.click('#loginBtn').catch(() => page.press('#password', 'Enter')),
    ])
    await page.waitForTimeout(1500)
    if (page.url().includes('/login')) throw new Error('grider 로그인 실패(자격증명 확인 필요)')

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
