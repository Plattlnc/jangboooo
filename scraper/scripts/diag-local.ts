/**
 * 로컬 진단(1회용): 저장된 세션으로 /delivery/history 를 띄우고
 * 최종 URL·타이틀·api 요청 목록·스크린샷을 남긴다. 적재 없음.
 * 실행: npx tsx scripts/diag-local.ts <screenshot-path>
 */
import { chromium } from 'playwright'

const OUT = process.argv[2] ?? '/tmp/jb-diag.png'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

async function main(): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    locale: 'ko-KR',
    storageState: '.session/storage-state.json',
  })
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  const page = await ctx.newPage()
  const reqs: string[] = []
  page.on('request', (r) => {
    const u = r.url()
    if (u.includes('api-deliverycenter') || u.includes('biz-member')) reqs.push(`${r.method()} ${u.slice(0, 120)}`)
  })
  page.on('response', (r) => {
    const u = r.url()
    if (u.includes('api-deliverycenter')) console.log(`RES ${r.status()} ${u.slice(0, 120)}`)
  })
  await page.goto('https://deliverycenter.baemin.com/delivery/history', { waitUntil: 'networkidle' })
  await page.waitForTimeout(10_000)
  console.log('FINAL_URL:', page.url())
  console.log('TITLE:', await page.title())
  console.log('BODY_TEXT:', (await page.locator('body').innerText().catch(() => ''))?.slice(0, 500).replace(/\s+/g, ' '))
  console.log('API_REQS:', JSON.stringify(reqs.slice(0, 20), null, 1))
  await page.screenshot({ path: OUT, fullPage: false })
  console.log('SCREENSHOT:', OUT)
  await browser.close()
}

main().catch((e) => {
  console.error('DIAG_ERROR:', e)
  process.exit(1)
})
