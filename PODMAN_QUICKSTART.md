# Podman Compose Quick Start Guide

Fast-track guide to deploy RetailApp with Podman Compose in minutes.

## Prerequisites

```bash
# Install Podman
brew install podman  # macOS
# OR
sudo dnf install podman  # RHEL/Fedora
# OR
sudo apt-get install podman  # Ubuntu/Debian

# Install Podman Compose
pip3 install podman-compose
```

## 5-Minute Deployment

### 1. Setup Environment

```bash
# Run setup script (automatically copies .env.example to .env)
./deploy-podman.sh setup

# Edit configuration
nano .env
```

**Note**: The setup script copies `.env.example` to `.env` for you.

**Minimum required in `.env`:**
```bash
IBM_VERIFY_CLIENT_ID=your_client_id
IBM_VERIFY_CLIENT_SECRET=your_client_secret
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
```

### 2. Build and Deploy

```bash
# Build images
./deploy-podman.sh build

# Start services
./deploy-podman.sh start
```

### 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api
- **Database**: localhost:5432

## Common Commands

```bash
# View status
./deploy-podman.sh status

# View logs
./deploy-podman.sh logs
./deploy-podman.sh logs backend  # specific service

# Restart services
./deploy-podman.sh restart

# Stop services
./deploy-podman.sh stop

# Backup database
./deploy-podman.sh backup

# Clean up everything
./deploy-podman.sh clean
```

## Manual Commands

If you prefer manual control:

```bash
# Start services
podman-compose -f podman-compose.yml up -d

# View logs
podman-compose -f podman-compose.yml logs -f

# Stop services
podman-compose -f podman-compose.yml down

# Check status
podman-compose -f podman-compose.yml ps
```

## Service Architecture

```
┌─────────────┐
│  Frontend   │ :3000
│  (React)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Backend    │────▶│ PostgreSQL  │
│  (Node.js)  │:4000│             │:5432
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ RAG Server  │ :8080
│  (FastAPI)  │
└─────────────┘
```

## Configuration Files

| File | Purpose |
|------|---------|
| `podman-compose.yml` | Main compose configuration |
| `.env` | Environment variables |
| `.env.example` | Environment template |
| `deploy-podman.sh` | Deployment automation script |
| `PODMAN_DEPLOYMENT.md` | Detailed documentation |

## Troubleshooting

### Services won't start
```bash
# Check logs
./deploy-podman.sh logs

# Verify environment
cat .env | grep IBM_VERIFY
```

### Port conflicts
```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :5432
```

### Database issues
```bash
# Access database
podman exec -it retailapp-postgres psql -U postgres -d retaildb

# Check database logs
podman logs retailapp-postgres
```

### Clean restart
```bash
# Stop everything
./deploy-podman.sh stop

# Clean up
./deploy-podman.sh clean

# Rebuild and start
./deploy-podman.sh build
./deploy-podman.sh start
```

## Resource Requirements

| Component | Min RAM | Min CPU | Disk |
|-----------|---------|---------|------|
| PostgreSQL | 512MB | 0.5 | 5GB |
| Backend | 256MB | 0.25 | 1GB |
| Frontend | 128MB | 0.1 | 500MB |
| RAG Server | 256MB | 0.25 | 1GB |
| **Total** | **1.1GB** | **1.1** | **7.5GB** |

## Optional: RAG Server Setup

If you want to use the RAG (semantic search) features:

1. **Get IBM Watsonx credentials**
   - Sign up at https://www.ibm.com/watsonx
   - Create a project and get API key

2. **Deploy Milvus vector database**
   ```bash
   cd milvus
   ./run-local.sh
   ```

3. **Configure in `.env`**
   ```bash
   WATSONX_API_KEY=your_api_key
   WATSONX_PROJECT_ID=your_project_id
   MILVUS_HOST=localhost
   MILVUS_PORT=19530
   ```

## Production Checklist

- [ ] Change default passwords
- [ ] Generate strong SESSION_SECRET and JWT_SECRET
- [ ] Configure proper IBM Verify callback URLs
- [ ] Set up HTTPS/TLS
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Test disaster recovery procedures
- [ ] Review resource limits
- [ ] Enable log rotation

## Next Steps

- Read [PODMAN_DEPLOYMENT.md](PODMAN_DEPLOYMENT.md) for detailed documentation
- Review [IBM_VERIFY_SETUP.md](IBM_VERIFY_SETUP.md) for authentication setup
- Check [RAG_TOGGLE_FEATURE.md](frontend/RAG_TOGGLE_FEATURE.md) for RAG features

## Support

For issues:
1. Check logs: `./deploy-podman.sh logs`
2. Review [PODMAN_DEPLOYMENT.md](PODMAN_DEPLOYMENT.md) troubleshooting section
3. Open an issue in the repository

---

**Quick Help**: `./deploy-podman.sh help`