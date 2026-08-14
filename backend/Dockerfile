FROM node:22-alpine AS deps

RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npm run db:generate

FROM deps AS prod-deps

RUN npm prune --omit=dev

FROM node:22-alpine AS runner

RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=4000

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/prisma ./prisma
COPY api ./api
COPY scripts ./scripts

EXPOSE 4000

CMD ["node", "api/server.js"]
