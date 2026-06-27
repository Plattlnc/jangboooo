/** 조건부 className 결합 (외부 의존성 없는 경량 헬퍼). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
