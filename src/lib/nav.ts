import {
  ReceiptText,
  Wallet,
  Bike,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// 시안(배달 장부) 드로어 네비게이션 — 단일 진실 소스.
// 각 화면 = (rider) 그룹의 실제 라우트. 활성표시는 usePathname 으로 판정.
// 타일 색은 시안 목업 그대로(브랜드 멀티컬러).
//
// 2026-07-27 슬림화: 일차감 관리 · 정산 내역 · 리스 렌탈 · 내 주변 정비소만 유지.
// 제거된 진입점의 대체 경로 — 홈: 로고 클릭 / 사고접수: AppBar 우측 pill /
// 내 정보: 드로어 프로필 카드 클릭(menu-drawer). 라우트 자체는 전부 살아있음.

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
    title: "정산",
    items: [
      { label: "일차감 관리", href: "/deduct", icon: ReceiptText, tileColor: "#E8590C", tileBg: "#fdf0e6" },
      { label: "정산 내역", href: "/settle", icon: Wallet, tileColor: "#1E9E5A", tileBg: "#e7f5ee" },
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
