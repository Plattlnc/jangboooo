import { NextResponse, type NextRequest } from 'next/server'
import { getRiderSession } from '@/lib/auth/cookies'
import { getDashboardFor } from '@/lib/supabase/queries'
import { slaQuerySchema, type ApiError, type SlaDashboardResponse } from '@/types/api'

/**
 * GET /api/sla?period=today|week|month&ref=YYYY-MM-DD
 * 서명 세션(라이더 로그인)된 본인의 SLA 대시보드 데이터(요약+일별+시간대).
 * admin_rider_id 는 세션에서만 유도(외부 입력 불가).
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

  const session = await getRiderSession()
  if (!session) {
    return NextResponse.json(
      { error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
      { status: 401 },
    )
  }

  try {
    const data = await getDashboardFor(session.adminRiderId, parsed.data.period, parsed.data.ref)
    return NextResponse.json(data)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: { code: 'QUERY_FAILED', message } }, { status: 500 })
  }
}
