import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboard } from '@/lib/supabase/queries'
import { slaQuerySchema, type ApiError, type SlaDashboardResponse } from '@/types/api'

/**
 * GET /api/sla?period=today|week|month&ref=YYYY-MM-DD
 * 로그인 + 라이더 바인딩된 사용자의 본인 SLA 대시보드 데이터(요약+일별+시간대).
 * RLS 로 본인 데이터만 반환.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<SlaDashboardResponse | ApiError>> {
  const { searchParams } = new URL(request.url)
  const parsed = slaQuerySchema.safeParse({
    period: searchParams.get('period') ?? undefined,
    ref: searchParams.get('ref') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? 'invalid query' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
      { status: 401 },
    )
  }

  try {
    const data = await getDashboard(supabase, parsed.data.period, parsed.data.ref)
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: { code: 'QUERY_FAILED', message } }, { status: 500 })
  }
}
