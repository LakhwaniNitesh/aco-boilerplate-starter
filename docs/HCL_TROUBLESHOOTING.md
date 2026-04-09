# HCL Commerce Login - Troubleshooting Guide

## Issue: "Tenant not found or not accessible"

### Summary

When attempting to login, you're seeing the error: **"Tenant not found or not accessible"**

This error typically means one of the following:

1. **HCL Commerce VM is not reachable** (network issue)
2. **Store ID is incorrect or doesn't exist** (configuration issue)
3. **User doesn't exist in HCL Commerce** (user management issue)
4. **API endpoint is wrong** (version compatibility issue)

---

## Quick Diagnosis

### Step 1: Check Network Connectivity

```powershell
# Test if HCL VM is reachable
Test-Connection 20.40.52.251 -Count 1
```

**Expected Result:** Should respond with ping times
**Actual Result:** If "Destination host unreachable", the VM is offline

### Step 2: Check Current Configuration

Visit: `http://localhost:3001/api/hcl/auth/diagnose`

This shows:

- Current HCL_HOST
- Current HCL_STORE_ID
- Login endpoints being used
- Current authentication mode (MOCK or REAL)

### Step 3: Test Login Endpoint Directly

Use the provided PowerShell script:

```powershell
cd aco-boilerplate-starter
powershell -ExecutionPolicy Bypass -File test-hcl-login.ps1
```

---

## Solutions by Root Cause

### **SOLUTION 1: HCL VM is Offline/Unreachable**

**Symptom:** "Unable to connect to the remote server"

**Action:**

1. Verify HCL Commerce VM (https://20.40.52.251) is running
2. Check network connectivity to the VM
3. If VM is down, use MOCK authentication for development:
   ```env
   USE_REAL_HCL_AUTH=false
   ```

### **SOLUTION 2: Incorrect Store ID**

**Symptom:** "Tenant not found or not accessible" from HCL API

**Action:**

1. Verify the HCL_STORE_ID exists in your HCL Commerce instance
2. Common Store IDs: `B2CStore`, `ReactStore`, or numeric IDs like `715842834`
3. Get the correct Store ID from HCL Commerce admin or documentation
4. Update `.env` file:
   ```env
   HCL_STORE_ID=<correct_store_id>
   ```

### **SOLUTION 3: User Doesn't Exist**

**Symptom:** Login fails with authentication error

**Action:**

1. Verify user `auroraadobetest` exists in HCL Commerce
2. Create the user in HCL Commerce admin if missing
3. Verify password is correct
4. For development, use test credentials configured in `.env`

### **SOLUTION 4: Wrong API Endpoint**

**Symptom:** 404 or unexpected error from HCL API

**Action:**
The code automatically tries two endpoints:

1. Primary: `POST /store/{storeId}/loginidentity`
2. Alternative: `POST /identity/v1/customers/login`

If both fail, check HCL Commerce documentation for your version's API endpoint.

---

## Development Workflow

### Recommended: Use Mock Authentication

For local development **without HCL VM**:

```env
NODE_ENV=development
USE_REAL_HCL_AUTH=false
HCL_AUTH_USERNAME=auroraadobetest
HCL_AUTH_PASSWORD=passw0rd
```

Test credentials in mock mode:

- `auroraadobetest` / `passw0rd`
- `adobetest1` / `passw0rd`
- `adobetest2` / `passw0rd`

### When Ready: Switch to Real HCL

```env
USE_REAL_HCL_AUTH=true
HCL_HOST=https://20.40.52.251
HCL_STORE_ID=<your_store_id>
```

---

## Environment Variables Reference

| Variable            | Description            | Example                       |
| ------------------- | ---------------------- | ----------------------------- |
| `USE_REAL_HCL_AUTH` | Use real HCL or mock   | `false` (mock), `true` (real) |
| `HCL_HOST`          | HCL Commerce VM URL    | `https://20.40.52.251`        |
| `HCL_STORE_ID`      | Store ID in HCL        | `715842834` or `B2CStore`     |
| `HCL_CATALOG_ID`    | Catalog ID (optional)  | `10001`                       |
| `HCL_LANGUAGE_ID`   | Language ID (optional) | `-1`                          |
| `HCL_CURRENCY_ID`   | Currency ID (optional) | `1`                           |

---

## Advanced Debugging

### Enable Detailed Logging

Set in `.env`:

```env
LOG_LEVEL=debug
```

This will show:

- Exact endpoint URLs being called
- Request/response details
- Error messages from HCL API

### Check Backend Logs

While running the server:

```
[AUTH-CONTROLLER] Login attempt for user: auroraadobetest
[HCL-REST-AUTH] Attempting login for user: auroraadobetest
[HCL-REST-AUTH] Login endpoint: https://20.40.52.251/store/715842834/loginidentity
[HCL-REST-AUTH] Response status: 400
[HCL-REST-AUTH] Error response: { "message": "tenant not found" }
```

### Check Browser Console (F12)

The login form shows:

```
[LOGIN] Attempting login with: {username: 'auroraadobetest', ...}
[LOGIN] Response status: 400
[LOGIN] Response body: {"success":false,"error":"tenant not found or not accessible"}
```

---

## Quick Fixes Checklist

- [ ] Verify HCL VM is reachable (Test-Connection 20.40.52.251)
- [ ] Check `.env` has correct HCL_HOST and HCL_STORE_ID
- [ ] For development: USE_REAL_HCL_AUTH=false (use mock)
- [ ] Clear browser cache and hard refresh (Ctrl+Shift+Delete, then Ctrl+F5)
- [ ] Restart backend server (Stop-Process node, then npm start)
- [ ] Check `/api/hcl/auth/diagnose` endpoint for current config
- [ ] Check browser console for detailed error messages

---

## Contact & Support

If the issue persists:

1. Check HCL Commerce documentation for your version
2. Verify credentials with HCL admin
3. Check network connectivity to HCL VM
4. Review backend server logs for error details
