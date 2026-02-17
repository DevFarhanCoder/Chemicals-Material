@echo off
echo ============================================
echo DATABASE SETUP HELPER
echo ============================================
echo.
echo This will help you set up PostgreSQL database
echo.

:menu
echo Choose your option:
echo 1. Create database (PostgreSQL already installed)
echo 2. Setup with Supabase (cloud-based, easier)
echo 3. Skip (I'll do it manually)
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" goto local_db
if "%choice%"=="2" goto supabase
if "%choice%"=="3" goto skip
echo Invalid choice!
goto menu

:local_db
echo.
echo ============================================
echo CREATING LOCAL DATABASE
echo ============================================
echo.
set /p password="Enter your PostgreSQL password: "
echo.
echo Creating database...
psql -U postgres -c "CREATE DATABASE chemicals_db;" 2>nul

if %errorlevel%==0 (
    echo [SUCCESS] Database created!
    echo.
    echo Your DATABASE_URL is:
    echo postgresql://postgres:%password%@localhost:5432/chemicals_db
    echo.
    echo Copy this to backend\.env file
) else (
    echo [ERROR] Failed to create database.
    echo Make sure PostgreSQL is installed and running.
    echo Windows services: postgres should be running
)
goto end

:supabase
echo.
echo ============================================
echo SUPABASE SETUP INSTRUCTIONS
echo ============================================
echo.
echo 1. Go to: https://supabase.com
echo 2. Sign up (free account)
echo 3. Create a new project
echo 4. Wait for it to initialize (2-3 minutes)
echo 5. Go to: Settings -^> Database
echo 6. Copy the "Connection string" (URI format)
echo 7. Paste it in backend\.env as DATABASE_URL
echo.
echo Example:
echo DATABASE_URL="postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres"
echo.
pause
goto end

:skip
echo.
echo You can set up the database later.
echo See FIX_ERRORS.md for detailed instructions.
echo.

:end
echo.
echo ============================================
echo NEXT STEPS
echo ============================================
echo.
echo 1. Edit backend\.env with your DATABASE_URL
echo 2. Run: cd backend
echo 3. Run: npx prisma generate
echo 4. Run: npx prisma migrate dev
echo.
pause
