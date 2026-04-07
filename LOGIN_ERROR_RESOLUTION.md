# Login Error Resolution - "Tenant not found or not accessible"

## 🔍 Root Cause Analysis

Your error message **"Tenant not found or not accessible"** indicates one of these issues:

### **Issue #1: HCL Commerce VM is Unreachable** ⚠️ MOST LIKELY

**Evidence:**
```
Error: Unable to connect to the remote server
URL: https://20.40.52.251/store/715842834/loginidentity
```

**Status:** The backend cannot reach the HCL VM at `https://20.40.52.251`

**Causes:**
- HCL VM is offline or not running
- Network connectivity issue between client and HCL VM
- Firewall blocking access
- Incorrect HCL_HOST URL

---

## ✅ Immediate Solution: Use Mock Authentication

For **development without HCL VM access**, switch to mock authentication:

### Step 1: Update `.env` file

```env
USE_REAL_HCL_AUTH=false
```

### Step 2: Restart backend

```powershell
Get-Process node | Stop-Process -Force
node api/server.js
```

### Step 3: Test login in browser

Go to: `http://localhost:3000/customer/login`

Use test credentials:
- **Username:** `auroraadobetest`
- **Password:** `passw0rd`

Expected result: ✅ Login should succeed with mock auth

---

## 🔧 Fix for Real HCL Access

When you have HCL VM access, follow these steps:

### Step 1: Verify HCL VM is Online

```powershell
Test-Connection 20.40.52.251 -Count 1
```

**If you see ping responses:** VM is reachable ✅
**If you see "Destination host unreachable":** VM is offline ❌

### Step 2: Verify Store ID

Your current Store ID: `715842834`

Verify this exists in HCL Commerce and is accessible to user `auroraadobetest`.

### Step 3: Update `.env` with Correct Values

```env
USE_REAL_HCL_AUTH=true
HCL_HOST=https://20.40.52.251
HCL_STORE_ID=715842834
```

### Step 4: Restart Backend

```powershell
Get-Process node | Stop-Process -Force
node api/server.js
```

### Step 5: Test Diagnostic Endpoint

Visit: `http://localhost:3001/api/hcl/auth/diagnose`

Should show your HCL configuration and test endpoints.

---

## 🚀 Improvements Made

We've added several enhancements to help you debug this:

### 1. Better Error Handling
- Code now tries multiple endpoint paths automatically
- Detailed error messages show what went wrong
- Fallback endpoints for different HCL versions

### 2. Diagnostic Endpoint
```
GET http://localhost:3001/api/hcl/auth/diagnose
```

Shows:
- Current HCL configuration
- Authentication mode (MOCK vs REAL)
- Login endpoints being tried
- Instructions for fixing issues

### 3. Test Script
```powershell
powershell -ExecutionPolicy Bypass -File test-hcl-login.ps1
```

Tests HCL connectivity directly and shows:
- Network connectivity status
- HCL API response
- Detailed error messages

### 4. Troubleshooting Guide
File: `HCL_TROUBLESHOOTING.md`

Comprehensive guide covering:
- Root cause analysis
- Solutions for each scenario
- Development workflows
- Advanced debugging

---

## 📋 Recommended Next Steps

### **For Local Development (No HCL VM):**
1. ✅ Set `USE_REAL_HCL_AUTH=false` in `.env`
2. ✅ Test login with mock credentials (`auroraadobetest` / `passw0rd`)
3. ✅ Verify login form works and stores token in sessionStorage
4. ✅ Continue development with mock auth

### **For Real HCL Testing:**
1. ⏳ Verify HCL VM is online: `Test-Connection 20.40.52.251`
2. ⏳ Confirm Store ID (`715842834`) exists in HCL
3. ⏳ Confirm user (`auroraadobetest`) exists in HCL
4. ⏳ Set `USE_REAL_HCL_AUTH=true` in `.env`
5. ⏳ Run backend and test login

---

## 📊 Login Flow After Fix

```
Browser
  ↓ (User submits form)
  ↓
Frontend: /customer/login
  ↓ POST to /api/hcl/login
  ↓
Backend: hclAuthController.login()
  ├─ Check if USE_REAL_HCL_AUTH=true
  ├─ If YES: Call hclRestAuth.login()
  │  ├─ Try: POST /store/{storeId}/loginidentity
  │  └─ Fallback: POST /identity/v1/customers/login
  └─ If NO: Call mockHCLAuth.login()
     └─ Returns mock token immediately
  ↓ Response with { wcToken, userId, email, ... }
  ↓
Frontend: Store token in sessionStorage
  ├─ hcl_wcToken
  ├─ hcl_userId
  ├─ hcl_email
  └─ hcl_displayName
  ↓
Frontend: Render "Welcome, {displayName}"
```

---

## 🐛 Debugging Tips

### Check Current Auth Mode
```bash
curl http://localhost:3001/api/hcl/auth/diagnose
```

### Check Backend Logs
```
[AUTH-CONTROLLER] Login attempt for user: auroraadobetest
[AUTH-CONTROLLER] Using MOCK authentication (development mode)
[AUTH-CONTROLLER] ✓ Login successful for user: auroraadobetest
```

### Check Browser Console (F12)
```
[LOGIN] Attempting login with: {username: 'auroraadobetest', ...}
[LOGIN] Response status: 200
[LOGIN] Auth data received: {userId: '123', email: 'aurora@example.com'}
```

### Check SessionStorage (DevTools → Application → Session Storage)
```
hcl_wcToken: "mock-token-123"
hcl_userId: "user-123"
hcl_email: "aurora@example.com"
hcl_displayName: "Aurora Test User"
```

---

## 📝 Git Commits

Three commits made to fix this issue:

```
27fd19d - fix: Add diagnostic endpoint and improve error handling
204f850 - docs: Add HCL login troubleshooting guide and diagnostic script
```

---

## ✨ Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| HCL VM unreachable | Network/offline | Use mock auth or verify VM online |
| Store ID not found | Wrong/missing store ID | Verify in HCL, update in `.env` |
| User not found | User doesn't exist | Create user in HCL Commerce |
| Wrong endpoint | Version mismatch | Code tries multiple endpoints automatically |

**Quick Start:** Set `USE_REAL_HCL_AUTH=false` and test with mock credentials.

**Status:** ✅ Infrastructure ready for testing. Choose authentication mode in `.env`.
