# Add to Cart Not Working - Quick Fix Guide

## 🔴 Symptom

You see error: **"Failed to add product to cart: Internal Server Error"**

Network shows: **500 error** with URL like `undefined/wcs/resources/store/undefined/cart`

## 🟢 Root Cause

HCL Client environment variables (`HCL_HOST`, `HCL_STORE_ID`) were undefined because:

- Client was initialized **before** `.env` file was loaded
- Environment variables were not available at module import time

## ✅ Fix Applied

**Commit: 5c5cd8a**

### What Changed

1. **hcl-client.js**: Added `initialize()` method that reads environment variables
2. **server.js**: Calls `hclClient.initialize()` AFTER loading `.env` file

### How to Verify Fix

```bash
# 1. Check that server logs show initialization
npm run dev:backend

# Expected output:
# [INFO] ✅ HCL Client initialized successfully
# [INFO] HCL Client initialized: https://20.40.52.251/wcs/resources/store/715842834
```

## 🧪 Test the Fix

### Option 1: Manual Testing

1. Start all three services:

   ```bash
   # Terminal 1
   npm run dev:backend

   # Terminal 2
   npm run dev:frontend

   # Terminal 3
   npm run dev:proxy
   ```

2. Open browser: `http://localhost:8080/products/budget-laptop-cla022_220101`
3. Click "Add to Cart" button
4. Expected: Product adds successfully to cart

### Option 2: Run Test Script

```bash
# Start backend first
npm run dev:backend

# In another terminal, run test
node test-cart-endpoint.js
```

Expected output:

```
✅ Status: 200
✅ Success: true
✅ Items in cart: 1
✅ Cart total: $999.99
```

## 🔧 If Still Not Working

### Check 1: Backend Logs

```bash
# Look for:
[INFO] HCL Client initialized successfully
[INFO] HCL Client initialized: https://20.40.52.251/wcs/resources/store/715842834
```

If you DON'T see these messages:

- ❌ Fix not applied
- ❌ Run: `git pull origin hcl-integration`

### Check 2: Environment Variables

```bash
# Verify .env file exists and has values
cat .env | grep HCL_

# Expected output:
HCL_HOST=https://20.40.52.251
HCL_STORE_ID=715842834
HCL_CATALOG_ID=10001
```

### Check 3: Network Request

Browser DevTools → Network tab:

1. Look for request to `http://localhost:3001/api/hcl/cart/add`
2. Check Response tab
3. Should show:
   ```json
   {
     "success": true,
     "cart": {
       "items": [...],
       "total": 999.99
     }
   }
   ```

### Check 4: Backend Console

```bash
# Should show:
[CART-PROXY] Adding to cart: CLA022_220101 x1
[CART-PROXY] ✓ Added to HCL cart. Items: 1, Total: $999.99
```

## 📝 What Was Wrong

### Before Fix

```javascript
// hcl-client.js instantiated at import time
class HCLClient {
  constructor() {
    this.host = process.env.HCL_HOST; // ❌ undefined!
    this.storeId = process.env.HCL_STORE_ID; // ❌ undefined!
    this.baseUrl = `${this.host}/wcs/resources/store/${this.storeId}`;
    // Result: "undefined/wcs/resources/store/undefined"
  }
}
```

### After Fix

```javascript
// hcl-client.js defers initialization
class HCLClient {
  constructor() {
    this.host = null;
    this.storeId = null;
  }

  initialize() {
    this.host = process.env.HCL_HOST; // ✅ Now available!
    this.storeId = process.env.HCL_STORE_ID; // ✅ Now available!
    this.baseUrl = `${this.host}/wcs/resources/store/${this.storeId}`;
  }
}

// In server.js, called AFTER dotenv.config():
hclClient.initialize(); // ✅ Env vars loaded by this point
```

## 🎯 Quick Checklist

- [ ] Git log shows commit `5c5cd8a`
- [ ] Backend starts without errors
- [ ] Backend logs show "HCL Client initialized successfully"
- [ ] Add to cart button works
- [ ] No 500 errors in network tab
- [ ] Products appear in cart

## 📞 Still Having Issues?

1. Check recent git commits: `git log -5`
2. Verify code changes: `git show 5c5cd8a`
3. Check environment: `echo $HCL_HOST` / `echo $HCL_STORE_ID`
4. Restart backend: `npm run dev:backend`
5. Check full backend logs for any initialization errors

---

**Status:** ✅ FIXED  
**Tested:** ✅ YES  
**Ready to Use:** ✅ YES
