#!/bin/bash

# =============================================================================
# RetailApp Podman Compose Deployment Script
# =============================================================================
# This script automates the deployment of the RetailApp using Podman Compose
#
# Usage:
#   ./deploy-podman.sh [command]
#
# Commands:
#   setup     - Initial setup (create directories, copy env file)
#   build     - Build all container images
#   start     - Start all services
#   stop      - Stop all services
#   restart   - Restart all services
#   status    - Show service status
#   logs      - Show logs for all services
#   clean     - Stop and remove all containers, networks, and volumes
#   backup    - Backup PostgreSQL database
#   help      - Show this help message
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="podman-compose.yml"
ENV_FILE=".env"
ENV_TEMPLATE=".env.example"
DATA_DIR="data/postgres"
BACKUP_DIR="backups"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if podman is installed
    if ! command -v podman &> /dev/null; then
        print_error "Podman is not installed. Please install Podman first."
        echo "Visit: https://podman.io/getting-started/installation"
        exit 1
    fi
    print_success "Podman is installed: $(podman --version)"
    
    # Check if podman-compose is installed
    if ! command -v podman-compose &> /dev/null; then
        print_error "Podman Compose is not installed. Please install it first."
        echo "Run: pip3 install podman-compose"
        exit 1
    fi
    print_success "Podman Compose is installed: $(podman-compose --version)"
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    print_success "Compose file found: $COMPOSE_FILE"
    
    echo ""
}

setup() {
    print_header "Initial Setup"
    
    # Create data directory
    if [ ! -d "$DATA_DIR" ]; then
        mkdir -p "$DATA_DIR"
        print_success "Created data directory: $DATA_DIR"
    else
        print_info "Data directory already exists: $DATA_DIR"
    fi
    
    # Create backup directory
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_success "Created backup directory: $BACKUP_DIR"
    else
        print_info "Backup directory already exists: $BACKUP_DIR"
    fi
    
    # Copy environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f "$ENV_TEMPLATE" ]; then
            cp "$ENV_TEMPLATE" "$ENV_FILE"
            print_success "Created environment file: $ENV_FILE"
            print_warning "Please edit $ENV_FILE with your actual configuration values"
            print_info "Required: IBM_VERIFY_CLIENT_ID, IBM_VERIFY_CLIENT_SECRET"
            print_info "Generate secrets: openssl rand -base64 32"
        else
            print_error "Environment template not found: $ENV_TEMPLATE"
            exit 1
        fi
    else
        print_info "Environment file already exists: $ENV_FILE"
    fi
    
    # Check if critical environment variables are set
    if [ -f "$ENV_FILE" ]; then
        source "$ENV_FILE"
        
        if [ -z "$IBM_VERIFY_CLIENT_ID" ] || [ "$IBM_VERIFY_CLIENT_ID" = "your_client_id_here" ]; then
            print_warning "IBM_VERIFY_CLIENT_ID is not configured in $ENV_FILE"
        fi
        
        if [ -z "$IBM_VERIFY_CLIENT_SECRET" ] || [ "$IBM_VERIFY_CLIENT_SECRET" = "your_client_secret_here" ]; then
            print_warning "IBM_VERIFY_CLIENT_SECRET is not configured in $ENV_FILE"
        fi
        
        if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "generate_a_random_secret_here_change_this_in_production" ]; then
            print_warning "SESSION_SECRET should be changed to a random value"
            print_info "Generate with: openssl rand -base64 32"
        fi
    fi
    
    print_success "Setup completed!"
    echo ""
    print_info "Next steps:"
    echo "  1. Edit $ENV_FILE with your configuration"
    echo "  2. Run: ./deploy-podman.sh build"
    echo "  3. Run: ./deploy-podman.sh start"
    echo ""
}

build() {
    print_header "Building Container Images"
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found. Run: ./deploy-podman.sh setup"
        exit 1
    fi
    
    print_info "Building all images..."
    podman-compose -f "$COMPOSE_FILE" build
    
    print_success "Build completed!"
    echo ""
}

start() {
    print_header "Starting Services"
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file not found. Run: ./deploy-podman.sh setup"
        exit 1
    fi
    
    print_info "Starting all services..."
    podman-compose -f "$COMPOSE_FILE" up -d
    
    echo ""
    print_success "Services started!"
    echo ""
    
    # Wait a moment for services to initialize
    sleep 5
    
    # Show status
    status
    
    echo ""
    print_info "Access the application:"
    echo "  Frontend (HTTP):   http://localhost:3000 (redirects to HTTPS)"
    echo "  Frontend (HTTPS):  https://localhost:3443"
    echo "  Backend (HTTP):    http://localhost:4000/api (redirects to HTTPS)"
    echo "  Backend (HTTPS):   https://localhost:4443/api"
    echo "  RAG Server:        http://localhost:8080"
    echo ""
    print_info "View logs: ./deploy-podman.sh logs"
    echo ""
}

