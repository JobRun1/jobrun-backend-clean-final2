# ───────────────────────────────
# BUILD STAGE
# ───────────────────────────────
FROM node:18-bullseye AS builder

WORKDIR /app

COPY apps/backend/package*.json ./
COPY apps/backend/tsconfig.json ./
COPY apps/backend/prisma ./prisma
COPY apps/backend/src ./src

RUN npm install --legacy-peer-deps --no-audit
RUN npm run build

# ───────────────────────────────
# RUNTIME STAGE (CLEAN)
# ───────────────────────────────
FROM node:18-bullseye

WORKDIR /app

# Copy ONLY what is needed to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
