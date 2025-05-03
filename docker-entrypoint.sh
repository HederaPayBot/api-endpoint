#!/bin/sh
set -e

# Function to check if better-sqlite3 is properly built
check_sqlite() {
  echo "🔍 Checking SQLite native module..."
  if ! node -e "require('better-sqlite3')" > /dev/null 2>&1; then
    echo "❌ SQLite native module not working. Attempting to rebuild..."
    return 1
  else
    echo "✅ SQLite native module is working properly."
    return 0
  fi
}

# Check if SQLite is working, rebuild if not
if ! check_sqlite; then
  echo "🛠️ Rebuilding better-sqlite3 module..."
  cd /app/node_modules/better-sqlite3
  npm run build-release
  cd /app
  
  # Check again after rebuild
  if ! check_sqlite; then
    echo "❌ Failed to rebuild SQLite module. Please check your Docker setup."
    exit 1
  fi
fi

# Make sure the database directory exists and is writable
mkdir -p /app/db
chmod 777 /app/db

echo "🚀 Starting application..."
exec "$@" 