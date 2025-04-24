#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Hedera Twitter API Docker Debug =====${NC}"

# Check if Docker is running
echo -e "${BLUE}Checking if Docker is running...${NC}"
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Docker is running${NC}"
fi

# Check .env file
echo -e "${BLUE}Checking .env file...${NC}"
if [ -f .env ]; then
  echo -e "${GREEN}✅ .env file exists${NC}"
  
  # Check for required environment variables
  echo -e "${BLUE}Checking for required environment variables...${NC}"
  if grep -q "HEDERA_ACCOUNT_ID" .env && grep -q "HEDERA_PRIVATE_KEY" .env; then
    echo -e "${GREEN}✅ Required environment variables found${NC}"
  else
    echo -e "${RED}❌ Required environment variables missing${NC}"
    echo -e "   Please make sure your .env file contains:"
    echo -e "   - HEDERA_ACCOUNT_ID"
    echo -e "   - HEDERA_PRIVATE_KEY"
  fi
else
  echo -e "${RED}❌ .env file not found${NC}"
  if [ -f .env.example ]; then
    echo -e "   Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
    echo -e "   Please edit .env and add your Hedera credentials"
  else
    echo -e "   No .env.example file found. Please create a .env file manually."
  fi
fi

# Check db directory
echo -e "${BLUE}Checking db directory...${NC}"
if [ -d db ]; then
  echo -e "${GREEN}✅ db directory exists${NC}"
else
  echo -e "${RED}❌ db directory not found${NC}"
  echo -e "   Creating db directory..."
  mkdir -p db
  chmod 777 db
  echo -e "${GREEN}✅ Created db directory${NC}"
fi

# Check SQLite bindings
echo -e "${BLUE}Running SQLite test...${NC}"
echo -e "   Creating temporary Docker container for testing..."
if docker run --rm -it \
  -v $(pwd)/db:/app/db \
  -v $(pwd)/.env:/app/.env \
  --name hedera-debug-container \
  api-endpoint-api \
  node -e "try { require('better-sqlite3')('test.db'); console.log('SQLite test successful!'); } catch (e) { console.error('SQLite test failed:', e.message); process.exit(1); }" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ SQLite bindings test successful${NC}"
else
  echo -e "${RED}❌ SQLite bindings test failed${NC}"
  echo -e "   Try running ./rebuild-docker.sh to rebuild the Docker container"
fi

# Show container status
echo -e "${BLUE}Checking container status...${NC}"
if docker ps | grep -q hedera-twitter-api; then
  echo -e "${GREEN}✅ Container is running${NC}"
  docker ps -a | grep hedera-twitter-api
else
  echo -e "${RED}❌ Container is not running${NC}"
  
  # Check if container exists
  if docker ps -a | grep -q hedera-twitter-api; then
    echo -e "   Container exists but is not running"
    echo -e "   Last container logs:"
    docker logs hedera-twitter-api --tail 20
  else
    echo -e "   Container does not exist"
  fi
fi

echo -e "${BLUE}===== Debug Complete =====${NC}"
echo -e "${BLUE}If you continue to have issues, try:${NC}"
echo -e "1. ${GREEN}./rebuild-docker.sh${NC} to completely rebuild the container"
echo -e "2. ${GREEN}docker compose logs -f${NC} to see detailed logs"
echo -e "3. ${GREEN}docker exec -it hedera-twitter-api sh${NC} to access the container shell" 