'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { isAdminSession } from '@/lib/auth/admin-cookies'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeNoticeHtml, noticePlainText } from '@/lib/sanitize-notice'
import type { NoticeRow } from '@/types/database'

/**
 * 공지사항 관리 (관리자 전용) — 작성/수정/삭제/플래그 토글.
 * notices 는 RLS 정책 없음(service_role 전용) → 액션에서 admin 세션 필수 검증.
 * body 는 리치 텍스트 HTML → 저장 전 sanitize. 라이더 /notice 는 is_published 만 노출.
 */

const noticeSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1, '제목을 입력해주세요.').max(120, '제목은 120자 이내로 입력해주세요.'),
  body: z.string().max(100_000).optional().default(''),
  excerpt: z.string().trim().max(200, '요약은 200자 이내로 입력해주세요.').optional().default(''),
  is_published: z.boolean().optional().default(false),
  is_pinned: z.boolean().optional().default(false),
  is_important: z.boolean().optional().default(false),
  is_featured: z.boolean().optional().default(false),
  is_public: z.boolean().optional().default(false),
})

const FLAGS = ['is_published', 'is_pinned', 'is_important', 'is_featured', 'is_public'] as const
type NoticeFlag = (typeof FLAGS)[number]

export interface NoticeActionResult {
  ok: boolean
  message: string
  id?: string
}

function revalidateNoticeViews(): void {
  revalidatePath('/admin/notices')
  revalidatePath('/notice')
  revalidatePath('/dashboard') // 홈 featured 배너
}

export async function saveNotice(input: unknown): Promise<NoticeActionResult> {
  if (!(await isAdminSession())) return { ok: false, message: '관리자 로그인이 필요합니다.' }
  const parsed = noticeSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }
  const d = parsed.data
  const body = sanitizeNoticeHtml(d.body)
  const excerpt = d.excerpt || noticePlainText(body).slice(0, 120) || null
  const nowIso = new Date().toISOString()
  const admin = createAdminClient()

  const base = {
    title: d.title,
    body,
    excerpt,
    is_pinned: d.is_pinned,
    is_important: d.is_important,
    is_featured: d.is_featured,
    is_published: d.is_published,
    is_public: d.is_public,
    updated_at: nowIso,
  }
  // PGRST204 = is_public 컬럼 미존재(0022 라이브 적용 전) → 그 필드만 빼고 재시도.
  const legacyBase: Omit<typeof base, 'is_public'> & { is_public?: boolean } = { ...base }
  delete legacyBase.is_public

  if (d.id) {
    // 게시 상태 전이에 맞춰 published_at 관리(최초 게시 시각 유지).
    const { data: cur } = await admin.from('notices').select('published_at').eq('id', d.id).maybeSingle()
    const published_at = d.is_published ? (cur?.published_at ?? nowIso) : null
    let { error } = await admin.from('notices').update({ ...base, published_at }).eq('id', d.id)
    if (error?.code === 'PGRST204') {
      ;({ error } = await admin.from('notices').update({ ...legacyBase, published_at }).eq('id', d.id))
    }
    if (error) return { ok: false, message: '수정에 실패했습니다. 잠시 후 다시 시도해주세요.' }
    revalidateNoticeViews()
    revalidatePath(`/notice/${d.id}`)
    return { ok: true, message: '공지가 수정되었습니다.', id: d.id }
  }

  let { data, error } = await admin
    .from('notices')
    .insert({ ...base, published_at: d.is_published ? nowIso : null })
    .select('id')
    .single()
  if (error?.code === 'PGRST204') {
    ;({ data, error } = await admin
      .from('notices')
      .insert({ ...legacyBase, published_at: d.is_published ? nowIso : null })
      .select('id')
      .single())
  }
  if (error) return { ok: false, message: '등록에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  revalidateNoticeViews()
  return { ok: true, message: '공지가 등록되었습니다.', id: data?.id }
}

export interface NoticeImageResult {
  ok: boolean
  url?: string
  message: string
}

/** 공지 본문 이미지 업로드 → Supabase Storage(notice-images 버킷) 공개 URL 반환. */
export async function uploadNoticeImage(formData: FormData): Promise<NoticeImageResult> {
  if (!(await isAdminSession())) return { ok: false, message: '관리자 로그인이 필요합니다.' }
  const file = formData.get('image')
  if (!(file instanceof File)) return { ok: false, message: '이미지를 선택해주세요.' }
  if (!file.type.startsWith('image/')) return { ok: false, message: '이미지 파일만 업로드할 수 있어요.' }
  if (file.size > 8 * 1024 * 1024) return { ok: false, message: '8MB 이하 이미지만 업로드할 수 있어요.' }

  const admin = createAdminClient()
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const path = `notices/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await admin.storage
    .from('notice-images')
    .upload(path, bytes, { contentType: file.type, upsert: false })
  if (error) {
    return { ok: false, message: '업로드에 실패했습니다. (Storage 버킷 notice-images 를 확인해주세요.)' }
  }
  const { data } = admin.storage.from('notice-images').getPublicUrl(path)
  return { ok: true, url: data.publicUrl, message: '이미지가 업로드되었습니다.' }
}

export async function deleteNotice(id: string): Promise<NoticeActionResult> {
  if (!(await isAdminSession())) return { ok: false, message: '관리자 로그인이 필요합니다.' }
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: '잘못된 요청입니다.' }
  const admin = createAdminClient()
  const { error } = await admin.from('notices').delete().eq('id', id)
  if (error) return { ok: false, message: '삭제에 실패했습니다.' }
  revalidateNoticeViews()
  return { ok: true, message: '공지가 삭제되었습니다.' }
}

export async function toggleNoticeFlag(id: string, flag: NoticeFlag, value: boolean): Promise<NoticeActionResult> {
  if (!(await isAdminSession())) return { ok: false, message: '관리자 로그인이 필요합니다.' }
  if (!z.string().uuid().safeParse(id).success || !FLAGS.includes(flag)) {
    return { ok: false, message: '잘못된 요청입니다.' }
  }
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const patch: Partial<NoticeRow> = { updated_at: now }
  patch[flag] = value
  if (flag === 'is_published') patch.published_at = value ? now : null
  const { error } = await admin.from('notices').update(patch).eq('id', id)
  if (error) return { ok: false, message: '변경에 실패했습니다.' }
  revalidateNoticeViews()
  return { ok: true, message: '변경되었습니다.' }
}
