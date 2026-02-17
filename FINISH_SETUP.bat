@echo off
color 0A
echo ========================================
echo   FINISH DATABASE SETUP
echo ========================================
echo.
echo This will complete your setup:
echo   1. Create the database
echo   2. Generate Prisma Client
echo   3. Run migrations
echo.
pause

cd /d "%~dp0backend"

echo.
echo ========================================
echo   STEP 1: Configure Database Credentials
echo ========================================
echo.
echo Please enter your PostgreSQL credentials:
echo.

set /p DB_USER="PostgreSQL Username (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASS="PostgreSQL Password: "
if "%DB_PASS%"=="" (
    echo ERROR: Password cannot be empty
    pause
    exit /b 1
)

set /p DB_PORT="PostgreSQL Port (default: 5432): "
if "%DB_PORT%"=="" set DB_PORT=5432

set DB_NAME=chemicals_db

echo.
echo Connection String:
echo postgresql://%DB_USER%:****@localhost:%DB_PORT%/%DB_NAME%?schema=public
echo.

REM Update .env file
powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=\".*\"', 'DATABASE_URL=\"postgresql://%DB_USER%:%DB_PASS%@localhost:%DB_PORT%/%DB_NAME%?schema=public\"' | Set-Content .env"

echo ✓ .env file updated
echo.

echo ========================================
echo   STEP 2: Create Database
echo ========================================
echo.
echo Running: psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"
echo.

psql -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo NOTE: If database already exists, that's OK!
    echo Press any key to continue...
    pause >nul
)

echo.
echo ========================================
echo   STEP 3: Generate Prisma Client
echo ========================================
echo.

call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Prisma generate failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   STEP 4: Run Database Migrations
echo ========================================
echo.

call npx prisma migrate dev --name init

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Migration failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✓ SETUP COMPLETE!
echo ========================================
echo.
echo Your database is ready!
echo.
echo Next Steps:
echo   1. Start Backend:  cd backend   npm run dev
echo   2. Start Frontend: cd frontend   npm run dev
echo   3. Open: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul
