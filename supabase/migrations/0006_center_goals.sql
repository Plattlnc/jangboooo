-- ───────────────────────────────────────────────────────────
-- jangboooo — 0006 공동목표(달성현황 beta) 스키마
-- 소스: 배민커넥트비즈 달성현황(beta) = 구글 Looker Studio 임베드 리포트.
--   센터(협력사)별·영업일별·피크별 {current, goal, pct}. 스코프=센터 공유(라이더 공통).
-- 계약/매핑 근거: docs/api/center-goals.md (HAR 직접 분석).
-- 작성: backend
-- ───────────────────────────────────────────────────────────

-- ── riders ↔ 센터(협력사) 연결 ─────────────────────────────────
-- 스크래퍼가 delivery-status 요청 헤더의 center-id(예 DP2504250236)로 스탬프.
-- 공동목표 RPC 가 라이더의 센터를 찾는 데 사용.
alter table public.riders add column if not exists center_id text;
create index if not exists riders_center_id_idx on public.riders (center_id);
comment on column public.riders.center_id is '소속 협력사(센터) ID. 스크래퍼가 center-id 헤더로 적재.';

-- ── center_peak_goals: 센터 × 영업일 × 피크 공동목표 ───────────
-- peak_key: ml(아침점심) / pl(오후논피크) / d(저녁피크) / pd(심야논피크). 표시순서 = 그 순서.
-- current/goal = "현재/목표" 건수. pct = 소스 표기 퍼센트(100 상한 반영, 예 810/528→100).
create table if not exists public.center_peak_goals (
  id            bigint generated always as identity primary key,
  center_id     text not null,
  center_name   text,
  snapshot_date date not null,                          -- 영업일(KST, 스크래퍼 결정)
  peak_key      text not null check (peak_key in ('ml','pl','d','pd')),
  current       integer,                                -- 현재 달성(건). 미상 null
  goal          integer,                                -- 공동목표(건). 미상/0 → 달성률 null
  pct           integer,                                -- 소스 표기 % (0~100, 상한 반영). 미상 null
  captured_at   timestamptz not null default now(),
  constraint center_peak_goals_uniq unique (center_id, snapshot_date, peak_key)
);
create index if not exists center_peak_goals_center_date_idx
  on public.center_peak_goals (center_id, snapshot_date desc);

comment on table  public.center_peak_goals is '센터(협력사) 공동목표 달성현황 — 달성현황(beta)/Looker 소스. 스코프=센터 공유';
comment on column public.center_peak_goals.peak_key is 'ml=아침점심, pl=오후논피크, d=저녁피크, pd=심야논피크 (표시순서)';
comment on column public.center_peak_goals.pct is '소스 표기 퍼센트(100 상한). current/goal 로 재계산 시 100 초과 가능하므로 소스값 보존';
