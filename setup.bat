@echo off
echo ============================================
echo Chemical Materials Dashboard - Quick Setup
echo ============================================
echo.

echo [33mChecking prerequisites...[0m
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [31mNode.js not found! Please install Node.js 18+ from https://nodejs.org/[0m
    pause
    exit /b 1
)

echo [32mNode.js found[0m
node --version

echo.
echo ============================================
echo Setting up Backend...
echo ============================================
echo.

cd backend

if not exist "node_modules" (
    echo [33mInstalling backend dependencies...[0m
    call npm install
    if %errorlevel% neq 0 (
        echo [31mFailed to install backend dependencies[0m
        pause
        exit /b 1
    )
    echo [32mBackend dependencies installed[0m
) else (
    echo [32mBackend dependencies already installed[0m
)

if not exist ".env" (
    echo [33mCreating .env file...[0m
    copy .env.example .env >nul
    echo [33mPlease edit backend\.env and configure your DATABASE_URL[0m
)

echo.
echo ============================================
echo Setting up Frontend...
echo ============================================
echo.

cd ..\frontend

if not exist "node_modules" (
    echo [33mInstalling frontend dependencies...[0m
    call npm install
    if %errorlevel% neq 0 (
        echo [31mFailed to install frontend dependencies[0m
        pause
        exit /b 1
    )
    echo [32mFrontend dependencies installed[0m
) else (
    echo [32mFrontend dependencies already installed[0m
)

if not exist ".env" (
    echo [33mCreating .env file...[0m
    copy .env.example .env >nul
    echo [32mFrontend .env created[0m
)

cd ..

echo.
echo ============================================
echo [32mSetup Complete![0m
echo ============================================
echo.

echo [36mNext Steps:[0m
echo.
echo 1. Configure your database:
echo    - Edit backend\.env and set DATABASE_URL
echo.
echo 2. Run database migrations:
echo    cd backend
echo    npx prisma generate
echo    npx prisma migrate dev --name init
echo.
echo 3. Start the backend server:
echo    cd backend
echo    npm run dev
echo.
echo 4. In a NEW command prompt, start the frontend:
echo    cd frontend
echo    npm run dev
echo.
echo 5. Run scrapers to populate data:
echo    cd backend
echo    npm run scrape
echo.
echo 6. Open dashboard: http://localhost:3000
echo.
echo For detailed instructions, see QUICKSTART.md
echo.

pause
