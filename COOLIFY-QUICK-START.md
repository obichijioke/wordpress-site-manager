# Coolify Deployment - Quick Start Guide

## 🚀 5-Minute Deployment

### Step 1: Generate Secrets (Local Terminal)

```bash
# Generate JWT Secret
echo "JWT_SECRET=$(openssl rand -base64 32)"

# Generate Encryption Key
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"

# Generate Database Password
echo "POSTGRES_PASSWORD=$(openssl rand -hex 32)"
```

**Save these values!** You'll need them in Step 3.

---

### Step 2: Create Project in Coolify

1. Open Coolify dashboard
2. Click **"+ New"** → **"Resource"**
3. Select **"Docker Compose"**
4. Connect your Git repository:
   - Repository: `obichijioke/wordpress-site-manager`
   - Branch: `high-priority-improvements` (or `main`)
5. Click **"Continue"**

---

### Step 3: Set Environment Variables

In Coolify's **"Environment Variables"** section, add:

```bash
# Database
POSTGRES_USER=wordpress_manager
POSTGRES_PASSWORD=<paste-from-step-1>
POSTGRES_DB=wordpress_manager
POSTGRES_PORT=5432

# Application
NODE_ENV=production
PORT=3001
APP_PORT=3001

# Security (paste from Step 1)
JWT_SECRET=<paste-from-step-1>
ENCRYPTION_KEY=<paste-from-step-1>

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# WordPress API
WP_API_TIMEOUT=30000
```

---

### Step 4: Configure Domain (Optional)

1. Go to **"Domains"** tab
2. Add your domain: `wordpress-manager.yourdomain.com`
3. Coolify will auto-configure SSL

---

### Step 5: Deploy!

1. Click **"Deploy"** button
2. Wait 3-5 minutes for build to complete
3. Monitor logs for:
   ```
   ✅ Server ready on port 3001
   ✅ Cron jobs initialized
   ✅ Job processor started
   ```

---

### Step 6: Access Your Application

Visit your domain or Coolify-provided URL:
- **Frontend**: `https://your-domain.com`
- **API**: `https://your-domain.com/api`

---

## ✅ Verification Checklist

- [ ] Application loads without errors
- [ ] Can register a new user account
- [ ] Can log in successfully
- [ ] Can add a WordPress site
- [ ] Database persists after container restart
- [ ] Uploads work correctly
- [ ] SSL certificate is active (HTTPS)

---

## 🔄 Updating Your Application

```bash
# 1. Make changes locally
git add .
git commit -m "Your changes"
git push origin high-priority-improvements

# 2. In Coolify, click "Redeploy"
# Done! Zero-downtime deployment
```

---

## 📊 Monitoring

In Coolify dashboard:
- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory, Network usage
- **Health**: Container health status
- **Backups**: Automated backup status

---

## 🆘 Common Issues

### Build Fails
- Check environment variables are set correctly
- Verify Git repository is accessible
- Check build logs for specific errors

### Database Connection Error
- Verify `POSTGRES_PASSWORD` matches everywhere
- Check PostgreSQL container is healthy
- Wait 30 seconds for database to initialize

### Frontend Not Loading
- Verify `NODE_ENV=production` is set
- Check application logs for errors
- Clear browser cache and retry

---

## 📚 Full Documentation

For detailed information, see: `COOLIFY-DEPLOYMENT.md`

---

## 🎉 You're Done!

Your WordPress Manager is now running on Coolify with:
- ✅ PostgreSQL database
- ✅ Automatic SSL/TLS
- ✅ Zero-downtime deployments
- ✅ Automatic backups
- ✅ Health monitoring

Happy automating! 🚀

