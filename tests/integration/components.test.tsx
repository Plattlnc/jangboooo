import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AcceptanceGauge } from "@/components/dashboard/acceptance-gauge";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PeakCard } from "@/components/dashboard/peak-card";
import { aggregatePeakBuckets } from "@/app/(rider)/_lib/metrics";

// 대시보드 개편(06) 컴포넌트 상태 렌더. matchMedia=reduce(setup) → 애니메이션 즉시 최종값.

describe("AcceptanceGauge — 수락률 게이지", () => {
  it("정수 수락률 + 라벨이 중앙/aria 에 노출", () => {
    render(<AcceptanceGauge rate={85} label="오늘 수락률" />);
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByLabelText("오늘 수락률 85%")).toBeInTheDocument();
  });

  it("소수 수락률은 1자리 표기", () => {
    render(<AcceptanceGauge rate={85.3} label="이번 주 수락률" />);
    expect(screen.getByText("85.3%")).toBeInTheDocument();
  });

  it("미수집(rate=null)이면 중앙 '—'", () => {
    render(<AcceptanceGauge rate={null} label="오늘 수락률" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("보조 문구(note) 렌더", () => {
    render(<AcceptanceGauge rate={95} label="오늘 수락률" note="콜을 잘 잡고 있어요" />);
    expect(screen.getByText("콜을 잘 잡고 있어요")).toBeInTheDocument();
  });
});

describe("StatCards — 완료/거절/취소", () => {
  it("세 라벨 + 'N건' 값", () => {
    render(<StatCards completed={27} rejected={3} canceled={1} />);
    expect(screen.getByText("완료")).toBeInTheDocument();
    expect(screen.getByText("거절")).toBeInTheDocument();
    expect(screen.getByText("취소")).toBeInTheDocument();
    expect(screen.getByText("27건")).toBeInTheDocument();
    expect(screen.getByText("3건")).toBeInTheDocument();
    expect(screen.getByText("1건")).toBeInTheDocument();
  });

  it("0 은 유효값('0건'), null 은 '—'", () => {
    render(<StatCards completed={0} rejected={null} canceled={0} />);
    expect(screen.getAllByText("0건")).toHaveLength(2);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("PeakCard — 피크타임 4버킷", () => {
  it("4버킷 라벨 + 건수 렌더", () => {
    const buckets = aggregatePeakBuckets([
      { hour: 12, completed: 14 },
      { hour: 18, completed: 11 },
    ]);
    render(<PeakCard buckets={buckets} />);
    expect(screen.getByText("피크타임 완료 현황")).toBeInTheDocument();
    expect(screen.getByText("아침·점심 피크")).toBeInTheDocument();
    expect(screen.getByText("저녁 피크")).toBeInTheDocument();
    expect(screen.getByText("14건")).toBeInTheDocument();
    expect(screen.getByText("11건")).toBeInTheDocument();
  });
});

// PeriodTabs 는 next/navigation 훅에 의존 → 모킹.
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(""),
}));

describe("PeriodTabs — 기간 탭(개편 onPrimary)", () => {
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
