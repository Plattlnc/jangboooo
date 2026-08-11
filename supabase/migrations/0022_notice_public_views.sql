-- ───────────────────────────────────────────────────────────
-- jangboooo — 0022 공지 링크 공개 설정 + 누적 고유 조회수
-- notices.is_public: 로그인 없이 열람 가능 여부(공유 링크 /n/[id]).
-- notice_views: (공지, 뷰어) 1행 = 고유 1회 — 같은 사람 재열람은 안 늘어남.
--   viewer_id = 'r:<admin_rider_id>'(로그인 라이더) | 'a:<uuid>'(익명 쿠키).
-- notices.view_count: 표시용 캐시(행 조회만으로 노출) — RPC 가 삽입 성공 시에만 +1.
-- RLS enable + 정책 없음 = service_role 전용. ADDITIVE — 재실행 안전.
-- ───────────────────────────────────────────────────────────
alter table public.notices add column if not exists is_public boolean not null default false;
alter table public.notices add column if not exists view_count integer not null default 0;

comment on column public.notices.is_public is '공유 링크(/n/[id]) 로그인 없이 열람 허용';
comment on column public.notices.view_count is '누적 고유 조회수(notice_views 기반, record_notice_view 가 유지)';

create table if not exists public.notice_views (
  notice_id uuid not null references public.notices (id) on delete cascade,
  viewer_id text not null,
  viewed_at timestamptz not null default now(),
  primary key (notice_id, viewer_id)
);

alter table public.notice_views enable row level security; -- 정책 없음 = service_role 전용

comment on table public.notice_views is '공지 고유 조회 기록 — 뷰어당 1행(dedupe). service_role 전용';

-- 고유 조회 기록 + 카운트 반환. 미게시/뷰어 없음 → null(no-op).
create or replace function public.record_notice_view(
  p_notice_id uuid,
  p_viewer_id text
)
returns integer
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_viewer_id is null or length(p_viewer_id) = 0 then
    return null;
  end if;
  if not exists (select 1 from public.notices where id = p_notice_id and is_published) then
    return null;
  end if;

  insert into public.notice_views (notice_id, viewer_id)
  values (p_notice_id, p_viewer_id)
  on conflict do nothing;

  if found then
    update public.notices
      set view_count = view_count + 1
      where id = p_notice_id
      returning view_count into v_count;
  else
    select view_count into v_count from public.notices where id = p_notice_id;
  end if;
  return v_count;
end
$$;
