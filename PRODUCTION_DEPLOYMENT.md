# 🚀 Production Deployment Guide

This guide covers deploying WordPress Manager to production using Docker and PostgreSQL.

## 📋 Quick Start

### 1. Server Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 20GB disk space
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+

**Recommended:**
- 4 CPU cores
- 8GB RAM
- 50GB SSD
- Ubuntu 22.04 LTS

### 2. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 3. Clone and Configure

```bash
# Clone repository
git clone <your-repo-url>
cd wordpress-manager

# Create environment file
cp .env.example .env

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.production
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.production

# Edit .env with production values
nano .env
```

### 4. Configure Environment

Update `.env` with production values:

```env
# Database
POSTGRES_USER=wordpress_manager
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>
POSTGRES_DB=wordpress_manager

# Application
NODE_ENV=production
JWT_SECRET=<GENERATED_SECRET>
ENCRYPTION_KEY=<GENERATED_SECRET>
```

### 5. Deploy

```bash
# Start services
./docker-start.sh

# Or manually
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## 🔒 Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS (if using reverse proxy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. SSL/TLS Setup with Nginx

Install Nginx and Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx
```

Create Nginx configuration (`/etc/nginx/sites-available/wordpress-manager`):

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
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
```

Enable site and get SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/wordpress-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Docker Security

Update `docker-compose.yml` for production:

```yaml
services:
  app:
    restart: always
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

---

## 📊 Monitoring & Logging

### 1. Log Management

Configure log rotation in `docker-compose.yml`:

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        compress: "true"
```

### 2. Health Monitoring

Create health check script (`/usr/local/bin/check-health.sh`):

```bash
#!/bin/bash
HEALTH_URL="http://localhost:3001/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

Add to crontab:

```bash
*/5 * * * * /usr/local/bin/check-health.sh || systemctl restart docker-compose@wordpress-manager
```

### 3. Resource Monitoring

Install monitoring tools:

```bash
# Install ctop for container monitoring
sudo wget https://github.com/bcicen/ctop/releases/download/v0.7.7/ctop-0.7.7-linux-amd64 -O /usr/local/bin/ctop
sudo chmod +x /usr/local/bin/ctop

# Run ctop
ctop
```

---

## 💾 Backup Strategy

### 1. Automated Daily Backups

Create backup script (`/usr/local/bin/backup-wordpress-manager.sh`):

```bash
#!/bin/bash
cd /path/to/wordpress-manager
./docker-backup.sh

# Upload to S3 (optional)
# aws s3 cp ./backups/backup_*.sql.gz s3://your-bucket/backups/
```

Add to crontab:

```bash
0 2 * * * /usr/local/bin/backup-wordpress-manager.sh >> /var/log/wp-manager-backup.log 2>&1
```

### 2. Backup Retention

The backup script automatically keeps the last 7 backups. For longer retention:

```bash
# Weekly backup to external storage
0 3 * * 0 cp /path/to/wordpress-manager/backups/backup_*.sql.gz /mnt/backup-drive/weekly/
```

### 3. Disaster Recovery

Test restore procedure monthly:

```bash
# Create test environment
docker-compose -f docker-compose.test.yml up -d

# Restore backup
./docker-restore.sh

# Verify data
docker-compose -f docker-compose.test.yml exec app npx prisma studio
```

---

## 🔄 Updates & Maintenance

### 1. Application Updates

```bash
# Pull latest changes
git pull

# Backup database
./docker-backup.sh

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Verify health
curl http://localhost:3001/health
```

### 2. Database Maintenance

```bash
# Vacuum database (monthly)
docker-compose exec postgres vacuumdb -U wordpress_manager -d wordpress_manager -z -v

# Analyze database
docker-compose exec postgres psql -U wordpress_manager -d wordpress_manager -c "ANALYZE;"
```

### 3. Docker Cleanup

```bash
# Remove unused images (weekly)
docker image prune -a -f

# Remove unused volumes (careful!)
docker volume prune -f

# Full system cleanup
docker system prune -a --volumes -f
```

---

## 📈 Performance Optimization

### 1. PostgreSQL Tuning

Create `postgresql.conf` overrides:

```yaml
services:
  postgres:
    command: postgres -c shared_buffers=256MB -c max_connections=200 -c effective_cache_size=1GB
```

### 2. Application Scaling

For high traffic, use multiple app instances:

```yaml
services:
  app:
    deploy:
      replicas: 3
```

Add load balancer (nginx):

```nginx
upstream wordpress_manager {
    least_conn;
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}
```

### 3. Caching

Add Redis for session caching:

```yaml
services:
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
```

---

## 🚨 Troubleshooting

### Common Issues

**1. Container won't start**
```bash
docker-compose logs app
docker-compose logs postgres
```

**2. Database connection errors**
```bash
docker-compose exec postgres pg_isready
docker-compose restart app
```

**3. Out of memory**
```bash
# Check memory usage
docker stats

# Increase container limits
docker-compose down
# Edit docker-compose.yml to add memory limits
docker-compose up -d
```

**4. Disk space issues**
```bash
# Check disk usage
df -h
docker system df

# Clean up
docker system prune -a --volumes
```

---

## 📞 Support

For production issues:
1. Check logs: `docker-compose logs -f`
2. Verify health: `curl http://localhost:3001/health`
3. Review [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md)
4. Contact support with logs and error messages

---

## ✅ Production Checklist

Before going live:

- [ ] Strong passwords for all services
- [ ] SSL/TLS certificate installed
- [ ] Firewall configured
- [ ] Automated backups enabled
- [ ] Monitoring configured
- [ ] Log rotation enabled
- [ ] Health checks working
- [ ] Disaster recovery tested
- [ ] Performance optimized
- [ ] Security headers configured
- [ ] Rate limiting enabled (nginx)
- [ ] Documentation updated
- [ ] Team trained on operations

---

## 📄 License

[Your License Here]

