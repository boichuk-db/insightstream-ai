FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.12.0 turbo@2.1.3

# Prune stage
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune --scope=api --docker

# Builder stage
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=api

# Runner stage
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.12.0 turbo@2.1.3
ENV PORT=3001
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3001
CMD pnpm turbo run start:prod --filter=api
