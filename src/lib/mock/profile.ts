// 시안 목업 — 라이더 프로필/캐시. 실데이터 연동 시 이 모듈을 교체.
// (Supabase 연동 지점: backend queries → 동일 형태로 매핑)

export interface RiderProfile {
  name: string;
  initial: string;
  uid: string;
  phone: string;
  grade: string;
  status: "운행중" | "휴식" | "오프";
}

export const MOCK_PROFILE: RiderProfile = {
  name: "김태성",
  initial: "태",
  uid: "1075622667",
  phone: "010-8504-2666",
  grade: "GOLD",
  status: "운행중",
};

/** 출금 가능 캐시(원) */
export const MOCK_CASH = 182400;
