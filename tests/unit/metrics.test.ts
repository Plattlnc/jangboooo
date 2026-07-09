import { describe, it, expect } from "vitest";
import {
  parsePeriod,
  isSlaPeriod,
  gaugeBand,
  gaugeNote,
  formatUpdatedAt,
  liveStatus,
  formatDashboardDate,
  PERIOD_LABEL,
  GAUGE_LABEL,
} from "@/app/(rider)/_lib/metrics";

// 대시보드 개편(06) 지표 변환. SLA 점수 제거 → 수락률 게이지/피크 버킷/날짜 표기 SSOT 고정.

describe("parsePeriod / isSlaPeriod", () => {
  it("유효 값은 통과, 그 외/배열/undefined 는 today 로 정규화", () => {
    expect(parsePeriod("week")).toBe("week");
    expect(parsePeriod(["month"])).toBe("month");
    expect(parsePeriod("bogus")).toBe("today");
    expect(parsePeriod(undefined)).toBe("today");
  });
  it("isSlaPeriod 타입가드", () => {
    expect(isSlaPeriod("today")).toBe(true);
    expect(isSlaPeriod("year")).toBe(false);
    expect(isSlaPeriod(3)).toBe(false);
  });
});

describe("gaugeBand — 수락률 밴드 (≥80 high / 40–79 mid / 0–39 low)", () => {
  it("경계값", () => {
    expect(gaugeBand(80)).toBe("high");
    expect(gaugeBand(79)).toBe("mid");
    expect(gaugeBand(40)).toBe("mid");
    expect(gaugeBand(39)).toBe("low");
  });
  it("극단: 100 high, 0 low", () => {
    expect(gaugeBand(100)).toBe("high");
    expect(gaugeBand(0)).toBe("low");
  });
});

describe("gaugeNote — 게이지 보조 문구 (조건부)", () => {
  it("≥90 칭찬 / 70–89 생략(null) / <70 기간별 안내 / null 입력 null", () => {
    expect(gaugeNote(95, "today")).toBe("콜을 잘 잡고 있어요");
    expect(gaugeNote(85, "today")).toBeNull();
    expect(gaugeNote(60, "week")).toBe("이번 주엔 조금 낮아요");
    expect(gaugeNote(60, "today")).toBe("오늘엔 조금 낮아요");
    expect(gaugeNote(null, "today")).toBeNull();
  });
});

// aggregatePeakBuckets(시간 경계 추정 집계)는 배민 원본 버킷값(sla_snapshots.peak_*)으로
// 대체되어 제거 — 피크 매핑 검증은 home-view 테스트에서 수행.

describe("formatUpdatedAt — 신선도 표기 + stale(>3분)", () => {
  it("null 이면 정보 없음 + stale", () => {
    expect(formatUpdatedAt(null)).toEqual({ text: "업데이트 정보 없음", stale: true });
  });
  it("0분 이하면 '방금', not stale", () => {
    const now = Date.parse("2026-06-28T09:00:00Z");
    expect(formatUpdatedAt("2026-06-28T09:00:30Z", now)).toEqual({
      text: "방금 업데이트됨",
      stale: false,
    });
  });
  it("경계: 3분 전은 not stale, 4분 전은 stale", () => {
    const now = Date.parse("2026-06-28T09:00:00Z");
    expect(formatUpdatedAt("2026-06-28T08:57:00Z", now).stale).toBe(false);
    expect(formatUpdatedAt("2026-06-28T08:56:00Z", now).stale).toBe(true);
  });
});

describe("liveStatus — 헤더 인디케이터 문구/톤", () => {
  it("정상(not stale) / 지연(stale)", () => {
    expect(liveStatus(false)).toEqual({ label: "실시간 업데이트 중", tone: "live" });
    expect(liveStatus(true)).toEqual({ label: "갱신이 조금 늦어지고 있어요", tone: "muted" });
  });
});

describe("formatDashboardDate — YY년 M월 D일 (요일) 오전/오후 h:mm", () => {
  it("오후 시각(UTC 고정)", () => {
    const d = new Date("2026-06-28T14:08:00Z"); // 일요일
    expect(formatDashboardDate(d, "UTC")).toBe("26년 6월 28일 (일) 오후 2:08");
  });
  it("오전 시각 + 분 2자리", () => {
    const d = new Date("2026-06-28T01:05:00Z");
    expect(formatDashboardDate(d, "UTC")).toBe("26년 6월 28일 (일) 오전 1:05");
  });
});

describe("라벨 상수", () => {
  it("PERIOD_LABEL / GAUGE_LABEL 3종 정의", () => {
    expect(PERIOD_LABEL).toEqual({ today: "오늘", week: "이번 주", month: "이번 달" });
    expect(GAUGE_LABEL).toEqual({
      today: "오늘 수락률",
      week: "이번 주 수락률",
      month: "이번 달 수락률",
    });
  });
});
