import { describe, it, expect } from "vitest";
import {
  slaGrade,
  acceptanceStatus,
  deltaTone,
  formatUpdatedAt,
  daysLeftInPeriod,
  selectMotivation,
  peakWindow,
  PERIOD_LABEL,
  PREV_PERIOD_LABEL,
} from "@/app/(rider)/_lib/metrics";

// 지표 → 상태색/등급/델타 변환 로직. 임계값과 색 방향이 SSOT(03 §E)와 일치하는지 고정.

describe("slaGrade — 등급/색 임계값 (≥90 우수 / 70–89 주의 / <70 위험)", () => {
  it("경계값: 90은 우수, 89는 주의, 70은 주의, 69는 위험", () => {
    expect(slaGrade(90)).toEqual({ label: "우수", status: "success" });
    expect(slaGrade(89)).toEqual({ label: "주의", status: "warning" });
    expect(slaGrade(70)).toEqual({ label: "주의", status: "warning" });
    expect(slaGrade(69)).toEqual({ label: "위험", status: "danger" });
  });

  it("해피/극단: 100 우수, 0 위험", () => {
    expect(slaGrade(100).status).toBe("success");
    expect(slaGrade(0).status).toBe("danger");
  });
});

describe("acceptanceStatus — 수락률 임계값 (0~100%, ≥95 우수 / 85–94 주의 / <85 위험)", () => {
  // 단위는 backend 계약(sla-api.md §4/§6)과 동일한 0~100 퍼센트.
  it("경계값: 95 success / 94 warning / 85 warning / 84 danger", () => {
    expect(acceptanceStatus(95)).toBe("success");
    expect(acceptanceStatus(94)).toBe("warning");
    expect(acceptanceStatus(85)).toBe("warning");
    expect(acceptanceStatus(84)).toBe("danger");
  });

  it("극단: 100 success, 0 danger", () => {
    expect(acceptanceStatus(100)).toBe("success");
    expect(acceptanceStatus(0)).toBe("danger");
  });
});

describe("deltaTone — 델타 색 방향 (화살표=실제증감, 색=의미)", () => {
  it("0 은 항상 neutral", () => {
    expect(deltaTone(0, "up")).toBe("neutral");
    expect(deltaTone(0, "down")).toBe("neutral");
  });

  it("긍정지표(good=up): 증가=success, 감소=warning", () => {
    expect(deltaTone(5, "up")).toBe("success");
    expect(deltaTone(-5, "up")).toBe("warning");
  });

  it("부정지표(good=down): 감소=success, 증가=warning", () => {
    expect(deltaTone(-3, "down")).toBe("success");
    expect(deltaTone(3, "down")).toBe("warning");
  });
});

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
    expect(formatUpdatedAt("2026-06-28T08:57:00Z", now)).toEqual({
      text: "3분 전 업데이트",
      stale: false,
    });
    expect(formatUpdatedAt("2026-06-28T08:56:00Z", now)).toEqual({
      text: "4분 전 업데이트",
      stale: true,
    });
  });
});

describe("daysLeftInPeriod", () => {
  it("today 는 항상 0", () => {
    expect(daysLeftInPeriod("today")).toBe(0);
  });

  it("week: 월요일이면 6일 남음, 일요일이면 0일", () => {
    const monday = Date.parse("2026-06-22T12:00:00"); // 2026-06-22 = 월
    const sunday = Date.parse("2026-06-28T12:00:00"); // 2026-06-28 = 일
    expect(daysLeftInPeriod("week", monday)).toBe(6);
    expect(daysLeftInPeriod("week", sunday)).toBe(0);
  });

  it("month: 6/28 기준 6월(30일)은 2일 남음, 말일이면 0", () => {
    expect(daysLeftInPeriod("month", Date.parse("2026-06-28T12:00:00"))).toBe(2);
    expect(daysLeftInPeriod("month", Date.parse("2026-06-30T12:00:00"))).toBe(0);
  });
});

describe("selectMotivation — 동기부여 배너 선택", () => {
  const sunday = Date.parse("2026-06-28T12:00:00"); // 일요일 → week 남은일수 0
  const wednesday = Date.parse("2026-06-24T12:00:00"); // 수요일(월=22) → week 남은일수 4

  it("입력이 null 이면 null", () => {
    expect(selectMotivation(null, 80, "week", sunday)).toBeNull();
    expect(selectMotivation(80, null, "week", sunday)).toBeNull();
  });

  it("주간 SLA 상승이면 success 배너", () => {
    const r = selectMotivation(90, 85, "week", wednesday);
    expect(r?.tone).toBe("success");
  });

  it("SLA 하락 & 남은 기간 있으면 warning 배너(남은일수 메시지)", () => {
    const r = selectMotivation(80, 90, "week", wednesday);
    expect(r?.tone).toBe("warning");
    expect(r?.message).toContain("4일");
    // [QA-002] 카피 버그: "이번 " + PERIOD_LABEL.week("이번 주") → "이번 이번 주은" (이중 '이번' + 잘못된 조사 '주은').
    // 현재 동작을 고정해 둔다(수정되면 이 단언을 함께 갱신). 별도 [BUG] 리포트.
    expect(r?.message).toContain("이번 이번 주은");
  });

  it("SLA 하락이지만 남은 기간 0이면 null (today / 주말 week)", () => {
    expect(selectMotivation(80, 90, "today", sunday)).toBeNull();
    expect(selectMotivation(80, 90, "week", sunday)).toBeNull();
  });

  it("주간 동률(상승 아님)이고 하락도 아니면 null", () => {
    expect(selectMotivation(85, 85, "week", wednesday)).toBeNull();
  });
});

describe("peakWindow — 피크 1구간 추출", () => {
  it("빈 배열이면 null", () => {
    expect(peakWindow([])).toBeNull();
  });

  it("전부 0이면 null (실적 없음)", () => {
    const flat = Array.from({ length: 24 }, (_, hour) => ({ hour, completed: 0 }));
    expect(peakWindow(flat)).toBeNull();
  });

  it("최댓값 시각을 start, +1시를 end 로 반환", () => {
    const data = [
      { hour: 11, completed: 6 },
      { hour: 18, completed: 11 },
      { hour: 19, completed: 8 },
    ];
    expect(peakWindow(data)).toEqual({ start: 18, end: 19, max: 11 });
  });

  it("동률이면 먼저 등장한 시각을 선택(strict > )", () => {
    const data = [
      { hour: 12, completed: 9 },
      { hour: 18, completed: 9 },
    ];
    expect(peakWindow(data)?.start).toBe(12);
  });

  it("23시 피크면 end 가 0으로 래핑", () => {
    const data = [{ hour: 23, completed: 4 }];
    expect(peakWindow(data)).toEqual({ start: 23, end: 0, max: 4 });
  });
});

describe("기간 라벨 상수", () => {
  it("PERIOD_LABEL / PREV_PERIOD_LABEL 3종 모두 정의", () => {
    expect(PERIOD_LABEL).toEqual({ today: "오늘", week: "이번 주", month: "이번 달" });
    expect(PREV_PERIOD_LABEL).toEqual({ today: "어제", week: "지난주", month: "지난달" });
  });
});
