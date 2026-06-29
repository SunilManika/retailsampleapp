# Docker Setup Guide for VeriInsure Retail App

This guide explains how to run the complete VeriInsure Retail application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop installed (includes Docker Compose)
- Docker version 20.10+ recommended
- At least 4GB RAM available for Docker

## Architecture

The application consists of three containerized services:

1. **PostgreSQL Database** (Port 5432)
   - Pre-loaded with retail data from `full_dump.sql`
   - Persistent data storage using Docker volumes

2. **Backend API** (Port 4000)
   - Node.js Express server
   - IBM Verify authentication integration
   - Connects to PostgreSQL database

3. **Frontend** (Port 3000)
   - React application built with Vite
   - Served by Nginx
   - Connects to Backend API

## Quick Start

### 1. Setup Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.docker .env
```

Edit `.env` and update these critical values:
- `IBM_VERIFY_CLIENT_ID` - Your IBM Verify client ID
- `IBM_VERIFY_CLIENT_SECRET` - Your IBM Verify client secret
- `SESSION_SECRET` - Generate a random secret (use: `openssl rand -base64 32`)
- `JWT_SECRET` - Generate a random secret (use: `openssl rand -base64 32`)

### 2. Build and Start All Services

```bash
# Build and start all containers
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **PostgreSQL**: localhost:5432

### 4. Stop the Application

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (deletes database data)
docker-compose down -v
```

## Detailed Commands

### View Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f backend
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild After Code Changes

```bash
# Rebuild and restart specific service
docker-compose up -d --build backend

# Rebuild all services
docker-compose up -d --build
```

### Access Container Shell

```bash
# Access backend container
docker exec -it verifyretail-backend sh

# Access PostgreSQL container
docker exec -it verifyretail-postgres psql -U postgres -d retaildb

# Access frontend container
docker exec -it verifyretail-frontend sh
```

### Database Operations

```bash
# Connect to PostgreSQL
docker exec -it verifyretail-postgres psql -U postgres -d retaildb

# Backup database
docker exec verifyretail-postgres pg_dump -U postgres retaildb > backup.sql

# Restore database
docker exec -i verifyretail-postgres psql -U postgres retaildb < backup.sql
```

## Configuration

### Environment Variables

All configuration is managed through the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `IBM_VERIFY_ISSUER` | IBM Verify OIDC issuer URL | Required |
| `IBM_VERIFY_CLIENT_ID` | IBM Verify client ID | Required |
| `IBM_VERIFY_CLIENT_SECRET` | IBM Verify client secret | Required |
| `IBM_VERIFY_CALLBACK_URL` | OAuth callback URL | http://localhost:4000/api/auth/verify/callback |
| `SESSION_SECRET` | Express session secret | Change in production |
| `JWT_SECRET` | JWT signing secret | Change in production |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `VITE_API_BASE_URL` | Backend API URL (build-time) | http://localhost:4000/api |

### Port Configuration

To change ports, edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:8080"  # Change 8080 to your desired port
  
  backend:
    ports:
      - "5000:4000"  # Change 5000 to your desired port
```

## Production Deployment

### 1. Update Environment Variables

For production, update `.env` with:

```bash
# Use your production domain
IBM_VERIFY_CALLBACK_URL=https://your-domain.com/api/auth/verify/callback
FRONTEND_URL=https://your-domain.com
VITE_API_BASE_URL=https://your-domain.com/api

# Generate strong secrets
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
```

### 2. Use Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    restart: always
    
  backend:
    restart: always
    environment:
      NODE_ENV: production
    
  frontend:
    restart: always
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Enable HTTPS

Use a reverse proxy like Nginx or Traefik in front of the containers to handle SSL/TLS.

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is ready
docker-compose logs postgres | grep "ready to accept connections"

# Test database connection
docker exec verifyretail-postgres pg_isready -U postgres
```

### Backend Not Starting

```bash
# Check backend logs
docker-compose logs backend

# Common issues:
# - Database not ready: Wait for postgres healthcheck
# - Missing environment variables: Check .env file
# - Port already in use: Change port in docker-compose.yml
```

### Frontend Build Fails

```bash
# Check frontend logs
docker-compose logs frontend

# Common issues:
# - VITE_API_BASE_URL not set: Check .env file
# - Node memory issues: Increase Docker memory limit
```

### Clear Everything and Start Fresh

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose up --build
```

## Development Workflow

### Hot Reload Development

For development with hot reload, use the local setup instead:

```bash
# Terminal 1 - Database
docker-compose up postgres

# Terminal 2 - Backend (local)
cd backend
npm install
npm run dev

# Terminal 3 - Frontend (local)
cd frontend
npm install
npm run dev
```

### Hybrid Approach

Run only database in Docker, backend and frontend locally:

```bash
# Start only PostgreSQL
docker-compose up postgres

# Update backend/.env
DB_HOST=localhost

# Run backend and frontend locally
cd backend && npm run dev
cd frontend && npm run dev
```

## Health Checks

Check service health:

```bash
# Check all services
docker-compose ps

# Check specific service health
docker inspect verifyretail-backend --format='{{.State.Health.Status}}'
```

## Monitoring

### Resource Usage

```bash
# View resource usage
docker stats

# View specific container
docker stats verifyretail-backend
```

### Container Information

```bash
# List all containers
docker ps

# Inspect container
docker inspect verifyretail-backend
```

## Backup and Restore

### Full Backup

```bash
# Backup database
docker exec verifyretail-postgres pg_dump -U postgres retaildb > backup_$(date +%Y%m%d).sql

# Backup volumes
docker run --rm -v verifyretailapp_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data_backup.tar.gz /data
```

### Restore

```bash
# Restore database
docker exec -i verifyretail-postgres psql -U postgres retaildb < backup_20260427.sql
```

## Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong secrets** - Generate with `openssl rand -base64 32`
3. **Update dependencies** - Regularly rebuild images
4. **Limit exposed ports** - Only expose necessary ports
5. **Use secrets management** - For production, use Docker secrets or vault

## Support

For issues or questions:
1. Check logs: `docker-compose logs`
2. Review this documentation
3. Check Docker and Docker Compose versions
4. Ensure all prerequisites are met

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)