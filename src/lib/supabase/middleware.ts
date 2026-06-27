import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * SSR 세션 갱신 헬퍼.
 * 루트 `src/middleware.ts`(또는 proxy)에서 호출해 매 요청마다 Supabase
 * 세션 쿠키를 갱신한다. @supabase/ssr 권장 패턴.
 *
 * 주의: getClaims/getUser 호출과 응답 반환 사이에 로직을 넣지 말 것
 *       (세션 동기화가 깨질 수 있음).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 세션 토큰 갱신(부수효과). 결과 user 는 호출측 가드에서 활용 가능.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
