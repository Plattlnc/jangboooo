/**
 * 환경 변수 로딩 + 검증(zod). 잘못된/누락 설정은 부팅 시 즉시 실패.
 * service_role 키와 Supabase URL 은 필수. grider 포털 자격증명은
 * 미확정이므로 선택값 — 셋이 모두 채워졌을 때만 실제 수집을 시도한다.
 */
import { z } from 'zod'
import type { LogLevel } from './logger'

/** 'true'/'1'/'yes' → true, 빈 문자열 → undefined(기본값 적용). */
const boolish = z.preprocess((v) => {
  if (typeof v !== 'string') return v
  const s = v.trim().toLowerCase()
  if (s === '') return undefined
  return s === '1' || s === 'true' || s === 'yes'
}, z.boolean())

const optionalNonEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

const EnvSchema = z.object({
  SUPABASE_URL: optionalNonEmpty,
  NEXT_PUBLIC_SUPABASE_URL: optionalNonEmpty,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY 필수'),

  ADMIN_PORTAL_URL: optionalNonEmpty,
  ADMIN_PORTAL_ID: optionalNonEmpty,
  ADMIN_PORTAL_PASSWORD: optionalNonEmpty,

  SCRAPE_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  SCRAPE_TIMEZONE: z.string().min(1).default('Asia/Seoul'),
  SCRAPE_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  SCRAPE_NAV_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  HEADLESS: boolish.default(true),
  STORAGE_STATE_PATH: z.string().min(1).default('./.session/storage-state.json'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Config = {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  portal: {
    configured: boolean
    url?: string
    id?: string
    password?: string
  }
  intervalSeconds: number
  timezone: string
  maxRetries: number
  navTimeoutMs: number
  headless: boolean
  storageStatePath: string
  logLevel: LogLevel
  runOnce: boolean
}

/** process.argv 에 --once 가 있으면 1회 실행 후 종료. */
function hasOnceFlag(argv: readonly string[]): boolean {
  return argv.includes('--once')
}

/**
 * 설정을 로딩/검증한다. 실패 시 Error 를 던진다(호출부에서 로깅 후 종료).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, argv: readonly string[] = process.argv): Config {
  const parsed = EnvSchema.safeParse(env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`환경 변수 검증 실패 — ${issues}`)
  }
  const e = parsed.data

  const supabaseUrl = e.SUPABASE_URL ?? e.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('환경 변수 검증 실패 — SUPABASE_URL(또는 NEXT_PUBLIC_SUPABASE_URL) 필수')
  }

  const portalConfigured = Boolean(e.ADMIN_PORTAL_URL && e.ADMIN_PORTAL_ID && e.ADMIN_PORTAL_PASSWORD)

  return {
    supabaseUrl,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
    portal: {
      configured: portalConfigured,
      url: e.ADMIN_PORTAL_URL,
      id: e.ADMIN_PORTAL_ID,
      password: e.ADMIN_PORTAL_PASSWORD,
    },
    intervalSeconds: e.SCRAPE_INTERVAL_SECONDS,
    timezone: e.SCRAPE_TIMEZONE,
    maxRetries: e.SCRAPE_MAX_RETRIES,
    navTimeoutMs: e.SCRAPE_NAV_TIMEOUT_MS,
    headless: e.HEADLESS,
    storageStatePath: e.STORAGE_STATE_PATH,
    logLevel: e.LOG_LEVEL,
    runOnce: hasOnceFlag(argv),
  }
}
