#!/bin/zsh
# 로컬(맥) 상주 워커 — 프록시 트래픽 소진 시 임시 운용 (Railway 대체).
# 워커가 자가치유 exit(1) 해도 Railway 재시작 정책과 동일하게 새 프로세스로 회복.
# 실행: nohup caffeinate -is ./run-local.sh > .session/local-worker.log 2>&1 &
# 중지: pkill -f run-local.sh && pkill -f "tsx src/index.ts"
cd "$(dirname "$0")" || exit 1
set -a; source .env; set +a
while true; do
  npm start
  echo "[run-local] 워커 종료(code $?) — 5초 후 재시작 $(date '+%F %T')"
  sleep 5
done
