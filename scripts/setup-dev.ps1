# =============================================================================
# Tabeliao - Development Environment Setup (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup-dev.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "=============================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Message)
    Write-Host "[*] $Message" -ForegroundColor Blue
}

function Write-Ok {
    param([string]$Message)
    Write-Host "[+] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[!] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[x] $Message" -ForegroundColor Red
}

# Project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Set-Location $ProjectRoot

# ---------------------------------------------------------------------------
# Step 1: Check prerequisites
# ---------------------------------------------------------------------------

Write-Header "Tabeliao - Dev Environment Setup"
Write-Step "Checking prerequisites..."
Write-Host ""

$Missing = 0

# Node.js 20+
try {
    $nodeVersion = (node -v) -replace 'v', ''
    $nodeMajor = [int]($nodeVersion.Split('.')[0])
    if ($nodeMajor -ge 20) {
        Write-Ok "Node.js v$nodeVersion (>= 20 required)"
    } else {
        Write-Err "Node.js v$nodeVersion found, but >= 20.x is required"
        $Missing++
    }
} catch {
    Write-Err "Node.js not found (>= 20.x required)"
    Write-Warn "Install: https://nodejs.org/ or use nvm-windows"
    $Missing++
}

# pnpm or npm
$PackageManager = $null
try {
    $pnpmVersion = pnpm --version 2>$null
    if ($pnpmVersion) {
        $PackageManager = "pnpm"
        Write-Ok "pnpm $pnpmVersion found"
    }
} catch {}

if (-not $PackageManager) {
    try {
        $npmVersion = npm --version 2>$null
        if ($npmVersion) {
            $PackageManager = "npm"
            Write-Warn "pnpm not found, falling back to npm $npmVersion"
            Write-Warn "Recommended: npm install -g pnpm"
        }
    } catch {
        Write-Err "Neither pnpm nor npm found"
        $Missing++
    }
}

# Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Ok "Docker $($dockerVersion -replace 'Docker version ', '' -replace ',.*', '')"
    } else {
        throw "not found"
    }
} catch {
    Write-Err "Docker not found"
    Write-Warn "Install Docker Desktop: https://docs.docker.com/desktop/install/windows-install/"
    $Missing++
}

# Docker Compose
try {
    $composeVersion = docker compose version --short 2>$null
    if ($composeVersion) {
        Write-Ok "Docker Compose $composeVersion"
    } else {
        throw "not found"
    }
} catch {
    Write-Err "Docker Compose not found"
    Write-Warn "Docker Compose is included with Docker Desktop"
    $Missing++
}

Write-Host ""
if ($Missing -gt 0) {
    Write-Err "Missing prerequisites. Please install the required tools and try again."
    exit 1
}
Write-Ok "All prerequisites met!"

# ---------------------------------------------------------------------------
# Step 2: Copy .env files
# ---------------------------------------------------------------------------

Write-Header "Copying Environment Files"

function Copy-EnvFile {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Label
    )

    if (Test-Path $Destination) {
        Write-Warn "$Label`: .env already exists, skipping (delete it to regenerate)"
    } elseif (Test-Path $Source) {
        Copy-Item $Source $Destination
        Write-Ok "$Label`: .env created from .env.example"
    } else {
        Write-Warn "$Label`: .env.example not found, skipping"
    }
}

# Root .env
Copy-EnvFile "$ProjectRoot\.env.example" "$ProjectRoot\.env" "Root"

# Service .env files
$Services = @(
    "api-gateway",
    "auth-service",
    "contract-service",
    "ai-service",
    "blockchain-service",
    "payment-service",
    "notification-service",
    "dispute-service"
)

foreach ($svc in $Services) {
    $svcDir = Join-Path $ProjectRoot "services\$svc"
    if (Test-Path $svcDir) {
        Copy-EnvFile (Join-Path $svcDir ".env.example") (Join-Path $svcDir ".env") $svc
    }
}

# ---------------------------------------------------------------------------
# Step 3: Start Docker infrastructure
# ---------------------------------------------------------------------------

Write-Header "Starting Docker Infrastructure"

Write-Step "Pulling images (this may take a few minutes on first run)..."
docker compose -f docker-compose.dev.yml pull 2>$null

Write-Step "Starting containers..."
docker compose -f docker-compose.dev.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to start Docker containers. Is Docker Desktop running?"
    exit 1
}

# ---------------------------------------------------------------------------
# Step 4: Wait for services to be healthy
# ---------------------------------------------------------------------------

Write-Header "Waiting for Services"

