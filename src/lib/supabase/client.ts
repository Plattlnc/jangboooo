import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * anon key + RLS 로 보호된 데이터만 접근. service role 키 사용 금지.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
