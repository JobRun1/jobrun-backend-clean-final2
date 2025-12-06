FROM node:18-bullseye

# Set working directory
WORKDIR /app

# Copy backend files only
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json .

# Install dependencies
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Start app
CMD ["node", "dist/index.js"]
