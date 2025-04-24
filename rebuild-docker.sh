#!/bin/bash

set -e

echo "🛑 Stopping any running containers..."
docker compose down || true

echo "🧹 Removing old containers and images..."
docker rm -f hedera-twitter-api || true
docker rmi -f hedera-twitter-api || true

echo "🧹 Cleaning node_modules..."
rm -rf node_modules

echo "🧹 Cleaning SQLite database (optional - comment out if you want to keep data)"
# Comment the next line if you want to keep your database
rm -rf db/*

echo "🛠️ Building new Docker image..."
docker compose build --no-cache

echo "🚀 Starting Docker container..."
docker compose up -d

echo "🔍 Checking container status..."
docker ps -a | grep hedera-twitter-api

echo "📋 Container logs (press Ctrl+C to exit):"
docker compose logs -f 