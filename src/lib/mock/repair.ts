// 시안 목업 — 내 주변 정비소. 실데이터 연동 시 교체.

export interface RepairShop {
  name: string;
  rating: number;
  spec: string;
  dist: string;
  time: string;
  open: string;
  openColor: string;
  openBg: string;
}

export const REPAIR_SHOPS: RepairShop[] = [
  { name: "역삼 모터웍스", rating: 4.9, spec: "이륜차 전문", dist: "320m", time: "도보 4분", open: "영업중", openColor: "#1E9E5A", openBg: "#e7f5ee" },
  { name: "스피드 정비센터", rating: 4.7, spec: "타이어·엔진", dist: "680m", time: "도보 9분", open: "영업중", openColor: "#1E9E5A", openBg: "#e7f5ee" },
  { name: "강남 바이크샵", rating: 4.5, spec: "전기이륜 가능", dist: "1.1km", time: "차량 5분", open: "곧 마감", openColor: "#E8590C", openBg: "#fdf0e6" },
  { name: "24시 라이더정비", rating: 4.6, spec: "24시간 운영", dist: "1.4km", time: "차량 7분", open: "영업중", openColor: "#1E9E5A", openBg: "#e7f5ee" },
];
