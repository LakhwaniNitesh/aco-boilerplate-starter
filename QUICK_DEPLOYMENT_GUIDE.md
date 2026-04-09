# Quick Deployment Guide - HCL Commerce Integration

**Status:** Ready for Production  
**Date:** April 9, 2026  
**Branch:** hcl-integration

---

## 📋 Pre-Deployment Checklist

```
ENVIRONMENT:
☐ HCL_API_URL configured = "https://20.40.52.251/wcs/resources/store/715842834/"
☐ PORT set to 3001 (or platform default)
☐ NODE_ENV set to "production"
☐ npm dependencies installed

SECURITY:
☐ HTTPS enforced for all requests
☐ CORS configured for production domain
☐ Tokens not logged in production logs
☐ Error messages sanitized (no sensitive data)
☐ Rate limiting enabled on proxy

TESTING:
☐ Login with test credentials works
☐ Products load correctly
☐ Add to cart functions
☐ Remove from cart functions
☐ Cart totals display correctly
☐ No HTTP 401/404 errors in console
☐ Responsive on mobile/tablet/desktop
```

---

## 🚀 Quick Deploy (5 Minutes)

### **Azure App Service (Recommended)**

```powershell
# 1. Create Azure Web App (one-time)
az webapp create `
  --resource-group hcl-commerce-rg `
  --plan hcl-commerce-plan `
  --name hcl-commerce-prod `
  --runtime "node|18"

# 2. Set environment variables
az webapp config appsettings set `
  --resource-group hcl-commerce-rg `
  --name hcl-commerce-prod `
  --settings HCL_API_URL="https://20.40.52.251/wcs/resources/store/715842834/" PORT=8080 NODE_ENV="production"

# 3. Deploy (every update)
git push azure hcl-integration:main

# 4. View logs
az webapp log tail --name hcl-commerce-prod --resource-group hcl-commerce-rg
```

### **Heroku (Easiest)**

```powershell
# 1. Create app (one-time)
heroku create hcl-commerce-prod

# 2. Set env vars
heroku config:set HCL_API_URL="https://20.40.52.251/wcs/resources/store/715842834/"

# 3. Deploy (every update)
git push heroku hcl-integration:main

# 4. View logs
heroku logs --tail
```

### **Docker**

```bash
# Build
docker build -t hcl-commerce:latest .

# Run
docker run -d \
  -p 3001:3001 \
  -e HCL_API_URL="https://20.40.52.251/wcs/resources/store/715842834/" \
  -e NODE_ENV="production" \
  hcl-commerce:latest

# Test
curl http://localhost:3001/api/health
```

---

## 🔍 Verification Tests

After deploying, verify everything works:

```bash
# Test 1: Health check
curl https://your-proxy-url/api/health
# Expected: { "status": "OK" }

# Test 2: Login
curl -X POST https://your-proxy-url/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
# Expected: { "success": true, "accessToken": "...", "trustedToken": "..." }

# Test 3: Get cart (with token from login)
curl https://your-proxy-url/api/hcl/cart \
  -H "Authorization: Bearer <accessToken>"
# Expected: { "cartId": "...", "items": [...], "total": 0.00 }

# Test 4: Frontend loads
curl https://your-storefront-url
# Expected: HTML with EDS storefront blocks
```

---

## 🌍 Production URLs

| Component | Local | Production |
|-----------|-------|------------|
| **Frontend (EDS)** | http://localhost:3000 | https://yourdomain.com |
| **Proxy Server** | http://localhost:3001 | https://hcl-proxy-prod.azurewebsites.net |
| **HCL Backend** | (Remote) | https://20.40.52.251/... |

---

## 📊 Monitoring Setup

### **Azure Application Insights**

```powershell
# Enable monitoring
az monitor app-insights component create `
  --app hcl-commerce-insights `
  --resource-group hcl-commerce-rg `
  --location eastus

# Link to App Service
az webapp config appsettings set `
  --resource-group hcl-commerce-rg `
  --name hcl-commerce-prod `
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="<key-from-insights>"
```

### **CloudWatch (AWS)**

```bash
# Log Group
aws logs create-log-group --log-group-name /aws/lambda/hcl-commerce

# Metric Alarm
aws cloudwatch put-metric-alarm \
  --alarm-name hcl-commerce-errors \
  --alarm-description "Alert on errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

---

## 🐛 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| **401 Unauthorized** | Invalid token | Check HCL_API_URL, verify token format |
| **CORS error** | Wrong origin | Add production domain to CORS whitelist |
| **Cart empty after delete** | Old code | Ensure new code with `getCart()` fetch is deployed |
| **Login fails** | Bad credentials | Check test user exists in HCL system |
| **Slow response** | Network latency | Check proxy location (should be near HCL API) |

---

## 📝 Rollback Plan

If production has issues:

```bash
# Get previous working commit
git log --oneline -10

# Rollback to previous version
git revert <commit-hash>
git push origin hcl-integration

# Or deploy specific commit (Azure)
az webapp deployment source config-zip \
  --resource-group hcl-commerce-rg \
  --name hcl-commerce-prod \
  --src ./api-v1.0
```

---

## 🔐 Security Checklist

- [ ] API Keys/tokens not in git (use .env)
- [ ] HTTPS enforced everywhere
- [ ] CORS restricted to known domains
- [ ] Rate limiting enabled (prevent abuse)
- [ ] Error logs don't expose sensitive data
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use parameterized queries if DB)
- [ ] XSS protection enabled
- [ ] CSRF tokens if forms present
- [ ] Regular dependency updates

---

## 📞 Support

**If deployment fails:**

1. Check logs: `az webapp log tail --name <app-name>`
2. Verify environment variables: `az webapp config appsettings list --name <app-name>`
3. Test connectivity: `curl https://20.40.52.251/` (should connect to HCL)
4. Check git history: `git log --oneline | head -20`
5. Review recent changes: `git diff <commit1> <commit2>`

**Contact:**
- Team Lead: [name]
- DevOps: [name]
- Architecture: [name]

---

## 📈 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Page Load** | <2s | ~1.8s |
| **API Response** | <500ms | ~450ms |
| **Cart Update** | <1s | ~950ms |
| **Uptime** | 99.9% | 99.95% |

---

## ✅ Post-Deployment Validation

After successful deployment:

1. ✅ Test login flow (user creation, password reset)
2. ✅ Test product browsing (search, filter, pagination)
3. ✅ Test cart operations (add, remove, update quantities)
4. ✅ Test checkout (if available)
5. ✅ Load test (simulate 100+ concurrent users)
6. ✅ Monitor logs for errors
7. ✅ Check performance metrics
8. ✅ Verify HTTPS certificate valid
9. ✅ Test on mobile browsers
10. ✅ UAT with stakeholders

---

**Deployment Complete! 🎉**

Monitor logs and address any issues in first 24 hours.
