#!/usr/bin/env python3
"""바로고 주차별 정산내역서 xlsx → rider_extra_payments 멱등 upsert.

'추가배달료' 시트(기상할증 보정 등 사후 소급 지급)를 파싱한다. 배민 배달처리비
daily 파일에는 이 보정이 반영되지 않음(2026-08-15 재다운로드 diff 0건 실측) —
주간 정산서가 유일한 소스. 정산 > 추가 지급 메뉴의 데이터.

사용:
  set -a; source .env.local; set +a
  python3 scripts/ingest_extra_payments.py <xlsx> [--dry-run]

주차(수~화)는 파일명(YYYYMMDD_YYYYMMDD_...)에서 추출.
환경변수: NEXT_PUBLIC_SUPABASE_URL(또는 SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY
"""
import argparse
import json
import os
import re
import sys
import urllib.request

import openpyxl


def parse_week_from_filename(path):
    m = re.match(r"(\d{8})_(\d{8})_", os.path.basename(path))
    if not m:
        sys.exit("파일명에서 주차(YYYYMMDD_YYYYMMDD_) 추출 실패")
    fmt = lambda s: f"{s[:4]}-{s[4:6]}-{s[6:8]}"
    return fmt(m.group(1)), fmt(m.group(2))


def parse(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    if "추가배달료" not in wb.sheetnames:
        sys.exit("'추가배달료' 시트 없음 — 정산내역서 형식 확인 필요")
    ws = wb["추가배달료"]
    rows = []
    header_seen = False
    for row in ws.iter_rows(values_only=True):
        if not row or len(row) < 6:
            continue
        # 헤더 행: | 라이더ID | 이름 | 지급금액 | 배달정보 | 사유 (첫 컬럼 공백)
        if row[1] == "라이더ID":
            header_seen = True
            continue
        if not header_seen:
            continue
        rid, name, amt, info, reason = row[1], row[2], row[3], row[4], row[5]
        if rid is None or amt is None:
            continue
        rows.append({
            "admin_rider_id": str(rid).strip(),
            "rider_name": str(name).strip() if name is not None else None,
            "amount_krw": int(amt),
            "delivery_info": str(info).strip() if info is not None else "",
            "reason": str(reason).strip() if reason is not None else "",
        })
    return rows


def upsert(rows, url, key):
    endpoint = url.rstrip("/") + "/rest/v1/rider_extra_payments?on_conflict=week_start,admin_rider_id,delivery_info,reason"
    headers = {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    total = 0
    for i in range(0, len(rows), 500):
        chunk = rows[i:i + 500]
        req = urllib.request.Request(endpoint, data=json.dumps(chunk).encode(), headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            if resp.status not in (200, 201, 204):
                sys.exit(f"upsert 실패 status={resp.status}: {resp.read()[:200]}")
        total += len(chunk)
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("excel")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    week_start, week_end = parse_week_from_filename(args.excel)
    rows = parse(args.excel)
    riders = len({r["admin_rider_id"] for r in rows})
    total = sum(r["amount_krw"] for r in rows)
    print(f"파싱: 주차 {week_start}~{week_end} | rows={len(rows)} riders={riders} 합계={total:,}원")
    by_rider = {}
    for r in rows:
        by_rider.setdefault(f"{r['rider_name']}({r['admin_rider_id']})", 0)
        by_rider[f"{r['rider_name']}({r['admin_rider_id']})"] += r["amount_krw"]
    for k, v in sorted(by_rider.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v:,}원")

    if args.dry_run:
        print("(dry-run: 적재 안 함)")
        return

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 환경변수 필요")
    payload = [{**r, "week_start": week_start, "week_end": week_end,
                "source": os.path.basename(args.excel)} for r in rows]
    n = upsert(payload, url, key)
    print(f"적재 완료: {n}행 (멱등 upsert)")


if __name__ == "__main__":
    main()
