// 시안 목업 — ROADING 교통사고 접수 4단계 위저드. 실데이터 연동 시 교체.

export interface VerifyItem {
  label: string;
  detail: string;
  status: string;
}

export const ROADING_TITLES = ["현장 사진 촬영", "데이터 검증", "신뢰 점수 산출", "자동 접수"];

export const ROADING_DESCS = [
  "사고 현장을 네 방향에서 촬영해 주세요. 차량 손상, 번호판, 도로 상황이 선명하게 보여야 해요.",
  "AI가 촬영본의 메타데이터와 위치·시간을 대조해 현장 데이터를 검증하고 있어요.",
  "검증된 데이터로 접수 신뢰 점수를 산출했어요. 점수가 높을수록 빠른 처리가 가능해요.",
  "모든 데이터가 준비됐어요. 배달공제조합으로 사고를 자동 접수합니다.",
];

export const ROADING_BTNS = ["촬영 완료 · 다음", "검증 확인", "접수 진행", "접수 완료"];

export const PHOTO_SLOTS = ["전면 손상", "후면 번호판", "측면 전체", "도로 상황"];

export const VERIFY_ITEMS: VerifyItem[] = [
  { label: "촬영 위치 일치", detail: "GPS 좌표 · 신고 위치 동일", status: "확인" },
  { label: "촬영 시각 검증", detail: "4장 모두 5분 이내 촬영", status: "확인" },
  { label: "이미지 무결성", detail: "원본 메타데이터 보존됨", status: "확인" },
  { label: "손상 부위 인식", detail: "AI 분석 · 전면 범퍼 파손", status: "확인" },
];

export const TRUST_SCORE = 94;
