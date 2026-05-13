# Parkgolf Migrator — 모든 DB-backed 서비스의 prisma migrate deploy를 단일 Pod에서 순차 실행
#
# Build context: repo root (각 서비스 prisma 폴더 접근 위함)
#   docker build -f services/migrator/Dockerfile -t parkgolf-migrator .
#
# 동작
#   ArgoCD PreSync Hook으로 1회 실행 → 8개 DB 순차 마이그레이션 → exit
#   기존 service 이미지(~300MB × 8) 대신 단일 이미지(~150MB) 1회 pull로 단축.
FROM node:20-alpine

WORKDIR /app

# prisma CLI + client (production 의존성만)
COPY services/migrator/package.json ./package.json
RUN npm install --omit=dev && npm cache clean --force

# 각 DB 서비스의 prisma 폴더 복사 (schema + migrations)
COPY services/iam-service/prisma       /app/services/iam-service/prisma
COPY services/course-service/prisma    /app/services/course-service/prisma
COPY services/booking-service/prisma   /app/services/booking-service/prisma
COPY services/payment-service/prisma   /app/services/payment-service/prisma
COPY services/saga-service/prisma      /app/services/saga-service/prisma
COPY services/chat-service/prisma      /app/services/chat-service/prisma
COPY services/notify-service/prisma    /app/services/notify-service/prisma
COPY services/partner-service/prisma   /app/services/partner-service/prisma

# 실행 스크립트
COPY services/migrator/migrate-all.sh /app/migrate-all.sh
RUN chmod +x /app/migrate-all.sh

# Non-root
RUN addgroup -g 1001 -S migrator && \
    adduser -S migrator -u 1001 && \
    chown -R migrator:migrator /app
USER migrator

CMD ["/app/migrate-all.sh"]
