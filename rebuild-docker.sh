#!/bin/bash

echo "🛑 Stopping any running containers..."
docker compose down

echo "🗑️ Removing Docker image..."
docker rmi hedera-twitter-api || true

echo "🧹 Cleaning node_modules from the container..."
docker volume prune -f

echo "🔄 Rebuilding container from scratch..."
docker compose build --no-cache

echo "🚀 Starting container..."
docker compose up -d

echo "⏳ Waiting for container to initialize..."
sleep 5

echo "📋 Showing logs (press Ctrl+C to exit logs)..."
docker compose logs -f 