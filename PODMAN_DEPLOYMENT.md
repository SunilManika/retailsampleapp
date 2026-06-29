# Podman Compose Deployment Guide

Complete guide for deploying the RetailApp application using Podman Compose.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Service Architecture](#service-architecture)
- [Configuration](#configuration)
- [Deployment Commands](#deployment-commands)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Production Considerations](#production-considerations)

## Overview

This deployment uses Podman Compose to orchestrate four main services:

1. **PostgreSQL Database** - Stores retail application data
2. **Backend API** - Node.js/Express REST API with IBM Verify authentication
3. **Frontend** - React SPA served by Nginx
4. **RAG Server** - FastAPI server for semantic search (optional)

## Prerequisites

### Required Software

```bash
# Install Podman (if not already installed)
# On macOS:
brew install podman

# On RHEL/Fedora:
sudo dnf install podman

# On Ubuntu/Debian:
sudo apt-get install podman

# Install Podman Compose
pip3 install podman-compose

# Verify installations
podman --version
podman-compose --version
```

### System Requirements

- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 20GB free space
- **OS**: Linux, macOS, or Windows with WSL2

### External Dependencies

- **IBM Verify Account** - For OAuth/OIDC authentication
- **IBM Watsonx Account** - For RAG embeddings (optional)
- **Milvus Vector Database** - For RAG functionality (optional)

## Quick Start

### 1. Clone and Navigate

```bash
cd /path/to/retailapp
```

### 2. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Edit with your actual values
nano .env  # or use your preferred editor
```

**Minimum required configuration:**
```bash
IBM_VERIFY_CLIENT_ID=your_client_id
IBM_VERIFY_CLIENT_SECRET=your_client_secret
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
```

### 3. Create Data Directory

```bash
# Create directory for PostgreSQL persistent storage
mkdir -p data/postgres
```

### 4. Deploy

```bash
# Build and start all services
podman-compose -f podman-compose.yml up -d

# View logs
podman-compose -f podman-compose.yml logs -f
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **RAG Server**: http://localhost:8080 (if configured)
- **PostgreSQL**: localhost:5432

## Detailed Setup

### Step 1: Environment Configuration

**Important**: Use `.env.example` as your template for both Docker and Podman Compose deployments.

```bash
# Copy the environment template
cp .env.example .env

# Edit with your values
nano .env
```

Edit the `.env` file with your specific values:

#### IBM Verify Setup

1. Log in to your IBM Verify tenant
2. Create a new application
3. Configure redirect URI: `http://localhost:4000/api/auth/verify/callback`
4. Copy Client ID and Client Secret to `.env`

See [`IBM_VERIFY_SETUP.md`](IBM_VERIFY_SETUP.md) for detailed instructions.

#### Security Secrets

Generate strong random secrets:

```bash
# Generate SESSION_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

Add these to your `.env` file.

#### RAG Server Configuration (Optional)

If using RAG functionality:

1. Set up IBM Watsonx project
2. Get API key and Project ID
3. Deploy Milvus vector database (see [Milvus Setup](#milvus-setup))
4. Configure in `.env`:

```bash
WATSONX_API_KEY=your_api_key
WATSONX_PROJECT_ID=your_project_id
MILVUS_HOST=localhost
MILVUS_PORT=19530
```

### Step 2: Milvus Setup (Optional)

If using RAG features, deploy Milvus:

```bash
# Navigate to milvus directory
cd milvus

# Copy environment template
cp .env.example .env

# Start Milvus
./run-local.sh

# Or use the compose file
podman-compose -f milvus-compose.yaml up -d
```

### Step 3: Build Images

```bash
# Build all images
podman-compose -f podman-compose.yml build

# Or build specific service
podman-compose -f podman-compose.yml build backend
```

### Step 4: Start Services

```bash
# Start all services in detached mode
podman-compose -f podman-compose.yml up -d

# Start with specific services
podman-compose -f podman-compose.yml up -d postgres backend frontend

# Start with logs visible
podman-compose -f podman-compose.yml up
```

### Step 5: Verify Deployment

```bash
# Check service status
podman-compose -f podman-compose.yml ps

# Check health status
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test endpoints
curl http://localhost:4000/api/health
curl http://localhost:3000
curl http://localhost:8080/health
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RetailApp Architecture                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend   │────────▶│   Backend    │────────▶│  PostgreSQL  │
│  (React +    │         │  (Node.js +  │         │  (Database)  │
│   Nginx)     │         │   Express)   │         │              │
│  Port: 3000  │         │  Port: 4000  │         │  Port: 5432  │
└──────────────┘         └──────────────┘         └──────────────┘
                                │
                                │
                                ▼
                         ┌──────────────┐         ┌──────────────┐
                         │  RAG Server  │────────▶│    Milvus    │
                         │  (FastAPI)   │         │   (Vector    │
                         │  Port: 8080  │         │   Database)  │
                         └──────────────┘         └──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Watsonx    │
                         │  (Embeddings)│
                         └──────────────┘

Network: retailapp-network (172.28.0.0/16)
```

## Configuration

### Service Dependencies

- **Frontend** → Backend (waits for backend to be ready)
- **Backend** → PostgreSQL (waits for health check)
- **RAG Server** → Independent (but used by backend)

### Port Mappings

| Service    | Container Port | Host Port | Description                |
|------------|----------------|-----------|----------------------------|
| Frontend   | 8080           | 3000      | React application          |
| Backend    | 4000           | 4000      | REST API                   |
| PostgreSQL | 5432           | 5432      | Database                   |
| RAG Server | 8080           | 8080      | Semantic search API        |

### Volume Mounts

- **postgres_data**: Persistent PostgreSQL data storage
- **full_dump.sql**: Database initialization script (read-only)

### Health Checks

All services include health checks:

- **PostgreSQL**: `pg_isready` check every 10s
- **Backend**: HTTP check on `/api/health` every 30s
- **Frontend**: HTTP check on root every 30s
- **RAG Server**: HTTP check on `/health` every 30s

## Deployment Commands

### Basic Operations

```bash
# Start all services
podman-compose -f podman-compose.yml up -d

# Stop all services
podman-compose -f podman-compose.yml down

# Restart all services
podman-compose -f podman-compose.yml restart

# Stop and remove containers, networks, volumes
podman-compose -f podman-compose.yml down -v
```

### Service-Specific Operations

```bash
# Start specific service
podman-compose -f podman-compose.yml up -d backend

# Stop specific service
podman-compose -f podman-compose.yml stop frontend

# Restart specific service
podman-compose -f podman-compose.yml restart backend

# Rebuild and restart service
podman-compose -f podman-compose.yml up -d --build backend
```

### Scaling Services

```bash
# Scale backend to 3 instances
podman-compose -f podman-compose.yml up -d --scale backend=3

# Note: You'll need a load balancer for multiple backend instances
```

### Logs and Monitoring

```bash
# View all logs
podman-compose -f podman-compose.yml logs

# Follow logs in real-time
podman-compose -f podman-compose.yml logs -f

# View logs for specific service
podman-compose -f podman-compose.yml logs -f backend

# View last 100 lines
podman-compose -f podman-compose.yml logs --tail=100

# View logs with timestamps
podman-compose -f podman-compose.yml logs -t
```

### Container Management

```bash
# List running containers
podman-compose -f podman-compose.yml ps

# Execute command in container
podman exec -it retailapp-backend sh

# Access PostgreSQL
podman exec -it retailapp-postgres psql -U postgres -d retaildb

# View container resource usage
podman stats

# Inspect container
podman inspect retailapp-backend
```

## Monitoring and Maintenance

### Health Monitoring

```bash
# Check all service health
podman ps --format "table {{.Names}}\t{{.Status}}"

# Check specific service health
podman inspect --format='{{.State.Health.Status}}' retailapp-backend

# View health check logs
podman inspect --format='{{json .State.Health}}' retailapp-backend | jq
```

### Resource Monitoring

```bash
# Real-time resource usage
podman stats

# Container resource limits
podman inspect --format='{{.HostConfig.Memory}}' retailapp-backend

# Disk usage
podman system df

# Volume usage
podman volume ls
du -sh data/postgres
```

### Database Maintenance

```bash
# Backup database
podman exec retailapp-postgres pg_dump -U postgres retaildb > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260616.sql | podman exec -i retailapp-postgres psql -U postgres -d retaildb

# Access database shell
podman exec -it retailapp-postgres psql -U postgres -d retaildb

# Check database size
podman exec retailapp-postgres psql -U postgres -d retaildb -c "SELECT pg_size_pretty(pg_database_size('retaildb'));"
```

### Log Management

```bash
# Rotate logs (if needed)
podman logs retailapp-backend > backend_$(date +%Y%m%d).log
podman logs --since 24h retailapp-backend

# Clear logs (careful!)
truncate -s 0 $(podman inspect --format='{{.LogPath}}' retailapp-backend)
```

### Updates and Upgrades

```bash
# Pull latest images
podman-compose -f podman-compose.yml pull

# Rebuild images
podman-compose -f podman-compose.yml build --no-cache

# Update and restart
podman-compose -f podman-compose.yml up -d --build

# Rolling update (one service at a time)
podman-compose -f podman-compose.yml up -d --no-deps backend
```

## Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs
podman-compose -f podman-compose.yml logs

# Check specific service
podman-compose -f podman-compose.yml logs backend

# Verify environment variables
podman exec retailapp-backend env | grep IBM_VERIFY

# Check port conflicts
sudo lsof -i :4000
sudo netstat -tulpn | grep 4000
```

#### Database Connection Issues

```bash
# Check PostgreSQL is running
podman ps | grep postgres

# Test database connection
podman exec retailapp-postgres psql -U postgres -d retaildb -c "SELECT 1;"

# Check backend can reach database
podman exec retailapp-backend ping postgres

# Verify database credentials
podman exec retailapp-backend env | grep DB_
```

#### Frontend Can't Reach Backend

```bash
# Check backend is running
curl http://localhost:4000/api/health

# Check CORS configuration
curl -H "Origin: http://localhost:3000" -I http://localhost:4000/api/health

# Verify environment variables
podman exec retailapp-frontend cat /usr/share/nginx/html/assets/*.js | grep API_BASE_URL
```

#### RAG Server Issues

```bash
# Check RAG server logs
podman-compose -f podman-compose.yml logs rag-server

# Test RAG endpoint
curl http://localhost:8080/health

# Verify Watsonx credentials
podman exec retailapp-rag-server env | grep WATSONX

# Check Milvus connection
podman exec retailapp-rag-server python -c "from pymilvus import connections; connections.connect(host='localhost', port='19530')"
```

### Network Issues

```bash
# List networks
podman network ls

# Inspect network
podman network inspect retailapp-network

# Test connectivity between containers
podman exec retailapp-backend ping postgres
podman exec retailapp-backend ping rag-server

# Check DNS resolution
podman exec retailapp-backend nslookup postgres
```

### Performance Issues

```bash
# Check resource usage
podman stats

# Check container limits
podman inspect --format='{{.HostConfig.Memory}}' retailapp-backend

# Increase resources in podman-compose.yml:
# deploy:
#   resources:
#     limits:
#       cpus: '2.0'
#       memory: 2G
```

### Clean Slate Restart

```bash
# Stop and remove everything
podman-compose -f podman-compose.yml down -v

# Remove all images
podman rmi retailapp-backend retailapp-frontend retailapp-postgres retailapp-rag-server

# Clean up system
podman system prune -a --volumes

# Rebuild and start
podman-compose -f podman-compose.yml up -d --build
```

## Production Considerations

### Security Hardening

1. **Secrets Management**
   ```bash
   # Use Podman secrets instead of environment variables
   echo "my_secret" | podman secret create db_password -
   
   # Reference in compose file:
   # secrets:
   #   - db_password
   ```

2. **Network Isolation**
   - Use separate networks for frontend, backend, and database
   - Implement network policies
   - Use firewall rules

3. **TLS/SSL**
   - Enable HTTPS for all external endpoints
   - Use Let's Encrypt or corporate certificates
   - Configure Nginx with SSL

4. **Access Control**
   - Run containers as non-root users (already configured)
   - Use SELinux or AppArmor policies
   - Implement RBAC

### High Availability

1. **Load Balancing**
   ```bash
   # Scale backend
   podman-compose -f podman-compose.yml up -d --scale backend=3
   
   # Add HAProxy or Nginx load balancer
   ```

2. **Database Replication**
   - Set up PostgreSQL streaming replication
   - Use pgpool-II for connection pooling
   - Implement automatic failover

3. **Health Monitoring**
   - Set up Prometheus + Grafana
   - Configure alerting (PagerDuty, Slack)
   - Implement automated recovery

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/retailapp"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
podman exec retailapp-postgres pg_dump -U postgres retaildb | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup volumes
tar -czf "$BACKUP_DIR/postgres_data_$DATE.tar.gz" data/postgres/

# Retention (keep last 7 days)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
```

### Monitoring Setup

```bash
# Add Prometheus exporter
# Add to podman-compose.yml:
#
# prometheus:
#   image: prom/prometheus
#   volumes:
#     - ./prometheus.yml:/etc/prometheus/prometheus.yml
#   ports:
#     - "9090:9090"
#
# grafana:
#   image: grafana/grafana
#   ports:
#     - "3001:3000"
```

### CI/CD Integration

```yaml
# Example GitLab CI/CD pipeline
deploy:
  stage: deploy
  script:
    - podman-compose -f podman-compose.yml pull
    - podman-compose -f podman-compose.yml up -d --build
  only:
    - main
```

### Resource Planning

| Service    | Min CPU | Min RAM | Recommended CPU | Recommended RAM |
|------------|---------|---------|-----------------|-----------------|
| PostgreSQL | 0.5     | 512MB   | 2.0             | 2GB             |
| Backend    | 0.25    | 256MB   | 1.0             | 1GB             |
| Frontend   | 0.1     | 128MB   | 0.5             | 512MB           |
| RAG Server | 0.25    | 256MB   | 1.0             | 1GB             |
| **Total**  | **1.1** | **1.1GB** | **4.5**       | **4.5GB**       |

## Additional Resources

- [Podman Documentation](https://docs.podman.io/)
- [Podman Compose Documentation](https://github.com/containers/podman-compose)
- [IBM Verify Setup Guide](IBM_VERIFY_SETUP.md)
- [RAG Toggle Feature](frontend/RAG_TOGGLE_FEATURE.md)
- [Milvus Documentation](milvus/README.md)

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review service logs: `podman-compose logs -f [service]`
- Open an issue in the project repository

---

**Last Updated**: 2026-06-16