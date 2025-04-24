#!/bin/bash

set -e

echo "🛑 Stopping any running containers..."
docker compose down || true

echo "🧹 Removing old containers and images..."
docker rm -f hedera-twitter-api || true
docker rmi -f api-endpoint-api || true

echo "🧹 Cleaning node_modules..."
rm -rf node_modules

echo "🧹 Cleaning SQLite database (optional - comment out if you want to keep data)"
# Comment the next line if you want to keep your database
rm -rf db/*

echo "🛠️ Building new Docker image..."
docker compose build --no-cache

echo "🚀 Starting test container..."
docker run --rm -it \
  -v $(pwd)/db:/app/db \
  -v $(pwd)/.env:/app/.env \
  --name hedera-test-container \
  api-endpoint-api \
  node test-container.js

echo "✅ Container test completed!" 