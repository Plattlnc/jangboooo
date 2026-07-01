/**
 * 환경 변수 로딩 + 검증(zod). 잘못된/누락 설정은 부팅 시 즉시 실패.
 * service_role 키와 Supabase URL 은 필수.
 *
 * 소스 = 배민 deliverycenter. 인증은 ID/PW 가 아니라 **로그인 세션(storageState)**
 * 기반이라(SMS 2FA 때문에 무인 로그인 불가), 포털 자격증명 대신 ADMIN_PORTAL_URL +
 * 세션 파일만 필요하다. 세션은 로컬 캡처 스크립트로 만든다(scripts/capture-session.ts).
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

  // 배민 deliverycenter 베이스 URL. 데이터 화면 경로(/delivery/history)로 네비.
  ADMIN_PORTAL_URL: optionalNonEmpty,

  SCRAPE_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  SCRAPE_TIMEZONE: z.string().min(1).default('Asia/Seoul'),
  SCRAPE_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  // 자가치유: 같은 사이클이 N회 연속 실패하면 process.exit(1) → Railway 재시작 정책이
  // 새 컨테이너로 회복(브라우저/세션 등 누적 손상 상태를 깨끗이 리셋). 0 이면 비활성.
  SCRAPE_MAX_CONSECUTIVE_FAILURES: z.coerce.number().int().min(0).default(5),
  SCRAPE_NAV_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  // delivery-status 한 콜에 받을 행 수. size 크게 주면 1콜로 전체(서버 상한 시 페이지 루프).
  SCRAPE_PAGE_SIZE: z.coerce.number().int().positive().default(200),
  HEADLESS: boolish.default(true),
  STORAGE_STATE_PATH: z.string().min(1).default('./.session/storage-state.json'),
  // Railway 등 영속 FS 없는 환경용: 세션 JSON 을 base64 로 주입하면 부팅 시 파일로 복원.
  STORAGE_STATE_B64: optionalNonEmpty,
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  // 운영 금지. true 면 배민 미접속·mock 파서로 적재 파이프라인만 검증.
  SCRAPE_MOCK: boolish.default(false),

  // ── 달성현황(beta) = 구글 Looker Studio 임베드 리포트 (best-effort) ──
  // 배민 세션과 별개의 "구글 로그인 세션"이 필요. storageState 패턴은 배민과 동일.
  // 셋 다(또는 B64) 없으면 공동목표 수집은 스킵(배달현황 수집엔 영향 없음).
  GOAL_REPORT_URL: optionalNonEmpty, // 미설정 시 DEFAULT_GOAL_REPORT_URL 사용
  GOOGLE_STORAGE_STATE_PATH: z.string().min(1).default('./.session/google-state.json'),
  GOOGLE_STORAGE_STATE_B64: optionalNonEmpty,

  // ── Residential/mobile 프록시 (배민 브라우저 egress) ──
  // 배민 WAF 가 데이터센터 IP(클라우드)를 차단 → 클라우드 24/7 운영 시 가정용 IP 프록시로 우회.
  // 예: PROXY_SERVER=http://gate.provider.com:8000 (+ 사용자/비번). 미설정이면 프록시 없이 직결(로컬/가정 IP 용).
  PROXY_SERVER: optionalNonEmpty,
  PROXY_USERNAME: optionalNonEmpty,
  PROXY_PASSWORD: optionalNonEmpty,
})

/** 달성현황(beta) Looker 임베드 리포트 기본 URL (리포트 ID 는 공개 임베드 식별자, 시크릿 아님). */
export const DEFAULT_GOAL_REPORT_URL =
  'https://lookerstudio.google.com/embed/reporting/8e0baa56-bce8-4ba4-90b1-6bab8ecce149/page/p_7259p9pbyd'

export type Config = {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  portal: {
    /** ADMIN_PORTAL_URL 설정 여부. 미설정이면 골격 모드(수집 스킵). */
    configured: boolean
    url?: string
  }
  intervalSeconds: number
  timezone: string
  maxRetries: number
  /** 연속 실패 임계치. 도달 시 워커가 exit(1)로 자가치유(0=비활성). */
  maxConsecutiveFailures: number
  navTimeoutMs: number
  pageSize: number
  headless: boolean
  storageStatePath: string
  storageStateB64?: string
  /** 배민 브라우저 egress 프록시(가정용 IP). 미설정이면 직결. Playwright launch proxy 로 주입. */
  proxy?: { server: string; username?: string; password?: string }
  /** 공동목표(달성현황 beta) 수집 설정. configured=false 면 스킵. */
  goals: {
    configured: boolean
    reportUrl: string
    googleStorageStatePath: string
    googleStorageStateB64?: string
  }
  logLevel: LogLevel
  runOnce: boolean
  mock: boolean
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

  return {
    supabaseUrl,
    supabaseServiceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
    portal: {
      configured: Boolean(e.ADMIN_PORTAL_URL),
      url: e.ADMIN_PORTAL_URL,
    },
    intervalSeconds: e.SCRAPE_INTERVAL_SECONDS,
    timezone: e.SCRAPE_TIMEZONE,
    maxRetries: e.SCRAPE_MAX_RETRIES,
    maxConsecutiveFailures: e.SCRAPE_MAX_CONSECUTIVE_FAILURES,
    navTimeoutMs: e.SCRAPE_NAV_TIMEOUT_MS,
    pageSize: e.SCRAPE_PAGE_SIZE,
    headless: e.HEADLESS,
    storageStatePath: e.STORAGE_STATE_PATH,
    storageStateB64: e.STORAGE_STATE_B64,
    proxy: e.PROXY_SERVER
      ? { server: e.PROXY_SERVER, username: e.PROXY_USERNAME, password: e.PROXY_PASSWORD }
      : undefined,
    goals: {
      // 구글 세션(B64)이 주입돼야 수집 시도(운영=Railway). 미설정이면 스킵(best-effort).
      // 로컬은 capture 스크립트가 만든 파일을 B64 로 주입해 검증.
      configured: Boolean(e.GOOGLE_STORAGE_STATE_B64),
      reportUrl: e.GOAL_REPORT_URL ?? DEFAULT_GOAL_REPORT_URL,
      googleStorageStatePath: e.GOOGLE_STORAGE_STATE_PATH,
      googleStorageStateB64: e.GOOGLE_STORAGE_STATE_B64,
    },
    logLevel: e.LOG_LEVEL,
    runOnce: hasOnceFlag(argv),
    mock: e.SCRAPE_MOCK,
  }
}
