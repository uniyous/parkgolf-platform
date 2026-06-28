# marketplace-saga-service — shared/packages(file: 의존) 포함 빌드.
# ⚠️ 빌드 컨텍스트 = 레포 루트 (cd-services.yml에서 이 서비스만 CONTEXT="." 로 빌드).
#    shared/ 가 서비스 폴더 밖이라 서비스 디렉터리 컨텍스트로는 file: 의존을 못 가져옴.

# ── Build stage ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

# 1) shared 패키지 — 의존성 순으로 완전 빌드.
#    saga-engine은 @uniyous/nats-common(file:)에 의존 → nats-common dist를 먼저 빌드해야
#    saga-engine install/build가 그 타입을 resolve. (순서 뒤바뀌면 dist 없는 nats-common 스냅샷)
COPY shared/packages/nats-common/ ./shared/packages/nats-common/
RUN cd shared/packages/nats-common && pnpm install --frozen-lockfile && pnpm build
COPY shared/packages/saga-engine/ ./shared/packages/saga-engine/
RUN cd shared/packages/saga-engine && pnpm install --frozen-lockfile && pnpm build

# 2) 서비스: 매니페스트 → install(file: 의존이 위 빌드된 shared로 resolve) → 소스 → build
WORKDIR /repo/marketplace/services/marketplace-saga-service
COPY marketplace/services/marketplace-saga-service/package.json marketplace/services/marketplace-saga-service/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY marketplace/services/marketplace-saga-service/ ./
RUN pnpm build

# ── Production stage ──
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

# shared 런타임 산출물(manifest + dist) — prod install이 file: 심볼릭을 걸 대상
COPY --from=builder /repo/shared/packages/nats-common/package.json ./shared/packages/nats-common/
COPY --from=builder /repo/shared/packages/nats-common/dist ./shared/packages/nats-common/dist
COPY --from=builder /repo/shared/packages/saga-engine/package.json ./shared/packages/saga-engine/
COPY --from=builder /repo/shared/packages/saga-engine/dist ./shared/packages/saga-engine/dist

WORKDIR /repo/marketplace/services/marketplace-saga-service
COPY marketplace/services/marketplace-saga-service/package.json marketplace/services/marketplace-saga-service/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /repo/marketplace/services/marketplace-saga-service/dist ./dist

# 비루트 사용자
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /repo
USER nodejs

# Cloud Run uses PORT env var (default 8080)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
