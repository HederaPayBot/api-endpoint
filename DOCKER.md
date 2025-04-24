# Docker Setup for Hedera Twitter API

This guide will help you set up the Hedera Twitter API using Docker, which solves SQLite issues on Mac M1.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- Basic familiarity with Docker commands

## Quick Start for Mac M1 Users

We've created a special rebuild script to ensure everything works on Mac M1:

```bash
# Make the script executable
chmod +x rebuild-docker.sh

# Run the rebuild script (this will completely rebuild the container)
./rebuild-docker.sh
```

This script will:
1. Stop and remove any existing containers
2. Remove the Docker image
3. Clean node_modules and database files
4. Build a new Docker image with proper SQLite bindings
5. Start the container and show logs

## Manual Setup

If you prefer to run commands manually:

### 1. Build the Docker image

```bash
pnpm docker:build
# or
docker compose build
```

### 2. Start the Docker container

```bash
pnpm docker:start
# or
docker compose up -d
```

### 3. View the logs

```bash
pnpm docker:logs
# or
docker compose logs -f
```

### 4. Stop the Docker container

```bash
pnpm docker:stop
# or
docker compose down
```

## Troubleshooting SQLite Issues on Mac M1

If you encounter SQLite binding issues, try:

1. Clean rebuild with our script:
   ```bash
   ./rebuild-docker.sh
   ```

2. Manual SQLite rebuild:
   ```bash
   # Stop containers
   docker compose down
   
   # Remove images
   docker rmi hedera-twitter-api
   
   # Build with no cache
   docker compose build --no-cache
   
   # Start container
   docker compose up -d
   ```

3. Check the container logs:
   ```bash
   docker compose logs
   ```

## What's Included

The Docker setup includes:

- Auto-rebuilding of better-sqlite3 native bindings
- Proper SQLite dependencies for Alpine Linux
- An entrypoint script that checks for bindings
- Persistent volume for the SQLite database

## Configuration

The Docker setup uses these environment variables (set in `.env`):

- `PORT` - The port the API will run on (default: 3001)
- `SQLITE_DB_PATH` - Path to the SQLite database file (default: `/app/db/hedera-twitter.db`)
- `HEDERA_NETWORK` - Hedera network to use (default: `testnet`)
- `HEDERA_OPERATOR_ID` - Your Hedera account ID
- `HEDERA_OPERATOR_KEY` - Your Hedera private key

## Accessing the API

Once running, the API will be available at:

- API base URL: `http://localhost:3001`
- Health check: `http://localhost:3001/health`
- API docs: `http://localhost:3001/api/docs`

## Troubleshooting

### Database Permissions

If you encounter database permission issues:

```bash
# Ensure the db directory has proper permissions
chmod -R 777 db
```

### Container Won't Start

Check the logs for errors:

```bash
docker compose logs
```

### SQLite Issues

The Docker container uses Alpine Linux with SQLite libraries pre-installed, which should resolve any M1 Mac-specific SQLite issues.

## Docker Architecture Notes

- The Docker image uses Alpine Linux for a small footprint
- SQLite and its dependencies are pre-installed
- We use a multi-stage build to reduce image size
- The database file is stored in a volume for persistence 