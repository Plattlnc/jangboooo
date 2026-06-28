/**
 * Playwright 세션 관리. 워커 수명 동안 브라우저/컨텍스트를 1개 유지하고,
 * 로그인 쿠키를 storageState 파일로 영속화해 사이클·재시작 간 세션을 재사용한다.
 * (grider 는 PHP 폼 로그인 → 세션 쿠키 기반이므로 storageState 로 유지 가능.)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import type { Config } from './config'
import type { Logger } from './logger'
import { serializeError } from './logger'

/**
 * 스텔스 설정 — 배민 SPA 는 자동화 브라우저(navigator.webdriver/AutomationControlled)를
 * 감지하면 데이터 API 호출을 silently 차단한다(로그인은 유지, 표만 안 뜸). 아래 3종으로 우회:
 * launch args + webdriver 숨김 initScript + 실제 Chrome UA/viewport/locale.
 */
const STEALTH_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const STEALTH_ARGS = ['--disable-blink-features=AutomationControlled']
const STEALTH_CONTEXT = {
  userAgent: STEALTH_UA,
  viewport: { width: 1440, height: 900 },
  locale: 'ko-KR',
} as const

export class BrowserSession {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  constructor(
    private readonly cfg: Config,
    private readonly log: Logger,
  ) {}

  /** webdriver 흔적 제거 initScript 를 컨텍스트에 주입. */
  private async applyStealth(ctx: BrowserContext): Promise<void> {
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
    ctx.setDefaultTimeout(this.cfg.navTimeoutMs)
    ctx.setDefaultNavigationTimeout(this.cfg.navTimeoutMs)
  }

  /** 브라우저/컨텍스트 기동. 저장된 storageState 가 있으면 복원. */
  async start(): Promise<void> {
    if (this.browser) return
    this.browser = await chromium.launch({ headless: this.cfg.headless, args: STEALTH_ARGS })
    const storageState = await this.loadStorageState()
    this.context = await this.browser.newContext({
      ...STEALTH_CONTEXT,
      ...(storageState ? { storageState } : {}),
    })
    await this.applyStealth(this.context)
    this.log.info('브라우저 기동', { headless: this.cfg.headless, restoredSession: Boolean(storageState) })
  }

  /** 브라우저/컨텍스트가 살아있는지(크래시·disconnect 미발생). */
  isHealthy(): boolean {
    return Boolean(this.browser?.isConnected() && this.context)
  }

  /**
   * 사이클 직전 호출 — 브라우저가 죽어있으면(크래시/OOM/disconnect) 정리 후 재기동.
   * 좀비/리소스 누수 방지를 위해 재기동 전 기존 핸들을 best-effort close 한다.
   * 정상 상태면 즉시 반환(추가 비용 없음).
   */
  async ensureStarted(): Promise<void> {
    if (this.isHealthy()) return
    if (this.browser) {
      this.log.warn('브라우저 비정상 감지(크래시/disconnect) — 정리 후 재기동')
      await this.close() // browser=null, context=null 로 정리(내부 catch 로 무해)
    }
    await this.start()
  }

  /** 새 페이지 발급(사이클마다 생성 후 close 권장). */
  async newPage(): Promise<Page> {
    if (!this.context) throw new Error('BrowserSession.start() 선행 필요')
    return this.context.newPage()
  }

  /** 현재 컨텍스트의 쿠키/스토리지를 파일로 저장(로그인 직후 호출). */
  async persist(): Promise<void> {
    if (!this.context) return
    try {
      await mkdir(dirname(this.cfg.storageStatePath), { recursive: true })
      await this.context.storageState({ path: this.cfg.storageStatePath })
      this.log.debug('세션 영속화', { path: this.cfg.storageStatePath })
    } catch (err) {
      this.log.warn('세션 영속화 실패(무시하고 진행)', serializeError(err))
    }
  }

  private async loadStorageState(): Promise<string | undefined> {
    try {
      await readFile(this.cfg.storageStatePath)
      return this.cfg.storageStatePath
    } catch {
      return undefined
    }
  }

  /** 손상된 세션 초기화: storageState 비우고 컨텍스트 재생성. */
  async resetContext(): Promise<void> {
    if (!this.browser) return
    if (this.context) await this.context.close().catch(() => {})
    try {
      await writeFile(this.cfg.storageStatePath, JSON.stringify({ cookies: [], origins: [] }))
    } catch {
      /* 파일 없을 수 있음 — 무시 */
    }
    this.context = await this.browser.newContext({ ...STEALTH_CONTEXT })
    await this.applyStealth(this.context)
    this.log.info('브라우저 컨텍스트 재생성(세션 초기화)')
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => {})
    await this.browser?.close().catch(() => {})
    this.context = null
    this.browser = null
    this.log.info('브라우저 종료')
  }
}
