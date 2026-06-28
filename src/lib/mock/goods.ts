// 시안 목업 — 라이더 용품. 실데이터 연동 시 교체.

export interface GoodsItem {
  name: string;
  price: string;
  discount: string;
  rating: string;
  reviews: string;
  badge: string;
}

export const GOODS_CATS = ["전체", "배달가방", "헬멧·보호구", "우천용품", "거치대", "방한용품"];

export const GOODS_ITEMS: GoodsItem[] = [
  { name: "대용량 보온 배달가방 45L", price: "38,000원", discount: "24%", rating: "4.8", reviews: "1,204", badge: "BEST" },
  { name: "풀페이스 통풍 헬멧", price: "89,000원", discount: "15%", rating: "4.9", reviews: "882", badge: "" },
  { name: "방수 핸드폰 거치대", price: "19,900원", discount: "30%", rating: "4.7", reviews: "2,310", badge: "BEST" },
  { name: "3중 방수 라이더 우비", price: "27,000원", discount: "20%", rating: "4.6", reviews: "640", badge: "" },
  { name: "논슬립 라이더 장갑", price: "14,500원", discount: "10%", rating: "4.5", reviews: "415", badge: "" },
  { name: "LED 안전 후미등", price: "12,000원", discount: "35%", rating: "4.8", reviews: "1,876", badge: "BEST" },
];
