// 계약종료(탈퇴) 라이더 표시 뱃지 — 정산 화면 라이더명 옆에 인라인 표기.
export function TerminatedBadge() {
  return (
    <span className="ml-1.5 inline-flex shrink-0 items-center rounded-[5px] bg-jb-red-tint px-1.5 py-[2px] align-middle text-[10px] font-bold leading-none text-jb-red">
      계약종료
    </span>
  );
}
