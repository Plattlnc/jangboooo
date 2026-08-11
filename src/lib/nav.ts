import {
  User,
  CalendarCheck,
  CalendarDays,
  TriangleAlert,
  ClipboardList,
  Bike,
  Wrench,
  Trophy,
  Medal,
  Gift,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

// 시안(배달 장부) 드로어 네비게이션 — 단일 진실 소스.
// 각 화면 = (rider) 그룹의 실제 라우트. 활성표시는 usePathname 으로 판정.
// 타일 색은 시안 목업 그대로(브랜드 멀티컬러).
//
// 2026-07-27 확정 구성: 내 정보 · 사고접수 · 접수 내역 · 리스렌탈 · 정비소.
// 2026-07-31 추가: 커뮤니티 > 랭킹(기간별 완료건 순위) · 배달일지(일별 완료 기록).
// 2026-07-31 제거: 일차감 관리 · 정산 내역(돈 관련 보류 — 라우트는 존치, 드로어만 제외).
// 제거: 홈(로고 클릭으로 진입) / 긴급출동 / 라이더 용품 / 배달뉴스.
// 리스·렌탈/정비소는 탭 유지 + 화면은 더미 데이터 없는 준비중 상태(목데이터 삭제됨).

/** 랭킹 잠금 플래그(2026-07-31 사용자 지시) — 해제 시 false 로만 바꾸면 드로어·/ranking 동시 오픈. */
export const RANKING_LOCKED = true;

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 아이콘 타일 글자색 (시안 원색) */
  tileColor: string;
  /** 아이콘 타일 배경 (시안 틴트) */
  tileBg: string;
  /** 잠금 — 드로어에서 터치 시 이동 대신 "현재 잠겨있습니다" 안내. */
  locked?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "내 정보 · 활동",
    items: [
      { label: "내 정보", href: "/myinfo", icon: User, tileColor: "#4F6AF5", tileBg: "#eef1fe" },
      { label: "배달일지", href: "/diary", icon: CalendarCheck, tileColor: "#1E9E5A", tileBg: "#e7f5ee" },
    ],
  },
  {
    title: "프로모션",
    items: [
      { label: "배달등급", href: "/grade", icon: Medal, tileColor: "#B8860B", tileBg: "#fbf3dd" },
      { label: "출석체크", href: "/attendance", icon: CalendarDays, tileColor: "#0EA5A5", tileBg: "#e3f6f6" },
      { label: "프로모션", href: "/promo", icon: Gift, tileColor: "#E8590C", tileBg: "#fdf0e6" },
    ],
  },
  {
    title: "커뮤니티",
    items: [
      { label: "공지사항", href: "/notice", icon: Megaphone, tileColor: "#4F6AF5", tileBg: "#eef1fe" },
      { label: "랭킹", href: "/ranking", icon: Trophy, tileColor: "#B8860B", tileBg: "#fbf3dd", locked: RANKING_LOCKED },
    ],
  },
  {
    title: "안전 · 긴급",
    items: [
      { label: "교통사고접수", href: "/roading", icon: TriangleAlert, tileColor: "#FF3B5C", tileBg: "#ffecef" },
      { label: "접수 내역", href: "/roading/history", icon: ClipboardList, tileColor: "#4F6AF5", tileBg: "#eef1fe" },
    ],
  },
  {
    title: "라이더 혜택",
    items: [
      { label: "리스 · 렌탈", href: "/lease", icon: Bike, tileColor: "#E8590C", tileBg: "#fdf0e6" },
      { label: "내 주변 정비소", href: "/repair", icon: Wrench, tileColor: "#5b6660", tileBg: "#eef0f3" },
    ],
  },
];
