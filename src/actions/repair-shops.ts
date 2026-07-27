'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { isAdminSession } from '@/lib/auth/admin-cookies'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 제휴 정비소 관리 (관리자 전용) — 등록/활성 토글/삭제.
 * repair_shops 는 RLS 정책 없음(service_role 전용) → 액션에서 admin 세션 필수 검증.
 * 라이더 /repair 화면이 is_active=true 만 노출.
 */

const addShopSchema = z.object({
  name: z.string().trim().min(1, '정비소 이름을 입력해주세요.').max(40, '이름은 40자 이내로 입력해주세요.'),
  phone: z.string().trim().max(20, '전화번호는 20자 이내로 입력해주세요.'),
  address: z.string().trim().max(80, '주소는 80자 이내로 입력해주세요.'),
  note: z.string().trim().max(80, '메모는 80자 이내로 입력해주세요.'),
})

export interface RepairShopActionResult {
  ok: boolean
  message: string
}

function revalidateShopViews(): void {
  revalidatePath('/admin/repair-shops')
  revalidatePath('/repair')
}

export async function addRepairShop(input: unknown): Promise<RepairShopActionResult> {
  if (!(await isAdminSession())) {
    return { ok: false, message: '관리자 로그인이 필요합니다.' }
  }
  const parsed = addShopSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.' }
  }

  const { name, phone, address, note } = parsed.data
  const admin = createAdminClient()
  const { error } = await admin.from('repair_shops').insert({
    name,
    phone: phone || null,
    address: address || null,
    note: note || null,
  })
  if (error) {
    return { ok: false, message: '등록에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidateShopViews()
  return { ok: true, message: `'${name}' 정비소가 등록되었습니다.` }
}

export async function toggleRepairShop(id: string, isActive: boolean): Promise<RepairShopActionResult> {
  if (!(await isAdminSession())) {
    return { ok: false, message: '관리자 로그인이 필요합니다.' }
  }
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: '잘못된 요청입니다.' }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('repair_shops')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error || !data?.length) {
    return { ok: false, message: '변경에 실패했습니다.' }
  }

  revalidateShopViews()
  return { ok: true, message: isActive ? '노출로 전환되었습니다.' : '숨김 처리되었습니다.' }
}

export async function deleteRepairShop(id: string): Promise<RepairShopActionResult> {
  if (!(await isAdminSession())) {
    return { ok: false, message: '관리자 로그인이 필요합니다.' }
  }
  if (!z.uuid().safeParse(id).success) {
    return { ok: false, message: '잘못된 요청입니다.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('repair_shops').delete().eq('id', id)
  if (error) {
    return { ok: false, message: '삭제에 실패했습니다.' }
  }

  revalidateShopViews()
  return { ok: true, message: '삭제되었습니다.' }
}
