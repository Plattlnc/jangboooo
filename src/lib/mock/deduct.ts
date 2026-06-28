// 시안 목업 — 일차감 관리. 실데이터 연동 시 교체.

export interface DeductItem {
  label: string;
  sub: string;
  amount: string;
  color: string;
}
export interface DeductRecord {
  date: string;
  amount: string;
}

export const DEDUCT_TOTAL = "21,200";
export const DEDUCT_AVAILABLE = "₩182,400";

export const DEDUCT_ITEMS: DeductItem[] = [
  { label: "리스료", sub: "스피드모터스 · PCX125", amount: "5,300", color: "#E8590C" },
  { label: "책임보험료", sub: "배달공제조합", amount: "9,800", color: "#4F6AF5" },
  { label: "단말기 사용료", sub: "배차 단말 렌탈", amount: "1,600", color: "#0EA5A5" },
  { label: "협회비", sub: "지역 협력사", amount: "4,500", color: "#5b6660" },
];

export const DEDUCT_RECENT: DeductRecord[] = [
  { date: "06.27 (금)", amount: "21,200" },
  { date: "06.26 (목)", amount: "21,200" },
  { date: "06.25 (수)", amount: "21,200" },
  { date: "06.24 (화)", amount: "19,600" },
  { date: "06.23 (월)", amount: "21,200" },
];
