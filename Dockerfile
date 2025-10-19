# Multi-stage build for production-ready WordPress Manager

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Override NODE_ENV for build stage to ensure devDependencies are installed
# Coolify injects NODE_ENV=production which would skip devDependencies
ENV NODE_ENV=development

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend (requires devDependencies like Vite, TypeScript, etc.)
RUN npm run build

# Stage 2: Build backend and final image
FROM node:20-alpine AS production

WORKDIR /app

# Set NODE_ENV to production for runtime
ENV NODE_ENV=production

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source code
COPY api ./api
COPY prisma ./prisma

# Copy configuration files
COPY tsconfig.json ./
COPY tsconfig.backend.json ./
COPY vite.config.ts ./

# Install TypeScript and build tools for Prisma
RUN npm install -D typescript @types/node prisma tsx

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript backend
RUN npx tsc --project tsconfig.backend.json

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node api/server.js"]

