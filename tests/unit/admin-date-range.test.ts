import { describe, it, expect } from "vitest";
import { addDaysIso, clampCustomRange, isValidIsoDate } from "@/lib/admin/date-range";

// 커스텀 기간 클램프 — 최대 7일 포함 + 당일(영업일) 선택 불가 규칙.

const TODAY = "2026-07-20"; // 영업일 가정

describe("isValidIsoDate / addDaysIso", () => {
  it("형식·실존 날짜 검증", () => {
    expect(isValidIsoDate("2026-07-19")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-7-19")).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
    expect(isValidIsoDate(["2026-07-19"])).toBe(false);
  });

  it("월 경계 날짜 산술", () => {
    expect(addDaysIso("2026-07-01", -1)).toBe("2026-06-30");
    expect(addDaysIso("2026-07-19", 1)).toBe("2026-07-20");
  });
});

describe("clampCustomRange — 기본 규칙(스팬 7일)", () => {
  it("둘 다 미지정 → null(커스텀 미사용)", () => {
    expect(clampCustomRange(undefined, undefined, TODAY)).toBeNull();
    expect(clampCustomRange("garbage", "2026-13-99", TODAY)).toBeNull();
  });

  it("정상 범위는 그대로", () => {
    expect(clampCustomRange("2026-07-13", "2026-07-19", TODAY)).toEqual({
      start_date: "2026-07-13",
      end_date: "2026-07-19",
    });
  });

  it("한쪽만 지정 → 단일일 범위", () => {
    expect(clampCustomRange("2026-07-15", undefined, TODAY)).toEqual({
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    });
    expect(clampCustomRange(undefined, "2026-07-15", TODAY)).toEqual({
      start_date: "2026-07-15",
      end_date: "2026-07-15",
    });
  });

  it("역순 입력은 스왑", () => {
    expect(clampCustomRange("2026-07-19", "2026-07-15", TODAY)).toEqual({
      start_date: "2026-07-15",
      end_date: "2026-07-19",
    });
  });

  it("당일/미래 마감은 어제로 클램프", () => {
    expect(clampCustomRange("2026-07-18", TODAY, TODAY)).toEqual({
      start_date: "2026-07-18",
      end_date: "2026-07-19",
    });
    expect(clampCustomRange("2026-07-18", "2026-08-01", TODAY)?.end_date).toBe("2026-07-19");
  });

  it("당일 단일 선택 → 어제 단일로 클램프(결과 없음 방지)", () => {
    expect(clampCustomRange(TODAY, TODAY, TODAY)).toEqual({
      start_date: "2026-07-19",
      end_date: "2026-07-19",
    });
  });

  it("7일 초과 스팬은 시작일을 당겨 7일로", () => {
    expect(clampCustomRange("2026-07-01", "2026-07-19", TODAY)).toEqual({
      start_date: "2026-07-13", // 19 포함 7일
      end_date: "2026-07-19",
    });
  });

  it("정확히 7일은 허용", () => {
    const r = clampCustomRange("2026-07-13", "2026-07-19", TODAY);
    expect(r).toEqual({ start_date: "2026-07-13", end_date: "2026-07-19" });
  });
});

describe("clampCustomRange — 스팬 무제한(공동목표 이력)", () => {
  it("maxSpanDays=null 이면 장기 범위 유지 + 당일 제외만 적용", () => {
    expect(clampCustomRange("2026-06-01", TODAY, TODAY, null)).toEqual({
      start_date: "2026-06-01",
      end_date: "2026-07-19",
    });
  });
});
