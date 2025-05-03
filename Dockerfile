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

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies without rebuilding native modules yet
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Explicitly rebuild better-sqlite3
RUN cd node_modules/better-sqlite3 && npm run build-release

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-slim

WORKDIR /app

# Install runtime dependencies for SQLite
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install only production dependencies without rebuilding native modules
RUN pnpm install --prod --frozen-lockfile

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
ENV PORT=3001

# Expose the port
EXPOSE 3001

# Use the entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the application
CMD ["node", "dist/index.js"] 