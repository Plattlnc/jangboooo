"use server";

import { z } from "zod";
import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { fetchRiderDetail, type RiderDetail } from "@/app/settlement/_lib/riders-admin";

export type RiderDetailResult = { ok: true; detail: RiderDetail } | { ok: false; message: string };

const idSchema = z.string().min(1).max(64);

/** 라이더 상세 조회 — 정산 세션 필요(라이더 관리 탭 행 클릭 시 온디맨드 로드). */
export async function loadRiderDetail(riderId: unknown): Promise<RiderDetailResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해주세요." };
  }
  const parsed = idSchema.safeParse(riderId);
  if (!parsed.success) return { ok: false, message: "잘못된 라이더 ID입니다." };
  const detail = await fetchRiderDetail(parsed.data);
  if (!detail) return { ok: false, message: "라이더 정보를 찾을 수 없습니다." };
  return { ok: true, detail };
}
