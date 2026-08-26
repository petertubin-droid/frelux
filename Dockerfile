# =========================================================
# FRELUX Production Dockerfile
# Multi-stage build for minimal production image
# =========================================================

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/dist ./dist
COPY public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]
