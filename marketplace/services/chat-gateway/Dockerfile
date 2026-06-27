# Build stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production stage
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist ./dist

# Cloud Run uses PORT env variable
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main"]
