FROM node:18-bullseye

WORKDIR /app

# Copy ONLY backend files
COPY apps/backend/package*.json ./
COPY apps/backend/tsconfig.json ./
COPY apps/backend/prisma ./prisma
COPY apps/backend/src ./src

RUN npm install --legacy-peer-deps --no-audit

RUN npm run build

CMD ["npm", "run", "start"]