stop() {
    print_header "Stopping Services"
    
    print_info "Stopping all services..."
    podman-compose -f "$COMPOSE_FILE" down
    
    print_success "Services stopped!"
    echo ""
}

restart() {
    print_header "Restarting Services"
    
    print_info "Restarting all services..."
    podman-compose -f "$COMPOSE_FILE" restart
    
    print_success "Services restarted!"
    echo ""
    status
    echo ""
}

status() {
    print_header "Service Status"
    
    podman-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    print_info "Health Status:"
    
    # Check each service health
    for container in retailapp-postgres retailapp-backend retailapp-frontend retailapp-rag-server; do
        if podman ps --format "{{.Names}}" | grep -q "^${container}$"; then
            health=$(podman inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no healthcheck")
            status=$(podman inspect --format='{{.State.Status}}' "$container")
            
            if [ "$status" = "running" ]; then
                if [ "$health" = "healthy" ]; then
                    print_success "$container: running (healthy)"
                elif [ "$health" = "no healthcheck" ]; then
                    print_info "$container: running (no healthcheck)"
                else
                    print_warning "$container: running ($health)"
                fi
            else
                print_error "$container: $status"
            fi
        else
            print_error "$container: not running"
        fi
    done
    
    echo ""
}

logs() {
    print_header "Service Logs"
    
    if [ -n "$2" ]; then
        print_info "Showing logs for: $2"
        podman-compose -f "$COMPOSE_FILE" logs -f "$2"
    else
        print_info "Showing logs for all services (Ctrl+C to exit)"
        podman-compose -f "$COMPOSE_FILE" logs -f
    fi
}

clean() {
    print_header "Cleaning Up"
    
    print_warning "This will stop and remove all containers, networks, and volumes!"
    read -p "Are you sure? (yes/no): " -r
    echo
    
    if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Stopping and removing all services..."
        podman-compose -f "$COMPOSE_FILE" down -v
        
        print_info "Removing images..."
        podman rmi retailapp-backend retailapp-frontend retailapp-postgres retailapp-rag-server 2>/dev/null || true
        
        print_success "Cleanup completed!"
        print_warning "Data directory preserved: $DATA_DIR"
        print_info "To remove data: rm -rf $DATA_DIR"
    else
        print_info "Cleanup cancelled"
    fi
    
    echo ""
}

backup() {
    print_header "Database Backup"
    
    # Check if postgres container is running
    if ! podman ps --format "{{.Names}}" | grep -q "^retailapp-postgres$"; then
        print_error "PostgreSQL container is not running"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/retaildb_backup_$TIMESTAMP.sql"
    
    print_info "Creating database backup..."
    podman exec retailapp-postgres pg_dump -U postgres retaildb > "$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    
    print_success "Backup created: ${BACKUP_FILE}.gz"
    
    # Show backup size
    SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    print_info "Backup size: $SIZE"
    
    # List recent backups
    echo ""
    print_info "Recent backups:"
    ls -lh "$BACKUP_DIR" | tail -5
    
    echo ""
}

show_help() {
    cat << EOF
RetailApp Podman Compose Deployment Script

Usage: $0 [command]

Commands:
  setup     - Initial setup (create directories, copy env file)
  build     - Build all container images
  start     - Start all services
  stop      - Stop all services
  restart   - Restart all services
  status    - Show service status
  logs      - Show logs for all services
              Use: $0 logs [service-name] to view specific service logs
  clean     - Stop and remove all containers, networks, and volumes
  backup    - Backup PostgreSQL database
  help      - Show this help message

Examples:
  $0 setup              # Initial setup
  $0 build              # Build images
  $0 start              # Start all services
  $0 logs backend       # View backend logs
  $0 status             # Check service status
  $0 backup             # Backup database
  $0 stop               # Stop all services

For more information, see PODMAN_DEPLOYMENT.md

EOF
}

# Main script logic
case "${1:-help}" in
    setup)
        check_prerequisites
        setup
        ;;
    build)
        check_prerequisites
        build
        ;;
    start)
        check_prerequisites
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs "$@"
        ;;
    clean)
        clean
        ;;
    backup)
        backup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

exit 0

# Made with Bob
