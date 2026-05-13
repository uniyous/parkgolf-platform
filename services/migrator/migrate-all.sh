#!/bin/sh
# parkgolf migrator — 모든 DB-backed 서비스의 prisma migrate deploy 순차 실행
#
# 환경 변수
#   {SVC}_DATABASE_URL  각 서비스의 DB 연결 문자열
#     예) IAM_DATABASE_URL, COURSE_DATABASE_URL, BOOKING_DATABASE_URL, ...
#   DEBUG=1 (선택)      세부 로그 활성
#
# 실패 정책
#   ─ 한 서비스 마이그레이션 실패 → exit 1 (다음 진행 안 함)
#     ArgoCD PreSync 단계 실패로 sync 중단됨 — 의도된 동작.

set -e

SERVICES="iam-service course-service booking-service payment-service saga-service chat-service notify-service partner-service"

echo "[migrator] starting at $(date -u +%FT%TZ)"

for svc in $SERVICES; do
  # iam-service → IAM
  prefix=$(echo "$svc" | sed 's/-service//' | tr 'a-z-' 'A-Z_')
  env_name="${prefix}_DATABASE_URL"

  # 동적 환경변수 값 조회
  eval "db_url=\${$env_name}"

  if [ -z "$db_url" ]; then
    echo "[skip] $svc: $env_name not set"
    continue
  fi

  echo ""
  echo "================================================"
  echo "  Migrating $svc"
  echo "================================================"

  cd "/app/services/$svc"
  DATABASE_URL="$db_url" npx --no-install prisma migrate deploy

  cd /app
done

echo ""
echo "[migrator] completed at $(date -u +%FT%TZ)"
