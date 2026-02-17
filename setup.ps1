# Quick Setup Script for Windows PowerShell
# Run this with: .\setup.ps1
# If you get an error, first run: Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Chemical Materials Dashboard - Quick Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org/" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Check PostgreSQL (optional)
try {
    $psqlVersion = psql --version 2>$null
    Write-Host "✓ PostgreSQL installed: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ PostgreSQL not detected. That's OK! You can use Supabase (cloud database)." -ForegroundColor Yellow
    Write-Host "  Sign up at: https://supabase.com" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Setting up Backend..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Navigate to backend
Set-Location backend

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✓ Backend dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Backend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check for .env file
if (Test-Path ".env") {
    Write-Host "✓ Backend .env file exists" -ForegroundColor Green
} else {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "⚠ Please edit backend\.env and configure your DATABASE_URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Setting up Frontend..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Navigate to frontend
Set-Location ../frontend

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "✓ Frontend dependencies already installed" -ForegroundColor Green
} else {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install frontend dependencies" -ForegroundColor Red
        exit 1
    }
}

# Check for .env file
if (Test-Path ".env") {
    Write-Host "✓ Frontend .env file exists" -ForegroundColor Green
} else {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ Frontend .env file created" -ForegroundColor Green
}

# Return to root
Set-Location ..

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Configure your database:" -ForegroundColor White
Write-Host "   - Edit backend\.env and set DATABASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run database migrations:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npx prisma migrate dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the backend server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. In a new terminal, start the frontend:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Run scrapers to populate data:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run scrape" -ForegroundColor Gray
Write-Host ""
Write-Host "6. Open dashboard: http://localhost:3000" -ForegroundColor White
Write-Host ""QUICKSTART.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")or detailed instructions, see SETUP.md" -ForegroundColor Yellow
Write-Host ""
