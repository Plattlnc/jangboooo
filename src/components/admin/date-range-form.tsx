// 기간 직접 선택(GET 폼) — 홈/라이더/지표(최대 7일)·목표 이력(무제한) 공용.
// 당일(영업일)은 실시간 수집 중이라 선택 불가 → max = 어제. 서버측 클램프가 최종 방어.
export function DateRangeForm({
  basePath,
  from,
  to,
  maxDate,
  extraQuery = {},
  note,
}: {
  basePath: string;
  from?: string;
  to?: string;
  /** 선택 가능한 마지막 날짜(어제 영업일). */
  maxDate: string;
  extraQuery?: Record<string, string>;
  note?: string;
}) {
  return (
    <form action={basePath} method="get" className="mt-1.5">
      {Object.entries(extraQuery).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          name="from"
          defaultValue={from}
          max={maxDate}
          aria-label="시작일"
          className="tnum min-w-0 flex-1 border border-jb-line bg-white px-2 py-[7px] text-[12.5px] font-bold text-jb-ink focus:outline-none"
        />
        <span className="shrink-0 text-[12px] font-bold text-jb-ink-mute">~</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          max={maxDate}
          aria-label="마감일"
          className="tnum min-w-0 flex-1 border border-jb-line bg-white px-2 py-[7px] text-[12.5px] font-bold text-jb-ink focus:outline-none"
        />
        <button type="submit" className="shrink-0 bg-jb-indigo px-3 py-[8px] text-[12px] font-black text-white">
          조회
        </button>
      </div>
      {note ? <div className="mt-1 px-0.5 text-[10.5px] font-semibold text-jb-ink-mute">{note}</div> : null}
    </form>
  );
}
