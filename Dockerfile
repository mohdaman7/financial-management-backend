# ========================================================
# Skyfall Financial & Travels ERP System - Multi-Stage Dockerfile
# Optimized for High Performance, Security & Lean Image Footprint
# ========================================================

# Stage 1: Build & Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

# Copy source code and build production bundle
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Install curl for health checking
RUN apk --no-cache add curl

# Install production dependencies only
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy compiled artifacts and configuration from builder
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./

# Set security context: Run as non-root user
USER node

# Expose API port
EXPOSE 5000

# Health check directive for Docker / Kubernetes / AWS ECS
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Start production server
CMD ["node", "dist/server.js"]
