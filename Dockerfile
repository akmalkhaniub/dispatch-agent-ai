# ==============================================================================
# Production Dockerfile for DispatchAgent AI
# ==============================================================================
FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3003

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

USER node
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3003}/api/health || exit 1

CMD ["node", "src/server.js"]
