FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.12.0 turbo@2.1.3

# Prune stage
FROM base AS pruner
ARG APP
WORKDIR /app
COPY . .
RUN if [ "$APP" = "api" ]; then turbo prune --scope=$APP --scope=widget --docker; else turbo prune --scope=$APP --docker; fi

# Builder stage
FROM base AS builder
ARG APP
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN if [ "$APP" = "api" ]; then pnpm turbo build --filter=$APP --filter=widget; else pnpm turbo build --filter=$APP; fi

# Runner stage
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm@9.12.0 turbo@2.1.3
ARG APP
ARG PORT
ENV PORT=$PORT
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app .
EXPOSE $PORT
CMD pnpm turbo run start:prod --filter=$APP
