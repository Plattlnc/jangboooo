import { describe, it, expect } from "vitest";
// period 유틸의 정식 위치는 _lib/metrics(클라이언트 안전). getDashboardData 는 queries 잔류.
// (queries 도 metrics 에서 하위호환 re-export 하므로 양쪽 import 모두 동작)
import { SLA_PERIODS, isSlaPeriod, parsePeriod } from "@/app/(rider)/_lib/metrics";
import { getDashboardData } from "@/app/(rider)/_lib/queries";

// 프론트 데이터 레이어(PROVISIONAL 목). period 정규화 + 목 응답 형태 고정.

describe("isSlaPeriod / parsePeriod — period 정규화", () => {
  it("SLA_PERIODS 는 today/week/month", () => {
    expect([...SLA_PERIODS]).toEqual(["today", "week", "month"]);
  });

  it("isSlaPeriod: 유효값만 true", () => {
    expect(isSlaPeriod("week")).toBe(true);
    expect(isSlaPeriod("year")).toBe(false);
    expect(isSlaPeriod(123)).toBe(false);
    expect(isSlaPeriod(undefined)).toBe(false);
  });

  it("parsePeriod: 유효값 통과", () => {
    expect(parsePeriod("month")).toBe("month");
  });

  it("parsePeriod: 배열이면 첫 요소 사용", () => {
    expect(parsePeriod(["week", "month"])).toBe("week");
  });

  it("parsePeriod: 무효/누락이면 today 기본값", () => {
    expect(parsePeriod("bogus")).toBe("today");
    expect(parsePeriod(undefined)).toBe("today");
    expect(parsePeriod([])).toBe("today");
  });
});

describe("getDashboardData — 목 응답 형태", () => {
  it("각 기간마다 summary/previous/hourly 를 반환", async () => {
    for (const period of SLA_PERIODS) {
      const data = await getDashboardData(period);
      expect(data.summary.period).toBe(period);
      expect(data.previous).not.toBeNull();
      expect(data.hourly).toHaveLength(24);
    }
  });

  it("hourly 는 0~23시 전 구간을 순서대로 채운다", async () => {
    const { hourly } = await getDashboardData("today");
    expect(hourly.map((h) => h.hour)).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(hourly.every((h) => h.completed >= 0)).toBe(true);
  });

  it("week/month 는 today 보다 누적 완료 건수가 크다(스케일 반영)", async () => {
    const today = await getDashboardData("today");
    const week = await getDashboardData("week");
    const sumToday = today.hourly.reduce((a, h) => a + h.completed, 0);
    const sumWeek = week.hourly.reduce((a, h) => a + h.completed, 0);
    expect(sumWeek).toBeGreaterThan(sumToday);
  });

  it("목 데이터의 acceptance_rate/sla_score 는 0~100 스케일(backend 계약 일치)", async () => {
    const { summary } = await getDashboardData("week");
    expect(summary.acceptance_rate).toBeGreaterThan(1);
    expect(summary.acceptance_rate).toBeLessThanOrEqual(100);
    expect(summary.sla_score).toBeLessThanOrEqual(100);
  });
});
