# 🚀 CoinEstate Platform - Deployment Guide

This guide covers deployment procedures for the CoinEstate platform across different environments.

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 13+
- Redis 6+
- Git
- MetaMask or compatible Web3 wallet
- Infura/Alchemy account for blockchain access
- Domain and SSL certificates (production)

## 🏗️ Infrastructure Setup

### Development Environment

1. **Clone and Setup**
```bash
git clone https://github.com/yourusername/coinestate-platform.git
cd coinestate-platform
npm run install:all
```

2. **Database Setup**
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb coinestate_db
sudo -u postgres createuser -s coinestate_user

# Set password
sudo -u postgres psql -c "ALTER USER coinestate_user PASSWORD 'your_password';"
```

3. **Redis Setup**
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

4. **Environment Configuration**
```bash
# Copy environment files
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp contracts/.env.example contracts/.env

# Edit with your values
nano frontend/.env
nano backend/.env
nano contracts/.env
```

5. **Start Development Servers**
```bash
# Terminal 1: Local blockchain
npm run dev:contracts

# Terminal 2: Backend API
npm run dev:backend

# Terminal 3: Frontend
npm run dev:frontend
```

### Production Environment

#### 1. Server Setup (Ubuntu 20.04 LTS)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/coinestate-platform.git
cd coinestate-platform

# Install dependencies
npm run install:all

# Build applications
npm run build

# Set up environment files
cp frontend/.env.example frontend/.env.production
cp backend/.env.example backend/.env.production

# Configure production environment variables
nano frontend/.env.production
nano backend/.env.production
```

#### 3. Database Setup

```bash
# Create production database
sudo -u postgres createdb coinestate_production
sudo -u postgres createuser coinestate_prod

# Set password and permissions
sudo -u postgres psql
ALTER USER coinestate_prod PASSWORD 'strong_production_password';
GRANT ALL PRIVILEGES ON DATABASE coinestate_production TO coinestate_prod;
\q

# Run migrations
cd backend
npm run migrate
```

#### 4. Smart Contract Deployment

```bash
cd contracts

# Deploy to mainnet (CAUTION: Real money involved)
npm run deploy:contracts:mainnet

# Or deploy to Goerli testnet first
npm run deploy:contracts:goerli

# Verify contracts on Etherscan
npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS
```

#### 5. Process Management with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'coinestate-backend',
      script: './backend/src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 'max',
      exec_mode: 'cluster'
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 6. Nginx Configuration

```bash
# Create Nginx configuration
sudo cat > /etc/nginx/sites-available/coinestate << EOF
server {
    listen 80;
    server_name coinestate.io www.coinestate.io;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name coinestate.io www.coinestate.io;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Frontend
    location / {
        root /home/ubuntu/coinestate-platform/frontend/build;
        try_files \$uri \$uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/coinestate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. SSL Certificate Setup

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d coinestate.io -d www.coinestate.io

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm run install:all
      - run: npm run test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.PRIVATE_KEY }}
          script: |
            cd /home/ubuntu/coinestate-platform
            git pull origin main
            npm run install:all
            npm run build
            pm2 restart coinestate-backend
            sudo systemctl reload nginx
```

## 📊 Monitoring and Maintenance

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs coinestate-backend

# System metrics
pm2 install pm2-server-monit
```

### Database Backup

```bash
# Create backup script
cat > /home/ubuntu/backup_db.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U coinestate_prod coinestate_production > /backups/coinestate_\$DATE.sql
find /backups -name "coinestate_*.sql" -mtime +7 -delete
EOF

chmod +x /home/ubuntu/backup_db.sh

# Schedule daily backups
(crontab -l ; echo "0 2 * * * /home/ubuntu/backup_db.sh") | crontab -
```

### Security Updates

```bash
# Regular security updates
sudo apt update && sudo apt upgrade -y

# Node.js security audit
npm audit --audit-level moderate
npm audit fix

# PM2 updates
pm2 update
```

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 3001 are available
2. **Database connection**: Check PostgreSQL service and credentials
3. **Blockchain connectivity**: Verify Infura/Alchemy API keys
4. **File permissions**: Ensure correct ownership for uploaded files

### Log Locations

- **Application logs**: `pm2 logs`
- **Nginx logs**: `/var/log/nginx/`
- **System logs**: `journalctl -u nginx`
- **Database logs**: `/var/log/postgresql/`

### Health Checks

```bash
# API health
curl https://coinestate.io/health

# Database connection
psql -h localhost -U coinestate_prod -d coinestate_production -c "SELECT 1;"

# Redis connection
redis-cli ping
```

## 🔄 Updates and Rollbacks

### Deployment Updates

```bash
# Standard update
git pull origin main
npm run install:all
npm run build
pm2 restart coinestate-backend

# With database migrations
cd backend
npm run migrate
cd ..
pm2 restart coinestate-backend
```

### Rollback Procedure

```bash
# Rollback to previous version
git log --oneline -n 10  # Find commit hash
git checkout <previous_commit_hash>
npm run install:all
npm run build
pm2 restart coinestate-backend

# Database rollback (if needed)
cd backend
npm run migrate:rollback
```

## 📞 Support

For deployment issues:
- Check logs: `pm2 logs coinestate-backend`
- Review documentation: `/docs`
- Contact: devops@coinestate.io

---

**⚠️ Important Security Notes:**
- Never commit private keys or sensitive environment variables
- Use strong passwords for all services
- Enable firewall and limit SSH access
- Regular security updates and monitoring
- Backup critical data regularly
