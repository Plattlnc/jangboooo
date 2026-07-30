-- 내정보 프로필 사진 (2026-07-31)
-- riders.avatar_path: avatars 버킷 내 객체 경로(`<admin_rider_id>/avatar-<ts>.jpg`).
--   파일명에 타임스탬프를 넣어 재업로드 시 캐시 무효화(경로 자체가 바뀜).
-- 버킷은 공개 읽기(아바타 저민감) + 쓰기는 service role(서버 액션) 전용
--   → storage.objects RLS 정책 불필요(공개 버킷 읽기는 정책 무관, 쓰기는 service role 우회).
-- idempotent — 재실행 안전.

alter table public.riders add column if not exists avatar_path text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;
