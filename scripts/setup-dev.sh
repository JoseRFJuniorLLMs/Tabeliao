#!/usr/bin/env bash
# =============================================================================
# Tabeliao - Development Environment Setup (Linux/macOS)
# Usage: bash scripts/setup-dev.sh
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Project root (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

print_header() {
    echo ""
    echo -e "${CYAN}=============================================${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${CYAN}=============================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}[*]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[x]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 found: $($1 --version 2>/dev/null | head -n1)"
        return 0
    else
        print_error "$1 not found"
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Step 1: Check prerequisites
# ---------------------------------------------------------------------------

print_header "Tabeliao - Dev Environment Setup"

print_step "Checking prerequisites..."
echo ""

MISSING=0

# Node.js 20+
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        print_success "Node.js $(node -v) (>= 20 required)"
    else
        print_error "Node.js $(node -v) found, but >= 20.x is required"
        MISSING=1
    fi
else
    print_error "Node.js not found (>= 20.x required)"
    print_warning "Install: https://nodejs.org/ or use nvm"
    MISSING=1
fi

# pnpm (preferred) or npm
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
    print_success "pnpm $(pnpm --version) found"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
    print_warning "pnpm not found, falling back to npm $(npm --version)"
    print_warning "Recommended: npm install -g pnpm"
else
    print_error "Neither pnpm nor npm found"
    MISSING=1
fi

# Docker
if command -v docker &> /dev/null; then
    print_success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
    print_error "Docker not found"
    print_warning "Install: https://docs.docker.com/get-docker/"
    MISSING=1
fi

# Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose $(docker compose version --short 2>/dev/null || echo 'available')"
elif command -v docker-compose &> /dev/null; then
    print_success "docker-compose $(docker-compose --version | awk '{print $4}' | tr -d ',')"
    COMPOSE_CMD="docker-compose"
else
    print_error "Docker Compose not found"
    MISSING=1
fi

# Set compose command
COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"

echo ""
if [ "$MISSING" -ne 0 ]; then
    print_error "Missing prerequisites. Please install the required tools and try again."
    exit 1
fi
print_success "All prerequisites met!"

# ---------------------------------------------------------------------------
# Step 2: Copy .env files
# ---------------------------------------------------------------------------

print_header "Copying Environment Files"

copy_env() {
    local src="$1"
    local dest="$2"
    local label="$3"

    if [ -f "$dest" ]; then
        print_warning "$label: .env already exists, skipping (delete it to regenerate)"
    elif [ -f "$src" ]; then
        cp "$src" "$dest"
        print_success "$label: .env created from .env.example"
    else
        print_warning "$label: .env.example not found, skipping"
    fi
}

# Root .env
copy_env "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env" "Root"

# Service .env files
SERVICES=(
    "api-gateway"
    "auth-service"
    "contract-service"
    "ai-service"
    "blockchain-service"
    "payment-service"
    "notification-service"
    "dispute-service"
)

for svc in "${SERVICES[@]}"; do
    SVC_DIR="$PROJECT_ROOT/services/$svc"
    if [ -d "$SVC_DIR" ]; then
        copy_env "$SVC_DIR/.env.example" "$SVC_DIR/.env" "$svc"
    fi
done

# ---------------------------------------------------------------------------
# Step 3: Start Docker infrastructure
# ---------------------------------------------------------------------------

print_header "Starting Docker Infrastructure"

print_step "Pulling images (this may take a few minutes on first run)..."
cd "$PROJECT_ROOT"
$COMPOSE_CMD -f docker-compose.dev.yml pull --quiet 2>/dev/null || true

print_step "Starting containers..."
$COMPOSE_CMD -f docker-compose.dev.yml up -d

# ---------------------------------------------------------------------------
# Step 4: Wait for services to be healthy
# ---------------------------------------------------------------------------

print_header "Waiting for Services"

wait_for_service() {
    local service="$1"
    local max_attempts="${2:-30}"
    local attempt=1

    printf "  Waiting for %-15s " "$service..."
    while [ $attempt -le $max_attempts ]; do
        if $COMPOSE_CMD -f docker-compose.dev.yml ps "$service" 2>/dev/null | grep -q "healthy"; then
            echo -e "${GREEN}ready${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e "${RED}timeout${NC}"
    return 1
}

wait_for_service "postgres" 30
wait_for_service "redis" 20
wait_for_service "rabbitmq" 40
wait_for_service "minio" 20
wait_for_service "mailhog" 15

echo ""
print_success "All infrastructure services are running!"

# ---------------------------------------------------------------------------
# Step 5: Install dependencies
# ---------------------------------------------------------------------------

print_header "Installing Dependencies"

cd "$PROJECT_ROOT"

if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
    print_step "Running pnpm install..."
    pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
    print_step "Running npm install..."
    npm install
fi

print_success "Dependencies installed!"

# ---------------------------------------------------------------------------
# Step 6: Run database migrations
# ---------------------------------------------------------------------------

print_header "Database Setup"

print_step "Running migrations..."
if $PACKAGE_MANAGER run db:migrate 2>/dev/null; then
    print_success "Migrations completed!"
else
    print_warning "Migrations skipped (no migration scripts found yet)"
fi

print_step "Running seeds..."
if $PACKAGE_MANAGER run db:seed 2>/dev/null; then
    print_success "Seeds completed!"
else
    print_warning "Seeds skipped (no seed scripts found yet)"
fi

# ---------------------------------------------------------------------------
# Done!
# ---------------------------------------------------------------------------

print_header "Setup Complete!"

echo -e "${BOLD}Development URLs:${NC}"
echo ""
echo -e "  ${CYAN}Frontend${NC}          http://localhost:4000"
echo -e "  ${CYAN}API Gateway${NC}       http://localhost:3000"
echo -e "  ${CYAN}Auth Service${NC}      http://localhost:3001"
echo -e "  ${CYAN}Contract Service${NC}  http://localhost:3002"
echo -e "  ${CYAN}AI Service${NC}        http://localhost:3003"
echo -e "  ${CYAN}Blockchain Svc${NC}    http://localhost:3004"
echo -e "  ${CYAN}Payment Service${NC}   http://localhost:3005"
echo -e "  ${CYAN}Notification Svc${NC}  http://localhost:3006"
echo -e "  ${CYAN}Dispute Service${NC}   http://localhost:3007"
echo ""
echo -e "${BOLD}Infrastructure:${NC}"
echo ""
echo -e "  ${CYAN}PostgreSQL${NC}        localhost:5432  (tabeliao / tabeliao_dev_2026)"
echo -e "  ${CYAN}Redis${NC}             localhost:6379"
echo -e "  ${CYAN}RabbitMQ UI${NC}       http://localhost:15672  (tabeliao / tabeliao_dev_2026)"
echo -e "  ${CYAN}MinIO Console${NC}     http://localhost:9001   (minioadmin / minioadmin)"
echo -e "  ${CYAN}MinIO API${NC}         http://localhost:9000"
echo -e "  ${CYAN}Mailhog UI${NC}        http://localhost:8025"
echo -e "  ${CYAN}PgAdmin${NC}           http://localhost:5050   (admin@tabeliao.dev / admin)"
echo ""
echo -e "${BOLD}Quick start:${NC}"
echo ""
echo -e "  ${YELLOW}$PACKAGE_MANAGER run dev${NC}              Start all services in dev mode"
echo -e "  ${YELLOW}$PACKAGE_MANAGER run dev:frontend${NC}     Start frontend only"
echo -e "  ${YELLOW}$PACKAGE_MANAGER run dev:gateway${NC}      Start API gateway only"
echo -e "  ${YELLOW}$PACKAGE_MANAGER run test${NC}             Run all tests"
echo ""
echo -e "${GREEN}Happy coding! ${NC}"
echo ""
