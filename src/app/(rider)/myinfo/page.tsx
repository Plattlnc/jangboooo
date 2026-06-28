// 내 정보 (시안). 로그인 라이더의 riders 데이터로 채우고, DB에 없는 항목은 '-' 표시.

import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";

interface InfoRow {
  label: string;
  value: string;
}
interface InfoSection {
  title: string;
  rows: InfoRow[];
}

/** ISO → 'YYYY.MM.DD' (없으면 '-'). */
function fmtDate(iso: string | null): string {
  return iso ? iso.slice(0, 10).replaceAll("-", ".") : "-";
}

export default async function MyInfoPage() {
  const p = await getRiderProfile();

  // riders 에 있는 값만 채우고, 컬럼이 없는 항목(이메일·차량·계좌)은 '-'.
  const sections: InfoSection[] = [
    {
      title: "기본 정보",
      rows: [
        { label: "연락처", value: p.phone ?? "-" },
        { label: "이메일", value: "-" },
        { label: "활동 지역", value: p.region ?? "-" },
        { label: "소속 협력사", value: p.centerId ?? "-" },
        { label: "가입일", value: fmtDate(p.createdAt) },
      ],
    },
    {
      title: "차량 정보",
      rows: [
        { label: "차종", value: "-" },
        { label: "번호판", value: "-" },
        { label: "이용 형태", value: "-" },
        { label: "보험 만료", value: "-" },
      ],
    },
    {
      title: "정산 계좌",
      rows: [
        { label: "입금 은행", value: "-" },
        { label: "계좌번호", value: "-" },
      ],
    },
  ];

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">내 정보</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">계정 · 차량 · 정산 계좌를 한 곳에서</p>

      {/* 프로필 카드 (로그인 정보) */}
      <div className="flex items-center gap-[13px] rounded-2xl bg-[linear-gradient(135deg,#4F6AF5,#5d77ff)] p-[17px] text-white shadow-[0_8px_20px_rgba(79,106,245,0.26)]">
        <div className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-white/20 text-[19px] font-black">
          {p.initial}
        </div>
        <div className="flex-1">
          <div className="text-lg font-black">{p.name}</div>
          <div className="tnum mt-[3px] text-xs opacity-90">
            UID {p.uid} · {p.isActive ? "운행중" : "비활성"}
          </div>
        </div>
      </div>

      {/* 정보 섹션들 */}
      {sections.map((sec) => (
        <div
          key={sec.title}
          className="mt-3 rounded-[14px] border border-jb-line bg-white px-4 py-1.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
        >
          <div className="px-0 pb-[5px] pt-[11px] text-xs font-black text-jb-ink-mute">{sec.title}</div>
          {sec.rows.map((r) => (
            <div key={r.label} className="flex justify-between border-t border-jb-line-soft py-2.5">
              <span className="text-[13px] text-jb-ink-soft">{r.label}</span>
              <span className="tnum text-[13px] font-bold">{r.value}</span>
            </div>
          ))}
        </div>
      ))}

      <button
        type="button"
        className="mt-3.5 w-full rounded-xl border border-jb-line bg-white py-[13px] text-sm font-bold text-jb-ink transition-transform active:scale-[.98]"
      >
        정보 수정하기
      </button>
    </div>
  );
}
