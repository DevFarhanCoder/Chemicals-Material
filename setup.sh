#!/bin/bash

# Quick Setup Script for Linux/Mac
# This script helps you get started quickly

echo "============================================"
echo "Chemical Materials Dashboard - Quick Setup"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${YELLOW}Checking prerequisites...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org/${NC}"
    exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version)
    echo -e "${GREEN}✓ PostgreSQL installed: $PSQL_VERSION${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not found. You'll need to install it or use a cloud database.${NC}"
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Setting up Backend...${NC}"
echo -e "${CYAN}============================================${NC}"

# Navigate to backend
cd backend

# Install dependencies
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
else
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backend dependencies installed${NC}"
    else
        echo -e "${RED}✗ Failed to install backend dependencies${NC}"
        exit 1
    fi
fi

# Create .env file
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Backend .env file exists${NC}"
else
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit backend/.env and configure your DATABASE_URL${NC}"
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}Setting up Frontend...${NC}"
echo -e "${CYAN}============================================${NC}"

# Navigate to frontend
cd ../frontend

# Install dependencies
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
else
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
        exit 1
    fi
fi

# Create .env file
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Frontend .env file exists${NC}"
else
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Frontend .env file created${NC}"
fi

# Return to root
cd ..

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo "1. Configure your database:"
echo "   - Edit backend/.env and set DATABASE_URL"
echo ""
echo "2. Run database migrations:"
echo "   cd backend"
echo "   npx prisma migrate dev"
echo ""
echo "3. Start the backend server:"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "4. In a new terminal, start the frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "5. Run scrapers to populate data:"
echo "   cd backend"
echo "   npm run scrape"
echo ""
echo "6. Open dashboard: http://localhost:3000"
echo ""
echo -e "${YELLOW}For detailed instructions, see SETUP.md${NC}"
echo ""
