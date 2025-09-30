# Multi-stage Dockerfile for AI-Powered QA Review Pipeline
# Stage 1: Build the React frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files for frontend
COPY package*.json ./
RUN npm ci --only=production

# Copy frontend source code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Build the backend (local-agent)
FROM node:18-alpine AS backend-builder

WORKDIR /app/local-agent

# Copy package files for backend
COPY local-agent/package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY local-agent/ .

# Generate Prisma client
RUN npx prisma generate

# Stage 3: Production image
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    git \
    openssh-client \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy backend application
COPY --from=backend-builder --chown=nodejs:nodejs /app/local-agent ./local-agent

# Copy built frontend to be served by backend
COPY --from=frontend-builder --chown=nodejs:nodejs /app/dist ./local-agent/public

# Create necessary directories
RUN mkdir -p /app/local-agent/workspaces && \
    chown -R nodejs:nodejs /app/local-agent/workspaces

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Set working directory to local-agent
WORKDIR /app/local-agent

# Start the application
CMD ["node", "index.js"]