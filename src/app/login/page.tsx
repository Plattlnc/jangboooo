// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 로그인 화면 구조 셸. 카카오 실제 연동은 backend 인증 플로우 대기.
// 디자인 토큰/팔레트 미사용 — 구조만, 중립 클래스.

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <section className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border p-8 text-center">
        <h1 className="text-xl font-semibold">배달장부2</h1>
        <p className="text-sm opacity-70">
          라이더 본인 SLA 대시보드.
          <br />
          카카오 간편로그인 후 본인인증으로 시작합니다.
        </p>

        {/* PROVISIONAL: backend 카카오 OAuth 플로우 연결 전 비활성 셸 */}
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full rounded-md border px-4 py-2.5 text-sm font-medium opacity-60"
          title="backend 인증 플로우 연결 대기"
        >
          카카오로 시작하기 (연동 대기)
        </button>

        <p className="text-xs opacity-50">
          본인인증(휴대폰)으로 관리시스템 라이더와 연결됩니다.
        </p>
      </section>
    </main>
  );
}
