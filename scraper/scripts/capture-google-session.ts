/**
 * 로컬 1회 "구글 세션" 캡처 (headed Playwright) — 달성현황(beta) Looker 리포트 접근용.
 * 사람이 직접 구글 로그인(배민커넥트비즈 달성현황에 쓰는 계정)하고, 로그인된
 * storageState(구글 쿠키)를 파일로 저장한다. 워커(Railway)는 이 파일(또는
 * GOOGLE_STORAGE_STATE_B64)로 Looker 임베드를 띄워 batchedDataV2 응답을 수집한다.
 *
 * 실행: cd scraper && npm run capture:google
 *   (브라우저 창이 뜬다. 구글 로그인 + 리포트가 데이터까지 보이는지 확인 후 ENTER.)
 *   세션 만료 시 다시 실행해 갱신 → 출력된 base64 를 GOOGLE_STORAGE_STATE_B64 에 갱신.
 *
 * 운영 런북(devops/사용자):
 *   1) 이 스크립트로 구글 세션 캡처 → storageState 파일 생성
 *   2) base64 (스크립트가 출력) → Railway Variables 의 GOOGLE_STORAGE_STATE_B64 에 설정
 *   3) 워커 재배포. 공동목표가 안 들어오면(로그 "공동목표 응답 미확보") 세션 만료 → 1) 재수행
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { chromium } from 'playwright'

const DEFAULT_REPORT_URL =
  'https://lookerstudio.google.com/embed/reporting/8e0baa56-bce8-4ba4-90b1-6bab8ecce149/page/p_7259p9pbyd'
const REPORT_URL = process.env.GOAL_REPORT_URL || DEFAULT_REPORT_URL
const STATE_PATH = resolve(process.env.GOOGLE_STORAGE_STATE_PATH || './.session/google-state.json')

async function main(): Promise<void> {
  console.log('▶ 구글 세션 캡처 (headed). 잠시 후 브라우저 창이 열립니다.')
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded' }).catch(() => {
    /* 로그인 리다이렉트 등은 무시 — 사람이 진행 */
  })

  console.log(
    [
      '',
      '────────────────────────────────────────────────────',
      ' 1) 브라우저에서 구글 로그인(달성현황에 쓰는 계정)',
      ' 2) Looker 리포트에 피크별 "현재/목표 (%)" 표가 보이는지 확인',
      ' 3) 끝나면 이 터미널로 돌아와 ENTER',
      '────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  )

  const rl = createInterface({ input: stdin, output: stdout })
  await rl.question('완료되면 ENTER… ')
  rl.close()

  await mkdir(dirname(STATE_PATH), { recursive: true })
  await context.storageState({ path: STATE_PATH })
  await browser.close()

  const b64 = Buffer.from(await readFile(STATE_PATH)).toString('base64')
  console.log(`\n✔ 저장: ${STATE_PATH}`)
  console.log('\n── GOOGLE_STORAGE_STATE_B64 (Railway Variables 에 한 줄로 설정) ──')
  console.log(b64)
}

main().catch((err) => {
  console.error('구글 세션 캡처 실패:', err)
  process.exit(1)
})
