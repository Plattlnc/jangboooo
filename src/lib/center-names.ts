/**
 * 센터 코드 → 표시 명칭.
 * riders.center_id 는 배민 delivery-status 의 center-id 헤더값(코드)이라 그대로 노출하지 않는다.
 * 명칭 소스가 갈림: Looker(달성현황)는 "표준인천서B", 운영 확인값은 "인천서구8B" — 운영 확인값 우선.
 * 신규 센터는 여기에 추가.
 */
const CENTER_NAMES: Record<string, string> = {
  DP2504250236: "인천서구8B",
};

/** 센터 코드 → 명칭 (미등록 코드는 코드 그대로 반환). */
export function centerDisplayName(centerId: string | null): string | null {
  if (!centerId) return null;
  return CENTER_NAMES[centerId] ?? centerId;
}
