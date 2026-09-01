# 🚀 Skyfall Financial & Travels ERP — CI/CD & Deployment Runbook

> **Complete Guide for Continuous Integration, Delivery, Containerization & Production Operations**  
> **Repository:** `mohdaman7/financial-management-backend` | **Environment:** Production & Staging

---

## 📌 Architecture Overview

This project uses an enterprise-grade CI/CD architecture powered by **GitHub Actions** and **Docker Multi-Stage Containers**.

```
                       ┌─────────────────────────┐
                       │  Code Push / PR Event   │
                       └────────────┬────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             CI Quality Gate (ci.yml)                   │
       │  ├─ 1. ESLint Code Style Check (0 errors)              │
       │  ├─ 2. Prettier Formatting Validation                  │
       │  ├─ 3. Strict TypeScript Typecheck (tsc --noEmit)      │
       │  ├─ 4. High-Severity npm Security Audit                │
       │  ├─ 5. Jest Test Matrix (Node 20.x & 22.x)             │
       │  └─ 6. Production Compilation (tsc & tsc-alias)        │
       └────────────────────────────┬───────────────────────────┘
                                    │ (On merge to main)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │             CD Pipeline (cd.yml)                       │
       │  ├─ 1. Build Multi-Stage Production Docker Image       │
       │  ├─ 2. Push Image to GitHub Container Registry (ghcr)  │
       │  ├─ 3. Trigger Zero-Downtime Deployment (Cloud / SSH)  │
       │  └─ 4. Execute Automated Health Check Smoke Probe      │
       └────────────────────────────────────────────────────────┘
```

---

## 🛠️ Local Development & CI Commands

You can run the exact same checks locally before pushing code:

```bash
# 1. Run Complete CI Suite locally (Lint + Typecheck + Test + Build)
npm run ci

# 2. Individual Quality Checks
npm run lint          # Run ESLint validation
npm run lint:fix      # Automatically fix lint issues
npm run format:check  # Check Prettier code formatting
npm run format        # Auto-format all source and test files
npm run typecheck     # Validate TypeScript types without emitting files
npm test              # Run all 18 Jest test suites
npm run test:coverage # Run tests with code coverage metrics
npm run build         # Build production distribution in dist/
```

---

## 🐳 Docker Containerization

### Local Docker Stack (API + MongoDB + Mongo Express)
To spin up the complete backend ecosystem locally:

```bash
# Start API on port 5000, MongoDB on 27017, Mongo Express on 8081
docker compose up -d

# View container logs in real-time
docker compose logs -f api

# Stop all containers
docker compose down
```

- **API Endpoint:** `http://localhost:5000/api/v1/health`
- **Mongo Express Admin UI:** `http://localhost:8081` (User: `admin`, Pass: `skyfalladmin`)

### Standalone Docker Image Build
```bash
# Build production Docker image
docker build -t skyfall-financial-api:latest .

# Run standalone container
docker run -d -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_ACCESS_SECRET="your-32-char-access-secret" \
  -e JWT_REFRESH_SECRET="your-32-char-refresh-secret" \
  --name skyfall-api skyfall-financial-api:latest
```

---

## 🔐 GitHub Repository Secrets Configuration

To enable automated Continuous Deployment, configure the following secrets in **GitHub Repository Settings > Secrets and variables > Actions**:

| Secret Name | Description | Required For |
| :--- | :--- | :--- |
| `RENDER_DEPLOY_HOOK` | Webhook URL from Render.com for instant deployment | Cloud Deployment (Render) |
| `DEPLOY_WEBHOOK_URL` | Generic webhook trigger URL (Railway, DigitalOcean, Coolify) | Cloud Deployment |
| `PRODUCTION_URL` | Live production base URL (e.g. `https://api.skyfall.ae`) | Automated Smoke Tests |
| `DEPLOY_SSH_HOST` | VPS / Server IP or Hostname | Direct SSH Deployment |
| `DEPLOY_SSH_USER` | Server username (e.g. `ubuntu` or `root`) | Direct SSH Deployment |
| `DEPLOY_SSH_KEY` | Private SSH Key with access to server | Direct SSH Deployment |
| `DEPLOY_APP_DIR` | Absolute path on server (e.g. `/var/www/skyfall-api`) | Direct SSH Deployment |

---

## 🔄 Zero-Downtime Deployment Strategies

### Option A: PM2 Cluster Reload (VPS / Server)
```bash
# Graceful reload with zero downtime (drops zero connections)
pm2 reload ecosystem.config.js --env production
```

### Option B: Docker Compose Rolling Update
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --no-deps --remove-orphans api
```

---

## 🩺 Health Check & Telemetry

The healthcheck endpoint `/api/v1/health` provides real-time diagnostics:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "skyfall-financial-management-api",
    "version": "2.4.0",
    "environment": "production",
    "uptime": 86400,
    "uptime_human": "24h 0m 0s",
    "database": "connected",
    "memory": {
      "heap_used_mb": 45.2,
      "heap_total_mb": 78.4,
      "rss_mb": 112.8
    },
    "timestamp": "2026-09-02T02:50:00.000Z"
  }
}
```
