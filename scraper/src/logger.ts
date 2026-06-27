/**
 * 의존성 없는 구조화 로거(JSON lines → stdout). Railway 로그 수집과 호환.
 * 레벨: debug < info < warn < error. LOG_LEVEL 미만은 무시.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

export type Logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => void
  info: (msg: string, fields?: Record<string, unknown>) => void
  warn: (msg: string, fields?: Record<string, unknown>) => void
  error: (msg: string, fields?: Record<string, unknown>) => void
  child: (context: Record<string, unknown>) => Logger
}

/** Error 를 직렬화 가능한 평문으로 변환(스택 포함). */
export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack }
  }
  return { value: String(err) }
}

export function createLogger(level: LogLevel, base: Record<string, unknown> = {}): Logger {
  const threshold = ORDER[level]

  const emit = (lvl: LogLevel, msg: string, fields?: Record<string, unknown>): void => {
    if (ORDER[lvl] < threshold) return
    const line = {
      ts: new Date().toISOString(),
      level: lvl,
      msg,
      ...base,
      ...(fields ?? {}),
    }
    const out = JSON.stringify(line)
    if (lvl === 'error' || lvl === 'warn') process.stderr.write(out + '\n')
    else process.stdout.write(out + '\n')
  }

  return {
    debug: (msg, fields) => emit('debug', msg, fields),
    info: (msg, fields) => emit('info', msg, fields),
    warn: (msg, fields) => emit('warn', msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
    child: (context) => createLogger(level, { ...base, ...context }),
  }
}
