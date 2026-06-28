# billing-service — @uniyous/pg-provider(file: 의존) 포함 빌드.
# ⚠️ 빌드 컨텍스트 = 레포 루트 (cd-services.yml에서 이 서비스는 CONTEXT="." 로 빌드).
#    shared/ 가 서비스 폴더 밖이라 서비스 디렉터리 컨텍스트로는 file: 의존을 못 가져옴.

# ── Build stage ──
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

# 1) shared 패키지(pg-provider) 빌드
COPY shared/packages/pg-provider/ ./shared/packages/pg-provider/
RUN cd shared/packages/pg-provider && pnpm install --frozen-lockfile && pnpm build

# 2) 서비스: 매니페스트 → install(file: 의존 resolve) → 소스 → build
WORKDIR /repo/marketplace/services/billing-service
COPY marketplace/services/billing-service/package.json marketplace/services/billing-service/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY marketplace/services/billing-service/ ./
RUN pnpm build

# ── Production stage ──
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init && corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

# shared 런타임 산출물(manifest + dist)
COPY --from=builder /repo/shared/packages/pg-provider/package.json ./shared/packages/pg-provider/
COPY --from=builder /repo/shared/packages/pg-provider/dist ./shared/packages/pg-provider/dist

WORKDIR /repo/marketplace/services/billing-service
COPY marketplace/services/billing-service/package.json marketplace/services/billing-service/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=builder /repo/marketplace/services/billing-service/dist ./dist

# 비루트 사용자
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /repo
USER nodejs

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
