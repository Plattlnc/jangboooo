import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AcceptanceGauge } from "@/components/dashboard/acceptance-gauge";
import { StatCards } from "@/components/dashboard/stat-cards";

// QA 보완(06 개편): 게이지 밴드→색 클래스 매핑·클램프, 통계 천단위 표기.
// 기존 components.test.tsx 를 건드리지 않고 공백만 보강(테스트만, 프로덕션 무수정).

describe("AcceptanceGauge — 밴드별 색 클래스 (06 §D: ≥80/40–79/0–39)", () => {
  // 중앙 % 텍스트색 = 밴드색. 링 fill 과 동일 밴드 매핑이라 색 정확성의 대리 검증.
  it("≥80 → high-text 색", () => {
    render(<AcceptanceGauge rate={85} label="오늘 수락률" />);
    expect(screen.getByText("85%").className).toContain("text-gauge-high-text");
  });
  it("40–79 → mid-text 색", () => {
    render(<AcceptanceGauge rate={60} label="오늘 수락률" />);
    expect(screen.getByText("60%").className).toContain("text-gauge-mid-text");
  });
  it("0–39 → low-text 색", () => {
    render(<AcceptanceGauge rate={20} label="오늘 수락률" />);
    expect(screen.getByText("20%").className).toContain("text-gauge-low-text");
  });
  it("경계 80 은 high, 79 는 mid, 40 은 mid, 39 는 low", () => {
    render(
      <>
        <AcceptanceGauge rate={80} label="a" />
        <AcceptanceGauge rate={79} label="b" />
        <AcceptanceGauge rate={40} label="c" />
        <AcceptanceGauge rate={39} label="d" />
      </>,
    );
    expect(screen.getByText("80%").className).toContain("text-gauge-high-text");
    expect(screen.getByText("79%").className).toContain("text-gauge-mid-text");
    expect(screen.getByText("40%").className).toContain("text-gauge-mid-text");
    expect(screen.getByText("39%").className).toContain("text-gauge-low-text");
  });
});

describe("AcceptanceGauge — 입력 클램프(0~100)", () => {
  it("100 초과 입력은 100% 로 클램프(high)", () => {
    render(<AcceptanceGauge rate={120} label="오늘 수락률" />);
    const el = screen.getByText("100%");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-gauge-high-text");
  });
  it("음수 입력은 0% 로 클램프(low)", () => {
    render(<AcceptanceGauge rate={-5} label="오늘 수락률" />);
    const el = screen.getByText("0%");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("text-gauge-low-text");
  });
});

describe("StatCards — 천단위 구분 표기(ko-KR)", () => {
  it("네 자리 이상은 콤마 구분 + '건'", () => {
    render(<StatCards completed={1234} rejected={56} canceled={12345} />);
    expect(screen.getByText("1,234건")).toBeInTheDocument();
    expect(screen.getByText("56건")).toBeInTheDocument();
    expect(screen.getByText("12,345건")).toBeInTheDocument();
  });
});
