// 내 정보. 로그인 라이더의 riders 데이터로 채우고, DB에 없는 항목은 '-' 표시.
// 실사용자·바이크 정보는 하단 폼으로 등록 → ROADING 사고접수 프리필에 사용.

import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";
import { getMyGrade } from "@/app/(rider)/_lib/grade";
import { TierBadge } from "@/components/ui/tier-badge";
import { centerDisplayName } from "@/lib/center-names";
import { ProfileForm } from "./profile-form";
import { AvatarEditor } from "./avatar-editor";

// 저장 직후 revalidatePath 반영 위해 매 요청 fresh.
export const dynamic = "force-dynamic";

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

/** 보험 만료 표시: 시작일 + 기간(일) → 'YYYY.MM.DD (D-n)'. 미등록이면 '-'. */
function fmtInsuranceExpiry(start: string | null, days: number | null): string {
  if (!start || !days) return "미등록";
  const startMs = Date.parse(`${start}T00:00:00+09:00`);
  if (Number.isNaN(startMs)) return "-";
  const expiryMs = startMs + days * 86_400_000;
  const d = new Date(expiryMs);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replaceAll(". ", ".")
    .replace(/\.$/, "");
  const dday = Math.ceil((expiryMs - Date.now()) / 86_400_000);
  return dday >= 0 ? `${fmt} (D-${dday})` : `${fmt} (만료됨)`;
}

export default async function MyInfoPage() {
  const [p, grade] = await Promise.all([getRiderProfile(), getMyGrade()]);

  // riders 에 있는 값만 채우고, 컬럼이 없는 항목(이메일·계좌)은 '-'.
  const sections: InfoSection[] = [
    {
      title: "기본 정보",
      rows: [
        { label: "실 사용자 이름", value: p.realName ?? "미등록" },
        { label: "실 사용자 번호", value: p.realPhone ?? "미등록" },
        { label: "연락처(계정)", value: p.phone ?? "-" },
        { label: "활동 지역", value: p.region ?? "-" },
        { label: "소속 협력사", value: centerDisplayName(p.centerId) ?? "-" },
        { label: "가입일", value: fmtDate(p.createdAt) },
      ],
    },
    {
      title: "차량 정보",
      rows: [
        { label: "기종", value: p.bikeModel ?? "미등록" },
        { label: "번호판", value: p.plate ?? "미등록" },
        { label: "이용 형태", value: p.usageType ?? "미등록" },
        { label: "보험 만료", value: fmtInsuranceExpiry(p.insuranceStart, p.insuranceDays) },
      ],
    },
  ];

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">내 정보</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">계정 · 차량 · 정산 계좌를 한 곳에서</p>

      {/* 프로필 카드 (로그인 정보) — 아바타 탭 = 사진 변경(크롭 모달) */}
      <div className="flex items-center gap-[13px] rounded-2xl border border-jb-line bg-white p-[17px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <AvatarEditor avatarUrl={p.avatarUrl} initial={p.initial} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-black text-jb-ink">{p.name}</span>
            <TierBadge tier={grade.tier} size={26} />
          </div>
          <div className="tnum mt-[3px] text-xs text-jb-ink-mute">
            UID {p.uid} · {p.isActive ? "운행중" : "비활성"}
          </div>
        </div>
      </div>

      {/* 정보 섹션들 */}
      {sections.map((sec) => (
        <div
          key={sec.title}
          className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-1.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
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

      {/* 정산 계좌 — 연동 전 준비 상태 */}
      <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="text-xs font-black text-jb-ink-mute">정산 계좌</div>
        <p className="mt-1.5 text-[12.5px] text-jb-ink-mute">정산 시스템 연동 후 등록할 수 있어요.</p>
      </div>

      {/* 실사용자 · 바이크 등록 폼 — 저장 시 ROADING 사고접수 프리필에 반영 */}
      <ProfileForm
        initial={{
          realName: p.realName ?? "",
          realPhone: p.realPhone ?? "",
          bikePlate: p.plate ?? "",
          bikeModel: p.bikeModel ?? "",
          usageType: p.usageType ?? "",
          insuranceStart: p.insuranceStart ?? "",
          insuranceDays: p.insuranceDays ? String(p.insuranceDays) : "",
        }}
      />
    </div>
  );
}
