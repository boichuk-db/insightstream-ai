FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS builder
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @insightstream/shared-types build
RUN pnpm --filter @insightstream/database build
RUN pnpm --filter api build

RUN pnpm deploy --filter api --prod /prod

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /prod ./
COPY --from=builder /app/apps/api/dist ./dist

RUN addgroup -g 1001 nodejs && adduser -S nestjs -u 1001 -G nodejs
USER nestjs

EXPOSE 3001
CMD ["node", "dist/main"]
