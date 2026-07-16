# Docker Setup Guide

## Overview
This project includes Docker configuration for local development via `docker-compose`. The Dockerfiles and docker-compose.yml are configured and ready for use.

## Prerequisites
- Docker and Docker Compose installed
- Node.js 22 (for local development without Docker)
- pnpm 10.30.0 (for local development without Docker)

## Building and Running

### Local Development (Recommended)
For development on macOS without Docker issues, use local development:

```bash
# Install dependencies
pnpm install

# Start all services in dev mode
pnpm dev

# Or run individually
pnpm --filter @workspace/web dev    # Web app on http://localhost:3000
pnpm --filter @workspace/api dev    # API on http://localhost:3001

# Run tests
pnpm test

# Build for production
pnpm build

# Lint code
pnpm lint
```

### Docker Compose (When Docker is available)
If you have Docker running correctly with SSL/network support:

```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up

# Verify services
curl http://localhost:3000    # Web frontend
curl http://localhost:3001/health  # API health check
```

## Troubleshooting

### SSL Certificate Errors in Docker
If you encounter SSL certificate errors when building Docker images:

1. **Ensure Docker daemon is running properly**
   ```bash
   colima start  # If using colima on macOS
   ```

2. **Check network connectivity**
   - Docker needs outbound HTTPS access to npm registry
   - Verify firewall/proxy settings

3. **Local Development Alternative**
   - Use local pnpm development (see above) which avoids Docker networking issues

## Architecture

### Services
- **Web** (Port 3000): React 18 + Vite frontend
- **API** (Port 3001): NestJS backend with health endpoint
- **PostgreSQL** (Port 5432): Development database

### Database
- **Database**: uke_dev
- **User**: uke_user  
- **Password**: uke_password
- **Volume**: postgres_data (persistent)

### Development
- Both web and api services mount source code for hot reload
- Changes to files are reflected immediately without rebuilding
- Database persists across docker-compose restarts (via named volume)

## Notes
The Dockerfiles use:
- Node.js 22 Alpine base image (minimal, ~380MB)
- pnpm via corepack (Node.js 22 built-in)
- Source code volume mounts for live reload
