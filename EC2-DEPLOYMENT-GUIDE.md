# Torch Fellowship Backend - EC2 Deployment Guide

This comprehensive guide will help you deploy the Torch Fellowship backend to an Amazon EC2 instance with production-ready security and scalability configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [EC2 Instance Setup](#ec2-instance-setup)
3. [Security Configuration](#security-configuration)
4. [Deployment Options](#deployment-options)
5. [Domain and SSL Setup](#domain-and-ssl-setup)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Maintenance and Updates](#maintenance-and-updates)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

## Prerequisites

### Required
- AWS account with EC2 access
- Domain name (recommended for production)
- MongoDB Atlas account or AWS DocumentDB
- Cloudinary account for image uploads
- Google AI API key
- Basic understanding of Linux command line

### Recommended
- AWS Route 53 for DNS management
- AWS CloudWatch for monitoring
- AWS Systems Manager for secrets management
- Load balancer for high availability

## EC2 Instance Setup

### 1. Launch EC2 Instance

#### Instance Configuration
- **AMI**: Ubuntu Server 22.04 LTS (recommended) or Amazon Linux 2
- **Instance Type**: 
  - Development: t3.micro (1 vCPU, 1 GB RAM)
  - Production: t3.small or t3.medium (2+ vCPU, 4+ GB RAM)
  - High traffic: t3.large or c5.large
- **Storage**: 20-50 GB EBS gp3 (depending on log retention needs)
- **Key Pair**: Create new or use existing for SSH access

#### Network Settings
- **VPC**: Default or custom VPC
- **Subnet**: Public subnet (for direct internet access)
- **Auto-assign Public IP**: Enable

### 2. Security Groups Configuration

Create a security group with the following rules:

#### Inbound Rules
```
| Type  | Protocol | Port Range | Source      | Description                |
|-------|----------|------------|-------------|----------------------------|
| SSH   | TCP      | 22         | Your IP     | SSH access                 |
| HTTP  | TCP      | 80         | 0.0.0.0/0   | HTTP traffic               |
| HTTPS | TCP      | 443        | 0.0.0.0/0   | HTTPS traffic              |
| Custom| TCP      | 5000       | 0.0.0.0/0   | Application port (temp)    |
```

**Note**: Remove port 5000 access after setting up reverse proxy

#### Outbound Rules
- Keep default (All traffic to 0.0.0.0/0)

### 3. Elastic IP (Recommended)

Associate an Elastic IP to your instance for:
- Consistent IP address
- Easier DNS configuration
- Better for production environments

## Security Configuration

### 1. Initial Server Hardening

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Create swap file (if instance has < 2GB RAM)
  sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Configure timezone
sudo timedatectl set-timezone UTC

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common
```

### 2. Firewall Configuration

```bash
# Enable and configure UFW
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Temporarily allow app port (remove after nginx setup)
sudo ufw allow 5000

# Check status
sudo ufw status verbose
```

### 3. SSH Hardening

```bash
# Edit SSH configuration
sudo nano /etc/ssh/sshd_config

# Recommended settings:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes
# Port 22 (or change to non-standard port)
# MaxAuthTries 3
# ClientAliveInterval 300
# ClientAliveCountMax 2

# Restart SSH service
sudo systemctl restart sshd
```

### 4. Fail2Ban Installation

```bash
# Install fail2ban
sudo apt install -y fail2ban

# Create custom configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Edit configuration
sudo nano /etc/fail2ban/jail.local

# Key settings:
# bantime = 1h
# findtime = 10m
# maxretry = 3

# Start and enable
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## Deployment Options

### Option 1: PM2 Deployment (Recommended)

#### Quick Start
```bash
# Download and run deployment script
wget https://raw.githubusercontent.com/your-repo/torch-fellowship-backend/main/deploy/deploy-ec2.sh
chmod +x deploy-ec2.sh

# Run deployment
./deploy-ec2.sh https://github.com/your-username/torch-fellowship-backend.git your-domain.com
```

#### Manual Steps
1. Install Node.js and PM2
2. Clone repository
3. Configure environment variables
4. Start application with PM2
5. Configure Nginx reverse proxy

### Option 2: Docker Deployment

#### Quick Start
```bash
# Download and run Docker deployment script
wget https://raw.githubusercontent.com/your-repo/torch-fellowship-backend/main/deploy/deploy-docker-ec2.sh
chmod +x deploy-docker-ec2.sh

# Run deployment
./deploy-docker-ec2.sh https://github.com/your-username/torch-fellowship-backend.git your-domain.com
```

## Environment Configuration

### 1. Production Environment Variables

Create `/home/ubuntu/torch-fellowship-backend/.env`:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/torch-fellowship-prod
DB_NAME=torch-fellowship-prod

# JWT Configuration (generate with: openssl rand -hex 64)
JWT_SECRET=your_64_character_secret_here
JWT_EXPIRES_IN=30d

# API Keys
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# CORS Configuration
FRONTEND_URL=https://your-domain.com
ADDITIONAL_CORS_ORIGINS=https://www.your-domain.com,https://admin.your-domain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Secure Environment Management

#### Using AWS Systems Manager Parameter Store
```bash
# Store sensitive values
aws ssm put-parameter --name \"/torch-fellowship/prod/jwt-secret\" --value \"your_secret\" --type \"SecureString\"
aws ssm put-parameter --name \"/torch-fellowship/prod/mongodb-uri\" --value \"your_uri\" --type \"SecureString\"

# Retrieve in application startup script
JWT_SECRET=$(aws ssm get-parameter --name \"/torch-fellowship/prod/jwt-secret\" --with-decryption --query 'Parameter.Value' --output text)
```

## Domain and SSL Setup

### 1. DNS Configuration

Point your domain to your EC2 instance:

#### Route 53 (Recommended)
```
Type: A
Name: your-domain.com
Value: [Your Elastic IP]
TTL: 300

Type: A
Name: www.your-domain.com
Value: [Your Elastic IP]
TTL: 300
```

### 2. SSL Certificate with Let's Encrypt

The deployment scripts automatically configure SSL, but manual setup:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Verify auto-renewal
sudo systemctl status certbot.timer
```

### 3. Security Headers

Nginx configuration includes security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)

## Monitoring and Logging

### 1. Application Monitoring

#### PM2 Monitoring
```bash
# Check application status
pm2 status

# View logs
pm2 logs torch-fellowship-backend

# Monitor CPU/Memory
pm2 monit
```

#### Docker Monitoring
```bash
# Check container status
docker ps
docker-compose ps

# View logs
docker logs torch-fellowship-backend
docker-compose logs -f
```

### 2. System Monitoring

#### CloudWatch Agent (Recommended)
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
sudo systemctl start amazon-cloudwatch-agent
```

### 3. Log Management

#### Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/torch-fellowship

# Content:
/home/ubuntu/torch-fellowship-backend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Load Balancer Setup (High Availability)

### 1. Application Load Balancer

#### Create ALB
1. Go to EC2 → Load Balancers
2. Create Application Load Balancer
3. Configure listeners (HTTP:80, HTTPS:443)
4. Add target group with your EC2 instance
5. Configure health checks (`/health`)

#### Security Group for ALB
```
Inbound:
- HTTP (80) from 0.0.0.0/0
- HTTPS (443) from 0.0.0.0/0

Outbound:
- Port 5000 to EC2 security group
```

#### Update EC2 Security Group
```
# Remove direct HTTP/HTTPS access
# Allow ALB access to port 5000
Type: Custom TCP
Port: 5000
Source: [ALB Security Group ID]
```

### 2. Auto Scaling (Optional)

For high traffic scenarios:
1. Create AMI from configured instance
2. Create Launch Template
3. Set up Auto Scaling Group
4. Configure scaling policies

## Maintenance and Updates

### 1. Regular Updates

```bash
# Use the update script
./deploy/update.sh

# Or manual update
cd /home/ubuntu/torch-fellowship-backend
git pull origin main
npm ci --production
pm2 reload torch-fellowship-backend
```

### 2. Database Backups

#### MongoDB Atlas (Automatic)
- Enable automated backups
- Configure retention policy
- Test restore procedures

#### Manual Backup Script
```bash
#!/bin/bash
# Create backup script
mongodump --uri=\"$MONGODB_URI\" --out=\"/backup/$(date +%Y%m%d_%H%M%S)\"

# Add to crontab for daily backups
0 2 * * * /home/ubuntu/backup-db.sh
```

### 3. System Updates

```bash
# Weekly system update (add to crontab)
#!/bin/bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
npm audit fix
```

## Troubleshooting

### Common Issues

#### 1. Application Not Starting
```bash
# Check PM2 logs
pm2 logs torch-fellowship-backend

# Check system logs
sudo journalctl -u nginx
sudo tail -f /var/log/nginx/error.log

# Check environment variables
node -e \"console.log(process.env.MONGODB_URI ? 'DB config OK' : 'DB config missing')\"
```

#### 2. Database Connection Issues
```bash
# Test MongoDB connection
node test-mongo.js

# Check network connectivity
telnet cluster.mongodb.net 27017

# Verify firewall rules
sudo ufw status
```

#### 3. SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Check Nginx configuration
sudo nginx -t
```

#### 4. High Memory Usage
```bash
# Check memory usage
free -h
top

# Restart application
pm2 restart torch-fellowship-backend

# Add swap if needed
sudo fallocate -l 2G /swapfile2
```

### Performance Optimization

#### 1. Node.js Optimization
```bash
# Increase Node.js memory limit in PM2
# ecosystem.config.js
node_args: ['--max-old-space-size=1024']
```

#### 2. Nginx Optimization
```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript;
```

#### 3. Database Optimization
- Use MongoDB connection pooling
- Implement database indexing
- Monitor slow queries
- Use read replicas for scaling

## Security Best Practices

### 1. Regular Security Tasks

#### Weekly
- [ ] Review access logs
- [ ] Check for failed login attempts
- [ ] Update system packages
- [ ] Verify SSL certificate status

#### Monthly
- [ ] Rotate JWT secrets
- [ ] Review IAM permissions
- [ ] Update dependencies
- [ ] Security audit

#### Quarterly
- [ ] Full security assessment
- [ ] Disaster recovery test
- [ ] Update security groups
- [ ] Review backup procedures

### 2. Security Monitoring

#### CloudTrail (Recommended)
- Enable CloudTrail for API logging
- Monitor EC2 configuration changes
- Set up alerts for security events

#### GuardDuty (Recommended)
- Enable AWS GuardDuty
- Configure threat detection
- Set up notifications

### 3. Compliance Considerations

#### Data Protection
- Encrypt data in transit (HTTPS/TLS)
- Encrypt data at rest (EBS encryption)
- Implement data retention policies
- Configure audit logging

#### Access Control
- Use IAM roles instead of access keys
- Implement least privilege principle
- Enable MFA for AWS console access
- Regular access reviews

## Cost Optimization

### 1. Instance Right-Sizing
- Monitor CPU/Memory usage
- Use CloudWatch metrics
- Consider Reserved Instances for production
- Implement auto-scaling for variable loads

### 2. Storage Optimization
- Use gp3 instead of gp2 for EBS
- Implement log rotation
- Consider S3 for long-term log storage
- Monitor storage usage

### 3. Network Optimization
- Use CloudFront for static content
- Implement caching strategies
- Optimize API responses
- Consider regional deployment

## Support and Documentation

### Useful Commands Reference

```bash
# Application Management
pm2 status                          # Check app status
pm2 logs torch-fellowship-backend   # View logs
pm2 restart torch-fellowship-backend # Restart app
pm2 reload torch-fellowship-backend  # Zero-downtime restart

# System Management
sudo systemctl status nginx         # Check Nginx status
sudo systemctl reload nginx         # Reload Nginx config
sudo ufw status                     # Check firewall
sudo tail -f /var/log/nginx/access.log # View Nginx logs

# Health Checks
curl http://localhost:5000/health   # Local health check
curl https://your-domain.com/health # External health check

# Updates
./deploy/update.sh                  # Update application
./deploy/update.sh status           # Check status
./deploy/update.sh logs 100         # View logs
```

### Emergency Procedures

#### Application Down
1. Check health endpoint
2. Review application logs
3. Verify database connectivity
4. Restart application
5. If needed, rollback to previous version

#### High Traffic Spike
1. Monitor system resources
2. Scale instance size if needed
3. Enable auto-scaling
4. Consider adding load balancer
5. Implement caching

#### Security Incident
1. Change all passwords/keys
2. Review access logs
3. Update security groups
4. Patch any vulnerabilities
5. Document and report incident

For additional support, refer to:
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)