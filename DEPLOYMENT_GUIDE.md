# HCL Commerce Storefront - Deployment Guide

## Overview

This guide covers deploying the HCL Commerce integration to staging and production environments. The deployment includes:

- Backend proxy server (Express.js on port 3001)
- Frontend blocks and components
- Service layer (CartStore, authentication, API client)
- Testing infrastructure

---

## Prerequisites

- **Node.js**: v16.x or later
- **npm**: v7.x or later
- **Git**: For version control
- **Environment Variables**: Configured for target environment

### System Requirements

- **Disk Space**: Minimum 500MB
- **RAM**: Minimum 512MB (1GB recommended)
- **Network**: Stable connection to HCL Commerce API
- **Firewall**: Port 3001 (backend), 80/443 (frontend)

---

## Environment Configuration

### 1. Environment Variables Setup

Create `.env` file in project root (already tracked in `.env.dist`):

```env
# Backend Configuration
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0
NODE_ENV=production

# HCL Commerce API Configuration
HCL_API_BASE_URL=https://your-hcl-instance.com/api
HCL_API_KEY=your-api-key-here
HCL_API_SECRET=your-api-secret-here
HCL_MERCHANT_ID=default

# Authentication
JWT_SECRET=your-jwt-secret-key
TOKEN_EXPIRY=3600

# Frontend Configuration
FRONTEND_BASE_URL=https://your-storefront.com
CHECKOUT_URL=https://your-storefront.com/checkout

# Logging
LOG_LEVEL=info
```

### 2. Validate Environment Configuration

```bash
# Check required environment variables
npm run validate:env

# Output should confirm all required vars are set
```

### 3. Database Configuration (if needed)

For session persistence, configure supported backend:

- **Recommended**: Redis for session caching
- **Alternative**: In-memory (development only)
- **File-based**: SQLite (development/testing)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] 80%+ code coverage achieved
- [ ] All CRLF issues fixed (LF only)
- [ ] Build successful (`npm run build`)

### Documentation

- [ ] README.md updated
- [ ] Environment variables documented
- [ ] Deployment procedures documented
- [ ] API endpoints documented
- [ ] Known issues logged

### Security

- [ ] No hardcoded credentials in code
- [ ] Environment variables for all secrets
- [ ] HTTPS enforced in production
- [ ] CORS configured correctly
- [ ] Authentication properly implemented
- [ ] Error messages don't expose sensitive info

### Performance

- [ ] Bundle size acceptable
- [ ] Load test passing (100 concurrent requests)
- [ ] Cache headers configured
- [ ] Compression enabled
- [ ] CDN integration tested (if applicable)

### Git Repository

- [ ] All changes committed
- [ ] Branch clean (no uncommitted changes)
- [ ] Tag created for release (format: `v1.0.0`)
- [ ] Changelog updated

---

## Deployment Procedure

### Step 1: Pre-Deployment Verification

```bash
# 1. Verify environment
npm run validate:env

# 2. Run full test suite
npm test

# 3. Check coverage
npm run test:coverage

# 4. Run linting
npm run lint

# 5. Build project
npm run build

# 6. Run load test (if staging)
npm run load-test
```

### Step 2: Backend Deployment

#### Option A: Traditional Server (VPS/EC2)

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
cd /var/www
git clone https://github.com/your-org/aco-boilerplate.git
cd aco-boilerplate

# 3. Install dependencies
npm install --production

# 4. Set environment variables
cp .env.dist .env
# Edit .env with production values

# 5. Start backend server
npm start

# 6. Verify server running
curl http://localhost:3001/health
```

#### Option B: Docker Container

```bash
# 1. Build Docker image
docker build -t aco-storefront:latest .

# 2. Run container
docker run -d \
  --name aco-storefront \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e HCL_API_BASE_URL=https://your-api.com \
  aco-storefront:latest

# 3. Verify container
docker logs aco-storefront
curl http://localhost:3001/health
```

#### Option C: Cloud Platform (AWS, Azure, GCP)

**AWS Lambda + API Gateway**:

```bash
# Deploy using AWS CDK or Serverless Framework
npm install -g serverless
serverless deploy --stage production
```

**Azure App Service**:

```bash
# Deploy using Azure CLI
az webapp up --resource-group myResourceGroup \
  --name aco-storefront \
  --runtime "node|16-lts"
```

### Step 3: Frontend Deployment

#### For Edge Delivery Services (EDS)

```bash
# 1. Build frontend
npm run build:frontend

# 2. Sync to content delivery
npm run sync:eds

# 3. Clear cache
npm run cache:clear
```

#### For Traditional CDN

```bash
# 1. Build static files
npm run build:static

# 2. Upload to CDN
aws s3 sync ./dist s3://your-bucket/

# 3. Invalidate cache
aws cloudfront create-invalidation --distribution-id E123456 --paths "/*"
```

### Step 4: Database Migrations (if applicable)

```bash
# Run any pending migrations
npm run migrations:up

# Verify schema
npm run db:verify
```

### Step 5: Health Checks & Verification

```bash
# Check backend health
curl https://your-storefront.com/health

# Expected response:
# {
#   "status": "ok",
#   "uptime": 1234,
#   "version": "1.0.0"
# }

# Test authentication endpoint
curl -X POST https://your-storefront.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test cart endpoint
curl https://your-storefront.com/cart/get \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 6: Load Testing

```bash
# Run load test
npm run load-test

# Expected results:
# - 100 requests
# - 10 concurrent connections
# - <200ms average response time
# - 0% error rate
```

### Step 7: Smoke Tests

Navigate through production site and verify:

- [ ] Homepage loads
- [ ] Product pages load
- [ ] Add to cart works
- [ ] Cart page displays
- [ ] Checkout initiates
- [ ] Forms validate
- [ ] Errors display properly
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] No console errors

