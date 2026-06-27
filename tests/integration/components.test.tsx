import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SlaScore } from "@/components/dashboard/sla-score";
import { StatCard } from "@/components/dashboard/stat-card";

// 컴포넌트 상태 렌더(빈/유효/델타/에러). matchMedia=reduce(setup) → 카운트업 즉시 최종값.

describe("SlaScore — 메인 점수 렌더", () => {
  it("빈 상태: score=null 이면 기록 없음 EmptyState", () => {
    render(<SlaScore score={null} periodLabel="오늘" />);
    expect(screen.getByText("아직 오늘 기록이 없어요")).toBeInTheDocument();
  });

  it("우수(≥90): 점수 + 등급 배지 + aria-label", () => {
    render(<SlaScore score={92} periodLabel="이번 주" />);
    expect(screen.getByText("92")).toBeInTheDocument();
    expect(screen.getByText("우수")).toBeInTheDocument();
    expect(screen.getByLabelText("SLA 점수 92점, 우수")).toBeInTheDocument();
  });

  it("위험(<70): 등급 배지 위험", () => {
    render(<SlaScore score={55} periodLabel="이번 달" />);
    expect(screen.getByText("위험")).toBeInTheDocument();
  });
});

describe("StatCard — 지표 카드 상태", () => {
  it("미수집(value=null): '—' + '데이터 없음'", () => {
    render(<StatCard label="완료" value={null} unit="건" />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("데이터 없음")).toBeInTheDocument();
  });

  it("0 은 유효값 → '—' 아님", () => {
    render(<StatCard label="거절" value={0} unit="건" />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("긍정지표 증가 델타 → success 배지(절댓값+단위)", () => {
    render(<StatCard label="완료" value={124} unit="건" delta={6} good="up" />);
    expect(screen.getByText("124")).toBeInTheDocument();
    expect(screen.getByText("6건")).toBeInTheDocument();
  });

  it("델타 0 → '비슷해요'", () => {
    render(<StatCard label="완료" value={10} unit="건" delta={0} good="up" />);
    expect(screen.getByText("비슷해요")).toBeInTheDocument();
  });

  it("note 가 있으면 델타 대신 note 표시", () => {
    render(<StatCard label="수락률" value={92} unit="%" delta={3} note="수락률 92%" />);
    expect(screen.getByText("수락률 92%")).toBeInTheDocument();
  });

  it("valueStatus 가 값 색을 지정(success → text-success)", () => {
    render(<StatCard label="수락률" value={92} unit="%" valueStatus="success" />);
    expect(screen.getByText("92")).toHaveClass("text-success");
  });
});

// PeriodTabs 는 next/navigation 훅에 의존 → 모킹.
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(""),
}));

describe("PeriodTabs — 기간 탭", () => {
  beforeEach(() => replace.mockClear());

  it("3개 탭 렌더 + active 탭 aria-selected", async () => {
    const { PeriodTabs } = await import("@/components/dashboard/period-tabs");
    render(<PeriodTabs active="today" />);
    expect(screen.getByRole("tab", { name: "오늘" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "이번 주" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "이번 달" })).toBeInTheDocument();
  });

  it("다른 탭 클릭 → router.replace 에 period 쿼리 반영", async () => {
    const { PeriodTabs } = await import("@/components/dashboard/period-tabs");
    render(<PeriodTabs active="today" />);
    fireEvent.click(screen.getByRole("tab", { name: "이번 주" }));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toContain("period=week");
  });

  it("같은 탭 재클릭이면 네비게이션 없음", async () => {
    const { PeriodTabs } = await import("@/components/dashboard/period-tabs");
    render(<PeriodTabs active="today" />);
    fireEvent.click(screen.getByRole("tab", { name: "오늘" }));
    expect(replace).not.toHaveBeenCalled();
  });
});

// PhoneVerifyForm/LoginFlow/KakaoLoginButton 테스트는 #20(카카오/SMS 인증 → 라이더ID+비번 로그인 전환)으로
// 컴포넌트가 삭제되어 제거함. 신규 RiderLoginForm 테스트는 backend signInRider 계약(#19) 확정 후 작성 예정:
//   (a) 형식검증(ID 공백 / 비번 4자리 아님)  (b) signInRider 결과분기(RIDER_NOT_FOUND·INVALID_PASSWORD→인라인 / ok→/dashboard)
