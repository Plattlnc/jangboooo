// 시안 목업 — 배달뉴스. 실데이터 연동 시 교체.

export interface NewsItem {
  tag: string;
  tagColor: string;
  title: string;
  meta: string;
}

export const NEWS_FEATURED = {
  badge: "HOT 이슈",
  title: "배달공제조합 보험료 인하… 라이더 부담 월 1.2만원 줄어든다",
  body: "2026년 하반기부터 적용되는 새 요율표가 공개됐다. 무사고 라이더 할인폭도 확대될 전망이다.",
  source: "라이더투데이",
  time: "2시간 전",
};

export const NEWS_LIST: NewsItem[] = [
  { tag: "정책", tagColor: "#4F6AF5", title: "서울시, 라이더 쉼터 30곳으로 확대… 무더위 대비", meta: "머니라이더 · 4시간 전" },
  { tag: "안전", tagColor: "#D9342B", title: "장마철 이륜차 사고 급증… 빗길 제동거리 2배 주의보", meta: "세이프로드 · 6시간 전" },
  { tag: "수익", tagColor: "#1E9E5A", title: "심야 프로모션 단가 인상, 이번 주말 적용 지역은?", meta: "배달경제 · 어제" },
  { tag: "장비", tagColor: "#E8590C", title: "여름용 통풍 헬멧 인기… 라이더 추천템 5선", meta: "기어리뷰 · 어제" },
];
