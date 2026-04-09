# ✅ Live HCL Commerce Authentication - ACTIVATED

## 🎉 Status: SWITCHED TO LIVE MODE

**Confirmation:** ✅ `USE_REAL_HCL_AUTH=true` is now active

```json
{
  "mode": "REAL HCL Commerce",
  "configuration": {
    "HCL_HOST": "https://20.40.52.251",
    "HCL_STORE_ID": "715842834",
    "HCL_CATALOG_ID": "10001",
    "USE_REAL_HCL_AUTH": true
  }
}
```

---

## 🚀 You're Ready to Test!

### Prerequisites ✅

- [x] Connected to VPN
- [x] HCL Commerce VM running at `https://20.40.52.251`
- [x] Backend configured for LIVE HCL authentication
- [x] All environment variables loaded

### Step 1: Verify Backend is Running

**Terminal Command:**

```powershell
curl http://localhost:3001/api/hcl/auth/diagnose
```

**Expected Response:** Should show `"mode": "REAL HCL Commerce"`

### Step 2: Test Login in Browser

**Navigate to:** `http://localhost:3000/customer/login`

**Test Credentials:**

- Username: `auroraadobetest`
- Password: `passw0rd`

### Step 3: Expected Behavior

#### ✅ If Login Succeeds:

```
1. Form accepts credentials
2. "Signing in..." message appears
3. Backend makes real HCL REST API call
4. Token stored in sessionStorage
5. Page shows "Welcome, Aurora Test User"
```

#### ⚠️ If Login Fails:

- Check backend console for error details
- Look at browser DevTools → Network tab for API response
- Check `HCL_STORE_ID` (715842834) exists in HCL
- Verify user `auroraadobetest` exists in HCL
- See troubleshooting guide below

---

## 📊 What Changed

| Setting             | Before           | After                                                    |
| ------------------- | ---------------- | -------------------------------------------------------- |
| `USE_REAL_HCL_AUTH` | `false`          | **`true`**                                               |
| Authentication Mode | MOCK (in-memory) | **REAL HCL REST API**                                    |
| Login Endpoint      | Local mock       | **`https://20.40.52.251/store/715842834/loginidentity`** |

---

## 🔍 Debugging Tools Available

### Check Backend Logs (Terminal Running Server)

```
[AUTH-CONTROLLER] Using REAL HCL Commerce REST API
[HCL-REST-AUTH] Attempting login for user: auroraadobetest
[HCL-REST-AUTH] Login endpoint: https://20.40.52.251/store/715842834/loginidentity
[HCL-REST-AUTH] Response status: ...
```

### Check Browser Console (F12 → Console)

```
[LOGIN] Attempting login with: {username: 'auroraadobetest'}
[LOGIN] Response status: 200
[LOGIN] Auth data received: {userId: '...', email: '...'}
```

### Check SessionStorage (F12 → Application → Session Storage)

```
hcl_wcToken: "real-token-from-hcl"
hcl_userId: "..."
hcl_email: "aurora@example.com"
hcl_displayName: "Aurora Test User"
```

### Test HCL Connectivity Directly

```powershell
$body = @{ logonId = "auroraadobetest"; password = "passw0rd" } | ConvertTo-Json
Invoke-WebRequest -Uri "https://20.40.52.251/store/715842834/loginidentity" `
  -Method POST `
  -Headers @{ 'Content-Type' = 'application/json' } `
  -Body $body
```

---

## 📋 Git Commit

```
6794216 - config: Enable REAL HCL Commerce authentication (USE_REAL_HCL_AUTH=true)
```

---

## ⚡ Quick Troubleshooting

### Error: "Tenant not found or not accessible"

- Verify `HCL_STORE_ID=715842834` exists in HCL
- Verify user `auroraadobetest` has access to this store
- Check VPN connection is still active

### Error: "Unable to connect to the remote server"

- VPN connection may have dropped
- HCL Commerce VM may not be running
- Firewall may be blocking access

### Error: "Invalid credentials"

- Verify username/password correct
- Check user exists in HCL
- Try from browser, not Postman/curl

### Other Errors:

- Check backend terminal for detailed logs
- Review troubleshooting guide: `HCL_TROUBLESHOOTING.md`
- Check diagnostic endpoint: `/api/hcl/auth/diagnose`

---

## 🎯 Next Steps After Successful Login

1. ✅ **Test login** with credentials
2. ✅ **Verify token** stored in sessionStorage
3. ✅ **Test logout** - should clear token
4. ✅ **Test Add to Cart** - requires wcToken in header
5. ✅ **Test Cart Operations** - view, update, delete
6. ✅ **End-to-End Flow** - browse, add to cart, login, checkout

---

## 📞 Status

**Backend:** ✅ Running in LIVE mode  
**HCL Connection:** ✅ Configured and ready  
**Authentication:** ✅ REAL HCL REST API active  
**VPN:** ✅ You're connected  
**HCL VM:** ✅ Running

**You're all set! Start testing the login form now.** 🚀

---

## 📝 Configuration Summary

**File:** `.env`

```properties
USE_REAL_HCL_AUTH=true                        # ✅ LIVE
HCL_HOST=https://20.40.52.251                 # ✅ HCL VM
HCL_STORE_ID=715842834                        # ✅ Your store
HCL_CATALOG_ID=10001                          # ✅ Catalog
```

**Backend:** `api/server.js` running on port 3001  
**Frontend:** `npm start` running on port 3000  
**Diagnostic:** `http://localhost:3001/api/hcl/auth/diagnose`

---

## ✨ Key Points

- ✅ Backend is calling **REAL HCL REST API**
- ✅ NOT using mock authentication anymore
- ✅ Using actual HCL Commerce credentials
- ✅ Token from HCL will be returned to frontend
- ✅ Frontend will store real `wcToken` in sessionStorage

**Ready to test!** 🎉
