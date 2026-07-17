/**
 * 로컬 진단(1회용): 구글 세션으로 달성현황(Looker) 리포트를 띄워
 * 스크린샷 + batchedDataV2 응답 원문 + 본문 텍스트를 덤프한다. 적재 없음.
 * 실행: npx tsx scripts/diag-looker.ts [pageId]
 *   pageId 를 주면 해당 리포트 페이지로 이동(주간 페이지 등 탐색용).
 */
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const BASE = 'https://lookerstudio.google.com/embed/reporting/8e0baa56-bce8-4ba4-90b1-6bab8ecce149'
const PAGE_ID = process.argv[2] ?? 'p_7259p9pbyd'
const OUT = '.session/looker-dump'

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true, timeout: 60_000 })
  try {
    const ctx = await browser.newContext({
      storageState: '.session/google-state.json',
      locale: 'ko-KR',
      viewport: { width: 1680, height: 1600 },
    })
    const page = await ctx.newPage()
    const bodies: string[] = []
    page.on('response', (res) => {
      if (!res.url().includes('batchedDataV2')) return
      res.text().then((t) => bodies.push(t)).catch(() => {})
    })
    await page.goto(`${BASE}/page/${PAGE_ID}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(10_000)
    // --tab <텍스트>: 임베드 내 리포트 탭 클릭(예: 결과리포트) 후 재수집
    const tabIdx = process.argv.indexOf('--tab')
    if (tabIdx > -1 && process.argv[tabIdx + 1]) {
      await page.click(`text=${process.argv[tabIdx + 1]}`).catch((e) => console.error('탭 클릭 실패:', e.message))
      await page.waitForTimeout(12_000)
    }
    await page.screenshot({ path: `${OUT}-${PAGE_ID}.png`, fullPage: true })
    await writeFile(`${OUT}-${PAGE_ID}-bodies.json`, JSON.stringify(bodies))
    const text = await page.evaluate(() => (globalThis as { document?: any }).document.body.innerText as string)
    await writeFile(`${OUT}-${PAGE_ID}-text.txt`, text)
    console.log(`bodies=${bodies.length} textLen=${text.length} → ${OUT}-${PAGE_ID}.png`)
  } finally {
    await browser.close().catch(() => {})
  }
}

main().catch((err) => {
  console.error('diag-looker 실패:', err)
  process.exit(1)
})
