# Use Node 18
FROM node:18-bullseye

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install production dependencies
RUN npm install --legacy-peer-deps --no-audit

# Copy everything else
COPY . .

# Build TS + Prisma client
RUN npx prisma generate
RUN npm run build

# Start server
CMD ["node", "dist/index.js"]