---

## Post-Deployment

### Monitoring Setup

```bash
# 1. Enable monitoring
npm run monitoring:enable

# 2. Set up alerts
npm run alerts:configure

# 3. Configure logging
npm run logging:setup
```

### Log Aggregation

Configure log aggregation service:

- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **CloudWatch** (AWS)
- **Application Insights** (Azure)

```bash
# Verify logs are flowing
npm run logs:verify
```

### Performance Monitoring

- Set up APM agent (New Relic, DataDog, etc.)
- Configure real user monitoring (RUM)
- Set up synthetic monitoring
- Monitor Core Web Vitals

### Backup & Recovery

```bash
# Backup database
npm run backup:database

# Verify backup
npm run backup:verify

# Test recovery procedure
npm run backup:test-recovery
```

---

## Rollback Procedure

If deployment has critical issues:

```bash
# 1. Identify issue and get previous version
git log --oneline | head -20

# 2. Revert to previous release
git revert <commit-hash>

# 3. Redeploy previous version
npm run deploy:staging

# 4. Verify rollback successful
curl https://your-storefront.com/health

# 5. Post-mortem: Investigate what went wrong
# - Check logs
# - Review error messages
# - Run diagnostics
# - Plan fix before next deployment
```

---

## Deployment Checklist

Before marking deployment complete:

### Immediate Post-Deployment (First Hour)

- [ ] All endpoints responding
- [ ] No critical errors in logs
- [ ] Authentication working
- [ ] Cart operations functional
- [ ] Database connections stable
- [ ] Load balancer health checks passing
- [ ] SSL certificates valid
- [ ] CDN content serving

### First Day Monitoring

- [ ] Error rates normal (<0.1%)
- [ ] Response times acceptable (<500ms p95)
- [ ] Database queries performant (<100ms p95)
- [ ] No spike in resource usage
- [ ] External API integrations healthy
- [ ] Customer issues logged and tracked

### First Week

- [ ] Performance metrics stable
- [ ] No memory leaks detected
- [ ] Backup successful
- [ ] Recovery procedure tested
- [ ] Documentation complete
- [ ] Team trained on new version

---

## Troubleshooting

### Backend Service Not Starting

```bash
# Check logs
pm2 logs aco-storefront

# Verify port not in use
netstat -tulpn | grep 3001

# Check environment variables
env | grep HCL

# Restart service
pm2 restart aco-storefront
```

### Authentication Failures

```bash
# Check token endpoint
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'

# Verify JWT secret configured
echo $JWT_SECRET

# Check HCL Commerce connection
curl $HCL_API_BASE_URL/health
```

### Cart Endpoint Errors

```bash
# Verify backend running
curl http://localhost:3001/health

# Check cart endpoint
curl http://localhost:3001/cart/get \
  -H "Authorization: Bearer YOUR_TOKEN"

# Review backend logs
pm2 logs aco-storefront | grep error
```

### High Memory Usage

```bash
# Check current memory usage
free -h

# Identify memory leaks
npm run analyze:memory

# Review application logs
pm2 logs --lines 100

# Restart service if necessary
pm2 restart aco-storefront --update-env
```

---

## Performance Optimization

### Enable Caching

```javascript
// In Express middleware
app.use(compression());
app.set("etag", "strong");
app.use(
  express.static("public", {
    maxAge: "1d",
    etag: false,
  }),
);
```

### Database Connection Pooling

```javascript
// Configure connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

### Redis Caching

```javascript
// Setup Redis for session/data caching
const redis = require("redis");
const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});
```

---

## Security Hardening

### HTTPS/TLS

```bash
# Verify SSL certificate valid
openssl s_client -connect your-storefront.com:443

# Check certificate expiration
curl -I https://your-storefront.com
```

### Security Headers

```javascript
// Add security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  next();
});
```

### API Rate Limiting

```javascript
// Implement rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);
```

---

## Version Management

### Semantic Versioning

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (1.x.0): New features (backward compatible)
- **PATCH** (1.0.x): Bug fixes only

### Git Tagging

```bash
# Create release tag
git tag -a v1.0.0 -m "Production release v1.0.0"

# Push tag to remote
git push origin v1.0.0

# List all tags
git tag -l
```

---

## Support & Escalation

### Deployment Issues

1. **Check logs**: `npm run logs:view`
2. **Verify configuration**: `npm run validate:env`
3. **Run diagnostics**: `npm run diagnostics`
4. **Rollback if critical**: Follow rollback procedure above

### Performance Issues

1. Run performance profiler: `npm run profile`
2. Check resource usage: `npm run monitoring:status`
3. Review database queries: `npm run db:profile`
4. Identify bottlenecks and optimize

### Security Issues

1. Run security scan: `npm run security:scan`
2. Update dependencies: `npm audit fix`
3. Review access logs: `npm run logs:security`
4. If breach suspected, follow incident response procedure

---

## Appendix: Commands Reference

```bash
# Deployment commands
npm run deploy:staging      # Deploy to staging
npm run deploy:production   # Deploy to production
npm run validate:env        # Validate environment config
npm run health:check        # Check application health
npm run load-test           # Run load testing
npm run monitoring:enable   # Enable monitoring
npm run logs:view          # View application logs
npm run backup:database    # Backup database
npm run restore:backup     # Restore from backup

# Utility commands
npm test                    # Run all tests
npm run test:coverage       # Check test coverage
npm run lint               # Run linting
npm run build              # Build application
npm start                  # Start application locally
npm run dev                # Start in development mode
```

---

**Document Version**: 1.0.0  
**Last Updated**: Current Date  
**Maintained By**: Development Team

For questions or issues, contact: devops@your-company.com
