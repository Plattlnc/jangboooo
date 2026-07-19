// 관리자 영역 공통 로딩 스켈레톤 — 하단 탭 이동 시 즉시 표시(체감 반응속도).
// 홈/라이더/지표/목표 공통 형태: 탭 바 + 카드 3장.
export default function AdminLoading() {
  return (
    <div className="px-3.5 py-[9px]" aria-busy="true" aria-label="불러오는 중">
      <div className="skeleton h-[46px] w-full" />
      <div className="mt-2 space-y-2">
        <div className="skeleton h-[92px] w-full" />
        <div className="skeleton h-[120px] w-full" />
        <div className="skeleton h-[180px] w-full" />
      </div>
    </div>
  );
}
