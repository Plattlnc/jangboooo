// 시안 목업 — 정산 내역. 실데이터 연동 시 교체.

export interface SettleRecord {
  date: string;
  period: string;
  count: number;
  amount: string;
  status: string;
  /** 상태 텍스트 색 */
  sc: string;
  /** 상태 배경 색 */
  sb: string;
}

export const SETTLE_MONTH_TOTAL = "2,184,600";
export const SETTLE_MONTH_NOTE = "총 배달 312건 · 정산 4회";

export const SETTLE_LIST: SettleRecord[] = [
  { date: "06.27", period: "06.21 ~ 06.27", count: 47, amount: "150,400", status: "정산예정", sc: "#E8590C", sb: "#fdf0e6" },
  { date: "06.20", period: "06.14 ~ 06.20", count: 58, amount: "185,600", status: "입금완료", sc: "#1E9E5A", sb: "#e7f5ee" },
  { date: "06.13", period: "06.07 ~ 06.13", count: 61, amount: "195,200", status: "입금완료", sc: "#1E9E5A", sb: "#e7f5ee" },
  { date: "06.06", period: "05.31 ~ 06.06", count: 54, amount: "172,800", status: "입금완료", sc: "#1E9E5A", sb: "#e7f5ee" },
];
