# 🐳 Docker Deployment Guide - WordPress Manager

This guide will help you deploy the WordPress Manager application using Docker and PostgreSQL.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Database Management](#database-management)
- [Backup & Restore](#backup--restore)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git** (for cloning the repository)

### Install Docker

**macOS:**
```bash
brew install --cask docker
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Windows:**
Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

---

## Quick Start

### 1. Clone the Repository (if not already done)

```bash
git clone <your-repo-url>
cd wordpress-manager
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Generate secure secrets
openssl rand -base64 32  # Use this for JWT_SECRET
openssl rand -base64 32  # Use this for ENCRYPTION_KEY

# Edit .env and update the values
nano .env  # or use your preferred editor
```

**Required changes in `.env`:**
- `POSTGRES_PASSWORD` - Set a strong database password
- `JWT_SECRET` - Use the first generated secret
- `ENCRYPTION_KEY` - Use the second generated secret

### 3. Start the Application

**Option A: Using the startup script (recommended)**
```bash
chmod +x docker-start.sh
./docker-start.sh
```

**Option B: Manual start**
```bash
docker-compose up -d --build
```

### 4. Access the Application

- **WordPress Manager:** http://localhost:3001
- **pgAdmin (optional):** http://localhost:5050

---

## Configuration

### Environment Variables

All configuration is done through the `.env` file. Key variables:

#### Database Configuration
```env
POSTGRES_USER=wordpress_manager
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=wordpress_manager
POSTGRES_PORT=5432
```

#### Application Configuration
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
```

#### File Storage
```env
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

### Docker Compose Services

The `docker-compose.yml` defines three services:

1. **postgres** - PostgreSQL 16 database
2. **app** - WordPress Manager application
3. **pgadmin** (optional) - Database management UI

To enable pgAdmin:
```bash
docker-compose --profile tools up -d
```

---

## Database Management

### Accessing the Database

**Using psql (command line):**
```bash
docker-compose exec postgres psql -U wordpress_manager -d wordpress_manager
```

**Using pgAdmin (web UI):**
1. Start pgAdmin: `docker-compose --profile tools up -d pgadmin`
2. Open http://localhost:5050
3. Login with credentials from `.env`
4. Add server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `wordpress_manager`
   - Username: from `POSTGRES_USER`
   - Password: from `POSTGRES_PASSWORD`

### Running Migrations

Migrations run automatically on container start. To run manually:

```bash
docker-compose exec app npx prisma migrate deploy
```

### Viewing Migration Status

```bash
docker-compose exec app npx prisma migrate status
```

---

## Backup & Restore

### Creating a Backup

**Using the backup script (recommended):**
```bash
chmod +x docker-backup.sh
./docker-backup.sh
```

**Manual backup:**
```bash
docker-compose exec postgres pg_dump -U wordpress_manager wordpress_manager > backup.sql
gzip backup.sql
```

Backups are stored in `./backups/` directory.

### Restoring a Backup

**Using the restore script (recommended):**
```bash
chmod +x docker-restore.sh
./docker-restore.sh
```

**Manual restore:**
```bash
gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U wordpress_manager wordpress_manager
docker-compose restart app
```

### Automated Backups

Set up a cron job for automated backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/wordpress-manager && ./docker-backup.sh >> /var/log/wp-manager-backup.log 2>&1
```

---

## Production Deployment

### Security Checklist

- [ ] Generate strong, unique values for `JWT_SECRET` and `ENCRYPTION_KEY`
- [ ] Use a strong password for `POSTGRES_PASSWORD`
- [ ] Set `NODE_ENV=production`
- [ ] Configure firewall rules (only expose necessary ports)
- [ ] Set up SSL/TLS termination (nginx/traefik)
- [ ] Enable Docker secrets for sensitive data
- [ ] Configure log rotation
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Test disaster recovery procedures

### Using Docker Secrets (Recommended for Production)

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    secrets:
      - jwt_secret
      - encryption_key
      - postgres_password
    environment:
      JWT_SECRET_FILE: /run/secrets/jwt_secret
      ENCRYPTION_KEY_FILE: /run/secrets/encryption_key

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  encryption_key:
    file: ./secrets/encryption_key.txt
  postgres_password:
    file: ./secrets/postgres_password.txt
```

### Reverse Proxy Setup (Nginx)

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
  
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Troubleshooting

### Common Issues

#### Container won't start

```bash
# Check logs
docker-compose logs app
docker-compose logs postgres

# Check container status
docker-compose ps
```

#### Database connection errors

```bash
# Verify database is running
docker-compose exec postgres pg_isready -U wordpress_manager

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
```

#### Permission errors

```bash
# Fix uploads directory permissions
docker-compose exec app chown -R node:node /app/uploads
```

#### Out of disk space

```bash
# Clean up Docker resources
docker system prune -a --volumes

# Check disk usage
docker system df
```

### Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f postgres

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data!)
docker-compose down -v

# Rebuild containers
docker-compose up -d --build

# Execute command in container
docker-compose exec app sh

# View running processes
docker-compose top
```

### Health Checks

Check application health:
```bash
curl http://localhost:3001/health
```

Check database health:
```bash
docker-compose exec postgres pg_isready -U wordpress_manager
```

---

## Monitoring

### View Resource Usage

```bash
# Real-time stats
docker stats

# Container-specific stats
docker stats wordpress-manager-app wordpress-manager-db
```

### Log Management

Configure log rotation in `docker-compose.yml`:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

---

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review Docker logs: `docker-compose logs -f`
- Check GitHub issues

---

## License

[Your License Here]

