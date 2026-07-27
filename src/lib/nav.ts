import {
  User,
  ReceiptText,
  Wallet,
  TriangleAlert,
  ClipboardList,
  Bike,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// 시안(배달 장부) 드로어 네비게이션 — 단일 진실 소스.
// 각 화면 = (rider) 그룹의 실제 라우트. 활성표시는 usePathname 으로 판정.
// 타일 색은 시안 목업 그대로(브랜드 멀티컬러).
//
// 2026-07-27 확정 구성: 내 정보 · 일차감 · 정산 · 사고접수 · 접수 내역 · 리스렌탈 · 정비소.
// 제거: 홈(로고 클릭으로 진입) / 긴급출동 / 라이더 용품 / 배달뉴스.
// 리스·렌탈/정비소는 탭 유지 + 화면은 더미 데이터 없는 준비중 상태(목데이터 삭제됨).

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 아이콘 타일 글자색 (시안 원색) */
  tileColor: string;
  /** 아이콘 타일 배경 (시안 틴트) */
  tileBg: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "정산 · 내 정보",
    items: [
      { label: "내 정보", href: "/myinfo", icon: User, tileColor: "#4F6AF5", tileBg: "#eef1fe" },
      { label: "일차감 관리", href: "/deduct", icon: ReceiptText, tileColor: "#E8590C", tileBg: "#fdf0e6" },
      { label: "정산 내역", href: "/settle", icon: Wallet, tileColor: "#1E9E5A", tileBg: "#e7f5ee" },
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
