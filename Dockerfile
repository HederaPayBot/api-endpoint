# Use Node.js Debian (slim) instead of Alpine to avoid SQLite compatibility issues
FROM node:18-slim AS builder

WORKDIR /app

# Install build dependencies for SQLite
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy only package.json first (pnpm-lock.yaml might be in .gitignore)
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies without rebuilding native modules yet
RUN pnpm install

# Copy source code
COPY . .

# Explicitly rebuild better-sqlite3
RUN cd node_modules/better-sqlite3 && npm run build-release

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Install runtime dependencies for SQLite and healthcheck
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy only package.json first
COPY package.json ./

# Install pnpm
RUN npm install -g pnpm

# Install only production dependencies without rebuilding native modules
RUN pnpm install --prod

# Copy the rebuilt better-sqlite3 module from builder stage
COPY --from=builder /app/node_modules/better-sqlite3 /app/node_modules/better-sqlite3

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create directory for SQLite database
RUN mkdir -p db
VOLUME /app/db

# Set environment variables
ENV NODE_ENV=production
# Use PORT from .env or default to 3001
ENV PORT=${PORT:-3001}

# Expose the port
EXPOSE ${PORT}

# Use the entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/index.js"] 