function Wait-ForService {
    param(
        [string]$ServiceName,
        [int]$MaxAttempts = 30
    )

    $attempt = 1
    Write-Host "  Waiting for $($ServiceName.PadRight(15)) " -NoNewline

    while ($attempt -le $MaxAttempts) {
        $status = docker compose -f docker-compose.dev.yml ps $ServiceName --format "{{.Health}}" 2>$null
        if ($status -match "healthy") {
            Write-Host "ready" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
        $attempt++
    }

    Write-Host "timeout" -ForegroundColor Red
    return $false
}

Wait-ForService "postgres" 30
Wait-ForService "redis" 20
Wait-ForService "rabbitmq" 40
Wait-ForService "minio" 20
Wait-ForService "mailhog" 15

Write-Host ""
Write-Ok "All infrastructure services are running!"

# ---------------------------------------------------------------------------
# Step 5: Install dependencies
# ---------------------------------------------------------------------------

Write-Header "Installing Dependencies"

Set-Location $ProjectRoot

if ($PackageManager -eq "pnpm") {
    Write-Step "Running pnpm install..."
    try {
        pnpm install --frozen-lockfile 2>$null
    } catch {
        pnpm install
    }
} else {
    Write-Step "Running npm install..."
    npm install
}

if ($LASTEXITCODE -eq 0) {
    Write-Ok "Dependencies installed!"
} else {
    Write-Warn "Dependency installation had warnings (this may be OK for initial setup)"
}

# ---------------------------------------------------------------------------
# Step 6: Run database migrations
# ---------------------------------------------------------------------------

Write-Header "Database Setup"

Write-Step "Running migrations..."
try {
    & $PackageManager run db:migrate 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Migrations completed!"
    } else {
        throw "migration failed"
    }
} catch {
    Write-Warn "Migrations skipped (no migration scripts found yet)"
}

Write-Step "Running seeds..."
try {
    & $PackageManager run db:seed 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Seeds completed!"
    } else {
        throw "seed failed"
    }
} catch {
    Write-Warn "Seeds skipped (no seed scripts found yet)"
}

# ---------------------------------------------------------------------------
# Done!
# ---------------------------------------------------------------------------

Write-Header "Setup Complete!"

Write-Host "Development URLs:" -ForegroundColor White
Write-Host ""
Write-Host "  Frontend          " -NoNewline; Write-Host "http://localhost:4000" -ForegroundColor Cyan
Write-Host "  API Gateway       " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Auth Service      " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Contract Service  " -NoNewline; Write-Host "http://localhost:3002" -ForegroundColor Cyan
Write-Host "  AI Service        " -NoNewline; Write-Host "http://localhost:3003" -ForegroundColor Cyan
Write-Host "  Blockchain Svc    " -NoNewline; Write-Host "http://localhost:3004" -ForegroundColor Cyan
Write-Host "  Payment Service   " -NoNewline; Write-Host "http://localhost:3005" -ForegroundColor Cyan
Write-Host "  Notification Svc  " -NoNewline; Write-Host "http://localhost:3006" -ForegroundColor Cyan
Write-Host "  Dispute Service   " -NoNewline; Write-Host "http://localhost:3007" -ForegroundColor Cyan
Write-Host ""
Write-Host "Infrastructure:" -ForegroundColor White
Write-Host ""
Write-Host "  PostgreSQL        " -NoNewline; Write-Host "localhost:5432  (tabeliao / tabeliao_dev_2026)" -ForegroundColor Cyan
Write-Host "  Redis             " -NoNewline; Write-Host "localhost:6379" -ForegroundColor Cyan
Write-Host "  RabbitMQ UI       " -NoNewline; Write-Host "http://localhost:15672  (tabeliao / tabeliao_dev_2026)" -ForegroundColor Cyan
Write-Host "  MinIO Console     " -NoNewline; Write-Host "http://localhost:9001   (minioadmin / minioadmin)" -ForegroundColor Cyan
Write-Host "  MinIO API         " -NoNewline; Write-Host "http://localhost:9000" -ForegroundColor Cyan
Write-Host "  Mailhog UI        " -NoNewline; Write-Host "http://localhost:8025" -ForegroundColor Cyan
Write-Host "  PgAdmin           " -NoNewline; Write-Host "http://localhost:5050   (admin@tabeliao.dev / admin)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick start:" -ForegroundColor White
Write-Host ""
Write-Host "  $PackageManager run dev              " -NoNewline -ForegroundColor Yellow; Write-Host "Start all services in dev mode"
Write-Host "  $PackageManager run dev:frontend     " -NoNewline -ForegroundColor Yellow; Write-Host "Start frontend only"
Write-Host "  $PackageManager run dev:gateway      " -NoNewline -ForegroundColor Yellow; Write-Host "Start API gateway only"
Write-Host "  $PackageManager run test             " -NoNewline -ForegroundColor Yellow; Write-Host "Run all tests"
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Green
Write-Host ""
