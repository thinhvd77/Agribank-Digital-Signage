FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --shamefully-hoist

COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm exec esbuild src/db/seed.ts --bundle --platform=node --target=node20 --outfile=dist/seed.js --format=esm --packages=external

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
RUN apk add --no-cache curl

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
RUN pnpm exec prisma generate
RUN mkdir -p /app/uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
	CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "dist/server/index.js"]
