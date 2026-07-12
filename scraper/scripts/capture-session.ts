/**
 * 로컬 1회 세션 캡처 (headed Playwright).
 * 배민 biz-member 로그인(ID/PW + SMS 2FA + 자동로그인)은 **사람이 직접** 수행하고,
 * 로그인된 storageState(세션 쿠키)를 파일로 저장한다. 워커(Railway)는 이 파일
 * (또는 STORAGE_STATE_B64)로 SPA 를 띄워 데이터를 수집한다. 토큰 추출 없음.
 *
 * 실행: cd scraper && npm run capture
 *   (헤드리스 아님 — 브라우저 창이 뜬다. 로그인 완료 후 터미널에서 ENTER.)
 *   세션 만료 시 다시 실행해 갱신.
 */
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright'
import { DELIVERY_CENTER_URL } from '../src/sources/baemin'

const PORTAL_URL = process.env.ADMIN_PORTAL_URL || DELIVERY_CENTER_URL
const STATE_PATH = resolve(process.env.STORAGE_STATE_PATH || './.session/storage-state.json')

async function main(): Promise<void> {
  console.log('▶ 배민 세션 캡처 (headed). 잠시 후 브라우저 창이 열립니다.')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded' }).catch(() => {
    /* 로그인 리다이렉트 등은 무시 — 사람이 진행 */
  })

  console.log(
    [
      '',
      '────────────────────────────────────────────────────',
      ' 1) 브라우저에서 biz-member 로그인 (ID/PW + SMS 2FA)',
      ' 2) "자동로그인" 체크 권장 (세션 수명 ↑)',
      ' 3) deliverycenter 대시보드까지 진입하면 자동 저장됩니다',
      '    (ENTER 불필요 — 백그라운드 실행도 안전)',
      '────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  )

  // 로그인 완료 자동 감지: 로그인/2차인증 화면이 아닌 deliverycenter 본화면 도달까지 폴링.
  // stdin 의존 제거 — 백그라운드로 돌려도 저장이 누락되지 않는다(2026-07-10 ENTER 유실 사고).
  // URL 만으로는 부족: biz-member 통과 직후 SPA 가 2차인증(/sign-in/auth)으로 다시 튕기기 전의
  // 과도기 URL 을 완료로 오판해 반쪽 세션(API 401)을 저장한 사고(2026-07-12) 방지 —
  // api-deliverycenter 가 실제 2xx 를 반환해야만 완료로 판정한다.
  let apiOk = false
  page.on('response', (res) => {
    if (res.url().includes('api-deliverycenter') && res.ok()) apiOk = true
  })
  const DEADLINE_MS = 30 * 60 * 1000
  const start = Date.now()
  for (;;) {
    if (Date.now() - start > DEADLINE_MS) throw new Error('30분 내 로그인 미완료 — 다시 실행해주세요')
    await page.waitForTimeout(3_000)
    const url = page.url()
    const loggedIn =
      apiOk && url.startsWith(PORTAL_URL) && !url.includes('biz-member') && !url.includes('/sign-in')
    if (loggedIn) break
    console.log(`  대기 중... (현재: ${url.slice(0, 80)}, api2xx=${apiOk})`)
  }
  await page.waitForTimeout(5_000) // 로그인 직후 쿠키 정착 대기

  await mkdir(dirname(STATE_PATH), { recursive: true })
  await context.storageState({ path: STATE_PATH })
  console.log(`\n✓ storageState 저장: ${STATE_PATH}`)

  // Railway 주입용 base64(STORAGE_STATE_B64). 시크릿 취급 — 공유 금지.
  const raw = await readFile(STATE_PATH, 'utf8')
  const cookieCount = (JSON.parse(raw).cookies ?? []).length
  const b64 = Buffer.from(raw, 'utf8').toString('base64')
  console.log(`  (쿠키 ${cookieCount}개)`)
  console.log('\n— Railway 용 STORAGE_STATE_B64 (한 줄, 시크릿) —')
  console.log(b64)

  await browser.close()
  console.log('\n완료. 세션 만료 시 이 스크립트를 다시 실행해 갱신하세요.')
}

main().catch((err) => {
  console.error('세션 캡처 실패:', err)
  process.exit(1)
})
