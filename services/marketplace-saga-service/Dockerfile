# marketplace-saga-service — shared/packages(file: 의존) 포함 빌드.
# ⚠️ 빌드 컨텍스트 = 레포 루트 (cd-services.yml에서 이 서비스만 CONTEXT="." 로 빌드).
#    shared/ 가 서비스 폴더 밖이라 서비스 디렉터리 컨텍스트로는 file: 의존을 못 가져옴.

# ── Build stage ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

# 1) shared 패키지: 매니페스트 → install(devDeps) → 소스 → build(dist)
COPY shared/packages/nats-common/package.json shared/packages/nats-common/pnpm-lock.yaml ./shared/packages/nats-common/
COPY shared/packages/saga-engine/package.json shared/packages/saga-engine/pnpm-lock.yaml ./shared/packages/saga-engine/
RUN cd shared/packages/nats-common && pnpm install --frozen-lockfile
RUN cd shared/packages/saga-engine && pnpm install --frozen-lockfile
COPY shared/packages/nats-common/ ./shared/packages/nats-common/
COPY shared/packages/saga-engine/ ./shared/packages/saga-engine/
RUN cd shared/packages/nats-common && pnpm build
RUN cd shared/packages/saga-engine && pnpm build

# 2) 서비스: 매니페스트 → install(file: 의존이 위 빌드된 shared로 resolve) → 소스 → build
WORKDIR /repo/services/marketplace-saga-service
COPY services/marketplace-saga-service/package.json services/marketplace-saga-service/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY services/marketplace-saga-service/ ./
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

WORKDIR /repo/services/marketplace-saga-service
COPY services/marketplace-saga-service/package.json services/marketplace-saga-service/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /repo/services/marketplace-saga-service/dist ./dist

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
