FROM node:18-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    gcc \
    git

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    sqlite-dev \
    libc6-compat

# Install pnpm globally
RUN npm install -g pnpm@latest

# Create app directory
WORKDIR /app

# Copy package.json and related files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with pnpm and force rebuild of better-sqlite3
RUN pnpm install --frozen-lockfile
RUN cd node_modules/better-sqlite3 && \
    npm run build-release

# Copy project files
COPY . .

# Build TypeScript
RUN pnpm build

# Create directory for SQLite database
RUN mkdir -p /app/db && chmod -R 777 /app/db

# Make the entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose API port
EXPOSE 3001

# Set the entrypoint script
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start the API service
CMD ["pnpm", "start"] 