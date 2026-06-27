import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * service_role 키 기반 Supabase 클라이언트.
 * RLS 를 우회하므로 **서버 전용**(서버 액션 / 라우트 핸들러 / 스크래퍼)에서만 사용.
 * 절대 클라이언트 번들로 새어나가면 안 된다(`server-only` 가드).
 *
 * 용도: 본인인증 후 바인딩 RPC 호출, 스크래퍼 upsert 등.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY / URL not configured')
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
