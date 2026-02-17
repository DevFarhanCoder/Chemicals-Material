@echo off
cls
echo ============================================
echo CHEMICAL MATERIALS DASHBOARD
echo Complete Installation Script
echo ============================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed
echo.

:: ============================================
:: BACKEND SETUP
:: ============================================
echo ============================================
echo STEP 1: Backend Setup
echo ============================================
echo.

cd backend

echo Installing backend dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
echo.

:: Create .env if doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env >nul
    echo [OK] .env file created
    echo.
    echo [ACTION REQUIRED] Please edit backend\.env and set your DATABASE_URL
    echo Press any key to open .env in notepad...
    pause >nul
    notepad .env
) else (
    echo [OK] .env file already exists
)
echo.

cd ..

:: ============================================
:: FRONTEND SETUP
:: ============================================
echo ============================================
echo STEP 2: Frontend Setup
echo ============================================
echo.

cd frontend

echo Installing frontend dependencies...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.

:: Create .env if doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env >nul
    echo [OK] .env file created
)
echo.

cd ..

:: ============================================
:: DATABASE SETUP
:: ============================================
echo ============================================
echo STEP 3: Database Setup
echo ============================================
echo.
echo Choose database option:
echo 1. Setup PostgreSQL locally (I have PostgreSQL installed)
echo 2. Use Supabase (cloud-based, easier, free)
echo 3. Skip for now (I'll do it manually)
echo.
set /p dbchoice="Enter choice (1-3): "
echo.

if "%dbchoice%"=="1" (
    echo.
    echo [INFO] Make sure PostgreSQL is running
    set /p pgpassword="Enter PostgreSQL password for user 'postgres': "
    
    echo Creating database...
    psql -U postgres -c "CREATE DATABASE chemicals_db;" 2>nul
    
    if %errorlevel%==0 (
        echo [OK] Database created successfully!
        echo.
        echo Updating backend\.env...
        cd backend
        echo DATABASE_URL="postgresql://postgres:%pgpassword%@localhost:5432/chemicals_db?schema=public" > .env.temp
        echo PORT=5000 >> .env.temp
        echo NODE_ENV=development >> .env.temp
        echo CORS_ORIGIN=http://localhost:3000 >> .env.temp
        echo SCRAPING_CONCURRENCY=2 >> .env.temp
        echo SCRAPING_RATE_LIMIT_MS=2000 >> .env.temp
        echo SCRAPING_MAX_RETRIES=3 >> .env.temp
        echo SCRAPING_TIMEOUT_MS=30000 >> .env.temp
        echo HEADLESS_BROWSER=true >> .env.temp
        echo API_RATE_LIMIT_WINDOW_MS=900000 >> .env.temp
        echo API_RATE_LIMIT_MAX_REQUESTS=100 >> .env.temp
        echo LOG_LEVEL=info >> .env.temp
        move /y .env.temp .env >nul
        
        echo Generating Prisma client...
        call npx prisma generate
        
        echo Running database migrations...
        call npx prisma migrate dev --name init
        
        if %errorlevel%==0 (
            echo [OK] Database setup complete!
        ) else (
            echo [ERROR] Migration failed. Check your database connection.
        )
        cd ..
    ) else (
        echo [ERROR] Failed to create database
        echo Make sure PostgreSQL is running and password is correct
    )
)

if "%dbchoice%"=="2" (
    echo.
    echo ============================================
    echo SUPABASE SETUP INSTRUCTIONS
    echo ============================================
    echo.
    echo 1. Open browser: https://supabase.com
    echo 2. Sign up for free account
    echo 3. Create a new project
    echo 4. Wait for initialization (2-3 min)
    echo 5. Go to: Settings -^> Database
    echo 6. Copy "Connection string" (URI format)
    echo 7. Paste it in the next step
    echo.
    echo Press any key when you have the connection string...
    pause >nul
    echo.
    set /p supabase_url="Paste your Supabase connection string: "
    
    cd backend
    echo DATABASE_URL="%supabase_url%" > .env.temp
    echo PORT=5000 >> .env.temp
    echo NODE_ENV=development >> .env.temp
    echo CORS_ORIGIN=http://localhost:3000 >> .env.temp
    echo SCRAPING_CONCURRENCY=2 >> .env.temp
    echo SCRAPING_RATE_LIMIT_MS=2000 >> .env.temp
    echo SCRAPING_MAX_RETRIES=3 >> .env.temp
    echo SCRAPING_TIMEOUT_MS=30000 >> .env.temp
    echo HEADLESS_BROWSER=true >> .env.temp
    echo API_RATE_LIMIT_WINDOW_MS=900000 >> .env.temp
    echo API_RATE_LIMIT_MAX_REQUESTS=100 >> .env.temp
    echo LOG_LEVEL=info >> .env.temp
    move /y .env.temp .env >nul
    
    echo Generating Prisma client...
    call npx prisma generate
    
    echo Running database migrations...
    call npx prisma migrate dev --name init
    
    if %errorlevel%==0 (
        echo [OK] Database setup complete!
    ) else (
        echo [ERROR] Migration failed. Check your connection string.
    )
    cd ..
)

if "%dbchoice%"=="3" (
    echo.
    echo [SKIPPED] Database setup
    echo.
    echo You'll need to:
    echo 1. Configure DATABASE_URL in backend\.env
    echo 2. Run: cd backend
    echo 3. Run: npx prisma generate
    echo 4. Run: npx prisma migrate dev
    echo.
)

:: ============================================
:: COMPLETION
:: ============================================
echo.
echo ============================================
echo INSTALLATION COMPLETE!
echo ============================================
echo.
echo To start the application:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm run dev
echo.
echo Terminal 2 - Frontend:
echo   cd frontend
echo   npm run dev
echo.
echo Terminal 3 - Run Scrapers (after backend starts):
echo   cd backend
echo   npm run scrape
echo.
echo Dashboard will be at: http://localhost:3000
echo.
echo See FIX_ERRORS.md for troubleshooting
echo.
pause
