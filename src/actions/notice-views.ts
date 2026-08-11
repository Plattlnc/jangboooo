'use server'

import { z } from 'zod'
import { cookies } from 'next/headers'
import { getRiderSession } from '@/lib/auth/cookies'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_MODE } from '@/lib/demo'

/**
 * 공지 누적 고유 조회수 기록 — 상세 열람 시 클라이언트 핑(NoticeViewPing)이 호출.
 * 뷰어 키: 로그인 라이더 = 'r:<admin_rider_id>', 익명 = 'a:<쿠키 uuid>' —
 * DB(record_notice_view, 0022)가 (공지, 뷰어) 단위로 dedupe 해 같은 사람 재열람은 안 늘어남.
 * best-effort: 실패해도 열람 흐름에 영향 없음(로그만).
 */

const ANON_VIEWER_COOKIE = 'notice_viewer'
const ANON_VIEWER_TTL_SECONDS = 60 * 60 * 24 * 400 // 브라우저 쿠키 수명 상한(크롬 400일)

export async function recordNoticeView(noticeId: string): Promise<void> {
  if (DEMO_MODE) return
  if (!z.string().uuid().safeParse(noticeId).success) return
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return

  try {
    const session = await getRiderSession()
    let viewer: string
    if (session) {
      viewer = `r:${session.adminRiderId}`
    } else {
      const store = await cookies()
      let anon = store.get(ANON_VIEWER_COOKIE)?.value
      if (!anon || !/^[0-9a-f-]{36}$/i.test(anon)) {
        anon = crypto.randomUUID()
        store.set(ANON_VIEWER_COOKIE, anon, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: ANON_VIEWER_TTL_SECONDS,
        })
      }
      viewer = `a:${anon}`
    }

    const admin = createAdminClient()
    const { error } = await admin.rpc('record_notice_view', {
      p_notice_id: noticeId,
      p_viewer_id: viewer,
    })
    // 0022 적용 전(함수 미존재)에도 열람은 정상 — 기록만 건너뜀.
    if (error) console.error('[notices] 조회 기록 실패:', error.code, error.message)
  } catch (e) {
    console.error('[notices] 조회 기록 예외:', e)
  }
}
