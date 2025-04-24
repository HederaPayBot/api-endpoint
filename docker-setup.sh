#!/bin/bash

# Set script to exit on error
set -e

# Function to print colored text
print_colored() {
  echo -e "\e[1;34m$1\e[0m"
}

# Function to wait for user confirmation
confirm() {
  read -p "$1 (y/n): " response
  case "$response" in
    [yY][eE][sS]|[yY]) 
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Print welcome message
print_colored "====== Hedera Twitter API Docker Setup ======"
print_colored "This script will help you set up the Hedera Twitter API in Docker."

# Check for Docker installation
if ! command -v docker &> /dev/null; then
  echo "Docker is not installed. Please install Docker first."
  exit 1
fi

if ! command -v docker compose &> /dev/null; then
  echo "Docker Compose is not installed. Please install Docker Compose first."
  exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    print_colored "\nCreating .env file from .env.example..."
    cp .env.example .env
    echo "Created .env file. Please edit it with your configuration values."
  else
    echo "No .env.example file found. Please create a .env file manually."
    exit 1
  fi
fi

# Create db directory if it doesn't exist
if [ ! -d "db" ]; then
  print_colored "\nCreating db directory..."
  mkdir -p db
  chmod 777 db
fi

# Build and start containers
print_colored "\nBuilding and starting Docker containers..."
docker compose build
docker compose up -d

# Check if containers started successfully
if [ $? -eq 0 ]; then
  print_colored "\n✅ Hedera Twitter API is now running in Docker!"
  print_colored "API is available at http://localhost:3001"
  print_colored "\nUseful commands:"
  print_colored "- View logs: docker compose logs -f"
  print_colored "- Stop containers: docker compose down"
  print_colored "- Restart containers: docker compose restart"
else
  print_colored "\n❌ Failed to start Docker containers. Check the logs for errors."
fi 