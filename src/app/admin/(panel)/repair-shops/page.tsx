import { createAdminClient } from "@/lib/supabase/admin";
import type { RepairShopRow } from "@/types/database";
import { RepairShopsManager } from "./repair-shops-manager";

export const dynamic = "force-dynamic";

// 제휴 정비소 관리 — 등록/노출 토글/삭제. 등록분은 라이더 '내 주변 정비소'에 노출.
export default async function AdminRepairShopsPage() {
  let shops: RepairShopRow[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("repair_shops")
      .select("*")
      .order("created_at", { ascending: false });
    shops = data ?? [];
  } catch {
    /* env 미설정 등 — 빈 목록으로 렌더 */
  }

  return (
    <div className="px-3.5 py-[9px]">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[15px] font-black text-jb-ink">
          제휴 정비소 <span className="text-jb-indigo">· {shops.length}곳</span>
        </span>
        <span className="text-[10px] font-semibold text-jb-ink-mute">
          라이더 &lsquo;내 주변 정비소&rsquo;에 노출
        </span>
      </div>

      <RepairShopsManager shops={shops} />
    </div>
  );
}
