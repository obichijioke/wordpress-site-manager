# Deploying WordPress Manager to Coolify

This guide will walk you through deploying the WordPress Manager application to your Coolify server.

## Prerequisites

- A Coolify server instance (v4.0+)
- Git repository access (GitHub, GitLab, Gitea, etc.)
- Domain name (optional, but recommended)

## Step 1: Push Your Code to Git Repository

Your code is already in a Git repository. Make sure all changes are pushed:

```bash
git push origin high-priority-improvements
```

If you want to deploy from the main branch, merge your changes:

```bash
git checkout main
git merge high-priority-improvements
git push origin main
```

## Step 2: Create a New Project in Coolify

1. Log in to your Coolify dashboard
2. Click **"+ New"** → **"Resource"**
3. Select **"Docker Compose"** as the resource type
4. Choose your Git source (GitHub, GitLab, etc.)
5. Select your repository: `obichijioke/wordpress-site-manager`
6. Select the branch to deploy (e.g., `main` or `high-priority-improvements`)
7. Click **"Continue"**

## Step 3: Configure Docker Compose Settings

Coolify will detect your `docker-compose.yml` file automatically.

### Important Configuration:

1. **Build Pack**: Select **"Docker Compose"**
2. **Docker Compose Location**: Leave as default (`./docker-compose.yml`)
3. **Port Mapping**: 
   - The app runs on port `3001` internally
   - Coolify will automatically map this to port 80/443 with SSL

## Step 4: Configure Environment Variables

In Coolify's environment variables section, add the following variables.

**IMPORTANT**: Make sure to **UNCHECK "Available at Buildtime"** for `NODE_ENV` or the build will fail. The Dockerfile handles NODE_ENV internally for each build stage.

### Required Variables:

```bash
# Database Configuration
POSTGRES_USER=wordpress_manager
POSTGRES_PASSWORD=<generate-secure-password>
POSTGRES_DB=wordpress_manager
POSTGRES_PORT=5432

# Application Configuration
NODE_ENV=production
PORT=3001
APP_PORT=3001

# Security Keys (MUST generate new ones!)
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ENCRYPTION_KEY=<generate-with-openssl-rand-base64-32>

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# WordPress API
WP_API_TIMEOUT=30000
```

### Generate Secure Keys:

Run these commands locally to generate secure keys:

```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Encryption Key
openssl rand -base64 32

# Generate Database Password
openssl rand -hex 32
```

Copy the output and paste into Coolify's environment variables.

### Optional Variables (for pgAdmin):

```bash
PGADMIN_EMAIL=admin@yourdomain.com
PGADMIN_PASSWORD=<secure-password>
PGADMIN_PORT=5050
```

## Step 5: Configure Domain (Optional but Recommended)

1. In Coolify, go to your application's **"Domains"** section
2. Add your domain (e.g., `wordpress-manager.yourdomain.com`)
3. Coolify will automatically:
   - Configure Traefik reverse proxy
   - Generate SSL certificate via Let's Encrypt
   - Handle HTTPS redirection

## Step 6: Deploy the Application

1. Click **"Deploy"** button in Coolify
2. Coolify will:
   - Clone your repository
   - Build the Docker images
   - Start the containers
   - Run database migrations (`prisma db push`)
   - Start the application

3. Monitor the deployment logs in real-time

## Step 7: Verify Deployment

Once deployment is complete:

1. **Check Application Health**:
   - Visit your domain or Coolify-provided URL
   - You should see the WordPress Manager login page

2. **Check Logs**:
   - In Coolify, go to **"Logs"** tab
   - Verify you see:
     ```
     Server ready on port 3001
     Initializing cron jobs...
     Cron jobs initialized
     Job processor started successfully
     ```

3. **Test Database Connection**:
   - Try registering a new user
   - Verify data persists after container restart

## Step 8: Post-Deployment Configuration

### Enable pgAdmin (Optional)

To enable the database management UI:

1. In Coolify, edit your docker-compose configuration
2. Start the pgAdmin service:
   ```bash
   docker compose --profile tools up -d pgadmin
   ```
3. Access pgAdmin at: `http://your-domain:5050`

### Configure Backups

1. In Coolify, go to **"Backups"** section
2. Enable automatic backups for:
   - `postgres_data` volume (database)
   - `uploads_data` volume (uploaded files)
3. Set backup frequency (daily recommended)

### Monitor Resources

1. Go to **"Metrics"** in Coolify
2. Monitor:
   - CPU usage
   - Memory usage
   - Disk usage
   - Network traffic

## Troubleshooting

### Issue: Build Fails with "npm run build" Error

**Symptoms**:
```
failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

**Root Cause**: Coolify injected `NODE_ENV=production` as a build-time ARG, causing npm to skip devDependencies.

**Solution**:
1. The Dockerfile has been updated to handle this automatically (commit 7ded0e6)
2. Make sure you're using the latest version of the code
3. Alternatively, in Coolify's environment variables, **UNCHECK "Available at Buildtime"** for `NODE_ENV`

### Issue: Build Fails (General)

**Solution**: Check build logs in Coolify. Common issues:
- Missing environment variables
- TypeScript compilation errors
- Node.js version mismatch
- Outdated code (pull latest changes)

### Issue: Database Connection Failed

**Solution**: 
1. Verify `DATABASE_URL` is correctly formatted
2. Check PostgreSQL container is healthy
3. Verify `POSTGRES_PASSWORD` matches in all places

### Issue: Application Crashes on Startup

**Solution**:
1. Check application logs in Coolify
2. Verify all required environment variables are set
3. Check if Prisma migrations ran successfully

### Issue: Frontend Not Loading

**Solution**:
1. Verify `NODE_ENV=production` is set
2. Check if frontend build completed successfully
3. Verify Express is serving static files from `/dist`

## Updating the Application

To deploy updates:

1. Push changes to your Git repository
2. In Coolify, click **"Redeploy"**
3. Coolify will:
   - Pull latest code
   - Rebuild containers
   - Restart services with zero downtime

## Scaling Considerations

### Horizontal Scaling

To run multiple app instances:

1. In Coolify, increase replica count
2. Coolify will automatically:
   - Load balance requests
   - Share the same PostgreSQL database
   - Share the same upload volume

### Database Scaling

For high traffic:

1. Consider upgrading PostgreSQL resources
2. Enable connection pooling (PgBouncer)
3. Set up read replicas for reporting

## Security Best Practices

1. ✅ **Use strong passwords** for all services
2. ✅ **Enable HTTPS** (Coolify does this automatically)
3. ✅ **Rotate secrets** regularly (JWT_SECRET, ENCRYPTION_KEY)
4. ✅ **Limit database access** to application only
5. ✅ **Enable Coolify's firewall** rules
6. ✅ **Regular backups** of database and uploads
7. ✅ **Monitor logs** for suspicious activity

## Support

If you encounter issues:

1. Check Coolify documentation: https://coolify.io/docs
2. Check application logs in Coolify
3. Review Docker container logs
4. Check database connectivity

## Summary

Your WordPress Manager is now deployed on Coolify with:

- ✅ PostgreSQL database with persistent storage
- ✅ Automatic SSL/TLS certificates
- ✅ Zero-downtime deployments
- ✅ Automatic health checks
- ✅ Backup capabilities
- ✅ Resource monitoring
- ✅ Scalability options

Enjoy your production-ready WordPress Manager! 🚀

