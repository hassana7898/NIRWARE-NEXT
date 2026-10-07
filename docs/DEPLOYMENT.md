# NIRWARE NEXT — Deployment & Operations Guide

## 1. System Requirements

- **Operating System**: Linux (Ubuntu 22.04+ / Debian 12+) or Windows Server 2022
- **Runtime**: Node.js 20.x or 22.x LTS, npm 10+
- **Database**: PostgreSQL 18 (Real installation; embedded databases not permitted in production)
- **Memory**: Minimum 4 GB RAM (8 GB recommended for concurrent production and analytics)
- **Disk**: 20 GB SSD storage minimum

---

## 2. Environment Configuration

Copy `.env.example` to `.env` in the project root:

```ini
PORT=4000
NODE_ENV=production

# Database Settings
DATABASE_URL=postgres://postgres:secure_password@localhost:5432/nirware_next
TEST_DATABASE_URL=postgres://postgres:secure_password@localhost:5432/nirware_next_test
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=secure_password
DB_NAME=nirware_next

# Security & Sessions
JWT_SECRET=production_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=7d
OTP_EXPIRY_MINUTES=1440
MAX_OTP_ATTEMPTS=3

# CORS & Gateway
CORS_ORIGIN=https://nirware.yourdomain.com
```

---

## 3. Database Initialization & Migrations

```bash
# 1. Create databases
psql -U postgres -c "CREATE DATABASE nirware_next;"
psql -U postgres -c "CREATE DATABASE nirware_next_test;"

# 2. Apply initial schema
psql -U postgres -d nirware_next -f database/migrations/001_initial_schema.sql

# 3. Seed initial master data (users, formulas, catalog, initial ledger)
psql -U postgres -d nirware_next -f database/seeds/001_seed_data.sql
```

---

## 4. Building & Running Monorepo

```bash
# Install dependencies
npm install

# Run automated tests verification
npm run test:all

# Build all packages, API, and web frontend
npm run build

# Start production API server
npm run start:api
```

---

## 5. Nginx Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name nirware.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nirware.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/nirware.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nirware.yourdomain.com/privkey.pem;

    # Static Web Frontend & PWA
    location / {
        root /var/www/nirware-next/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # REST API Gateway
    location /api/v1/ {
        proxy_pass http://127.0.0.1:4000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Automated Backup Strategy

Run a daily cron job to create immutable snapshots of the database:

```bash
0 2 * * * pg_dump -U postgres -d nirware_next -F c -b -v -f /backups/nirware_$(date +\%Y\%m\%d_\%H\%M\%S).dump
```
