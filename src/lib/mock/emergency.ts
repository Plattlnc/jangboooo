// 시안 목업 — 긴급출동서비스. 실데이터 연동 시 교체.

export type EmergencyIcon = "tow" | "battery" | "tire" | "lock";
export interface EmergencyService {
  label: string;
  desc: string;
  icon: EmergencyIcon;
}
export interface EmergencyAgent {
  name: string;
  dist: string;
  eta: string;
  rating: string;
  open: boolean;
}

export const EMERGENCY_SERVICES: EmergencyService[] = [
  { label: "긴급 견인", desc: "사고·고장 차량 견인", icon: "tow" },
  { label: "배터리 충전", desc: "방전 시 현장 충전", icon: "battery" },
  { label: "타이어 교체", desc: "펑크·파손 즉시 대응", icon: "tire" },
  { label: "잠금 해제", desc: "키 분실·시동 불가", icon: "lock" },
];

export const EMERGENCY_AGENTS: EmergencyAgent[] = [
  { name: "강남 24시 출동대", dist: "1.2km", eta: "약 8분", rating: "4.9", open: true },
  { name: "역삼 라이더SOS", dist: "2.0km", eta: "약 12분", rating: "4.8", open: true },
  { name: "논현 긴급정비", dist: "2.6km", eta: "약 15분", rating: "4.7", open: false },
];
