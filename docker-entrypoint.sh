#!/bin/sh
set -e

# Initialize database if needed
if [ ! -f /app/db/database.sqlite ]; then
  echo "Initializing database..."
  pnpm db:setup
fi

# Execute the command passed to docker run
exec "$@" 