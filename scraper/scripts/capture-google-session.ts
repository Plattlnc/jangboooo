/**
 * 로컬 1회 "구글 세션" 캡처 — 달성현황(beta) Looker 리포트 접근용.
 * 사람이 직접 구글 로그인(리포트에 권한 있는 계정)하고, 로그인된 storageState(구글 쿠키)를
 * 파일로 저장한다. 워커(Railway)는 이 파일(또는 GOOGLE_STORAGE_STATE_B64)로 Looker 임베드를
 * 띄워 batchedDataV2 응답을 수집한다.
 *
 * ⚠️ 반드시 **데스크톱 Chrome 설치 필요**. Playwright 번들 크로미움으로는 구글이 자동화
 *    브라우저로 감지해 "이 브라우저는 안전하지 않을 수 있습니다"로 로그인을 차단한다. 그래서
 *    `channel: 'chrome'`(설치된 진짜 크롬) + 자동화 탐지 해제 + **영속 프로필**(launchPersistentContext)
 *    로 띄운다. 영속 프로필이라 한 번 로그인하면 유지되어 재캡처가 쉽다.
 *
 * 실행: cd scraper && npm run capture:google
 *   (진짜 크롬 창이 뜬다. 리포트에 "권한 있는 구글 계정"으로 로그인 →
 *    피크별 "현재/목표 (%)" 표가 보이는지 확인 후 터미널에서 ENTER.)
 *   세션 만료 시 다시 실행해 갱신 → 출력된 base64 를 GOOGLE_STORAGE_STATE_B64 에 갱신.
 *
 * 운영 런북(devops/사용자):
 *   1) 이 스크립트로 구글 세션 캡처 → storageState 파일 생성
 *   2) base64(스크립트가 출력) → Railway Variables 의 GOOGLE_STORAGE_STATE_B64 에 설정
 *   3) 워커 재배포. 공동목표가 안 들어오면(로그 "공동목표 응답 미확보") 세션 만료 → 1) 재수행
 */
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { chromium } from 'playwright'

const DEFAULT_REPORT_URL =
  'https://lookerstudio.google.com/embed/reporting/8e0baa56-bce8-4ba4-90b1-6bab8ecce149/page/p_7259p9pbyd'
const REPORT_URL = process.env.GOAL_REPORT_URL || DEFAULT_REPORT_URL
const STATE_PATH = resolve(process.env.GOOGLE_STORAGE_STATE_PATH || './.session/google-state.json')
// 영속 프로필 디렉터리(쿠키/로그인 유지). 재캡처 시 재로그인 불필요.
const PROFILE_DIR = resolve(process.env.GOOGLE_PROFILE_DIR || './.session/google-profile')

async function main(): Promise<void> {
  console.log('▶ 구글 세션 캡처 — 설치된 데스크톱 Chrome 으로 엽니다(자동화 탐지 해제, 영속 프로필).')
  await mkdir(PROFILE_DIR, { recursive: true })

  // launchPersistentContext: 진짜 크롬(channel:'chrome') + 자동화 흔적 제거.
  // headless:false 필수(사람이 로그인). viewport:null = 실제 창 크기 사용.
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless: false,
    viewport: null,
    args: ['--disable-blink-features=AutomationControlled'],
    ignoreDefaultArgs: ['--enable-automation'],
  })

  const page = context.pages()[0] ?? (await context.newPage())
  await page.goto(REPORT_URL, { waitUntil: 'domcontentloaded' }).catch(() => {
    /* 로그인 리다이렉트 등은 무시 — 사람이 진행 */
  })

  console.log(
    [
      '',
      '────────────────────────────────────────────────────',
      ' 1) 크롬에서 구글 로그인 — **리포트에 접근 권한 있는 계정**으로',
      '    (권한 없는 계정이면 "보고서 액세스 불가"가 계속 뜬다)',
      ' 2) Looker 리포트에 피크별 "현재/목표 (%)" 표가 보이는지 확인',
      ' 3) 끝나면 이 터미널로 돌아와 ENTER',
      '────────────────────────────────────────────────────',
      '',
    ].join('\n'),
  )

  const rl = createInterface({ input: stdin, output: stdout })
  await rl.question('완료되면 ENTER… ')
  rl.close()

  // 영속 컨텍스트는 close 전에 storageState 추출.
  await mkdir(dirname(STATE_PATH), { recursive: true })
  await context.storageState({ path: STATE_PATH })
  await context.close()

  const b64 = Buffer.from(await readFile(STATE_PATH)).toString('base64')
  console.log(`\n✔ 저장: ${STATE_PATH}`)
  console.log(`  (영속 프로필: ${PROFILE_DIR} — 재캡처 시 재로그인 불필요)`)
  console.log('\n── GOOGLE_STORAGE_STATE_B64 (Railway Variables 에 한 줄로 설정) ──')
  console.log(b64)
}

main().catch((err) => {
  console.error('구글 세션 캡처 실패:', err)
  if (/executable doesn'?t exist|channel|chrome/i.test(String(err?.message ?? err))) {
    console.error(
      [
        '',
        '※ 데스크톱 Chrome 이 필요합니다(channel:"chrome"). 설치 확인 후 다시 실행하세요.',
        '  - macOS: Google Chrome 정식 설치본 필요',
        '  - 또는 GOAL_REPORT_URL 로 리포트 URL 을 직접 지정해 권한 있는 계정으로 로그인',
      ].join('\n'),
    )
  }
  process.exit(1)
})
