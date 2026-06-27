/**
 * NEXT_PUBLIC_DEMO_MODE === "true" 일 때 활성화되는 프로덕션-세이프 데모 우회.
 * 로그인/카카오 미연동 상태에서도 대시보드를 목 데이터로 보여주기 위한 플래그.
 *
 * - 기본 off(미설정 시 기존 동작 그대로).
 * - NEXT_PUBLIC_ 접두사라 빌드타임에 인라인 → middleware(edge)/server/client 전 컨텍스트 동일.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
