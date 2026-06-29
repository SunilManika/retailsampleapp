# Retail Demo Application

This is a full-stack retail demo application built for deployment on IBM Cloud Red Hat OpenShift.

## Features

- Product catalog browsing with filters and sorting
- User authentication with IBM Verify integration and JWT-based local auth
- User-specific carts (multi-user support)
- Wishlist functionality
- Product reviews and ratings
- Checkout flow with inventory locking and stock decrement
- Order history with advanced filtering and CSV export
- Admin dashboard with real-time metrics
- AI-powered product insights using RAG (Retrieval-Augmented Generation)
- PostgreSQL database
- NGINX-based production frontend container
- Health checks (readiness/liveness) for all services
- OpenShift-ready Kubernetes manifests

## Stack

- **Backend**: Node.js, Express, PostgreSQL (pg), bcryptjs, jsonwebtoken
- **Frontend**: React + Vite, Axios, Carbon Design System
- **Database**: PostgreSQL 16
- **RAG Server**: FastAPI, IBM Watsonx, Milvus Vector Database
- **Container Runtime**: Podman
- **Registry**: docker.io/sunilmanika

## Deployment Options

### Option 1: Podman Compose (Local/Development)

Quick local deployment using Podman Compose:

```bash
# Quick start
./deploy-podman.sh setup
./deploy-podman.sh build
./deploy-podman.sh start
```

**Documentation:**
- [`PODMAN_QUICKSTART.md`](PODMAN_QUICKSTART.md) - 5-minute quick start guide
- [`PODMAN_DEPLOYMENT.md`](PODMAN_DEPLOYMENT.md) - Comprehensive Podman deployment guide
- [`podman-compose.yml`](podman-compose.yml) - Podman Compose configuration

### Option 2: OpenShift/Kubernetes

Production deployment on Red Hat OpenShift:

```bash
./deploy.sh
```

See [`deploy-steps.md`](deploy-steps.md) for detailed OpenShift deployment steps.

## Documentation

### Deployment Guides
- [`PODMAN_QUICKSTART.md`](PODMAN_QUICKSTART.md) - Podman quick start (5 minutes)
- [`PODMAN_DEPLOYMENT.md`](PODMAN_DEPLOYMENT.md) - Comprehensive Podman guide
- [`deploy-steps.md`](deploy-steps.md) - OpenShift deployment steps

### Configuration & Features
- [`IBM_VERIFY_SETUP.md`](IBM_VERIFY_SETUP.md) - IBM Verify integration guide
- [`frontend/RAG_TOGGLE_FEATURE.md`](frontend/RAG_TOGGLE_FEATURE.md) - RAG feature documentation
- [`milvus/README.md`](milvus/README.md) - Milvus vector database setup
