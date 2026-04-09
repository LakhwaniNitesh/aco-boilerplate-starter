# Next Steps: Test the WCTrustedToken Fix

## What Was Done

I've implemented a comprehensive fix for the "add to cart failing" issue. The problem was that **WCTrustedToken was not being sent to HCL Commerce API**, causing a 401 authentication error.

**Error was:**

```
CWXFR0213E: A security error has occurred because WCTrustedToken was not passed with WCToken
```

## Changes Made

### Backend (3 files)

1. **`api/utils/hcl-rest-auth.js`** - Extract WCTrustedToken from HCL response
2. **`api/controllers/hcl-auth-controller.js`** - Return both tokens to frontend
3. **`api/controllers/hcl-cart-controller.js`** - Verify trustedToken in cart requests

### Frontend (2 files)

4. **`scripts/hcl-commerce-auth.js`** - Store and retrieve WCTrustedToken
5. **`scripts/hcl-commerce-api.js`** - Include trustedToken in all cart requests

### Already Working

6. **`api/utils/hcl-client.js`** - Correctly sends separate WCToken and WCTrustedToken headers

All changes include **detailed logging** to verify each step of the process.

## How to Test

### Step 1: Kill all Node processes

```powershell
Stop-Process -Name node -Force
```

### Step 2: Restart the backend server

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:backend
```

### Step 3: In another terminal, restart the frontend

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:frontend
```

### Step 4: Open browser and test

1. **Navigate to:** http://localhost:3000/customer/login

2. **Login with test credentials:**
   - Username: `auroraadobetest`
   - Password: `passw0rd`

3. **Check browser console (F12):**
   - Look for logs starting with `[HCL-AUTH]` and `[HCL-API]`
   - Should see: `hasTrustedToken: true` multiple times
   - Should NOT see: `hasTrustedToken: false`

4. **Check backend terminal:**
   - Look for `[AUTH-CONTROLLER]` and `[HCL-REST-AUTH]` logs
   - Should see: `hasWcTrustedToken: true`

5. **Navigate to a product:**
   - Go to: http://localhost:3000/products/budget-laptop-CLA022_220101

6. **Click "Add to Cart":**
   - Check browser console for: `[HCL-API] FINAL REQUEST BODY BEING SENT: { ... hasTrustedToken: true ... }`
   - Check backend terminal for: `[CART-PROXY] Trusted token present: yes`

7. **Expected Result:**
   - ✅ Product added to cart successfully
   - ✅ Mini-cart updates with item count
   - ✅ NO error message
   - ✅ NO 401 status code

## What to Look For

### Success Signs

```
Backend Login Logs:
[HCL-REST-AUTH] BEFORE RETURNING FROM login(), returnData contains: {
  hasWcToken: true,
  hasWcTrustedToken: true,  ← GOOD!
  wcTrustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i..."
}

Frontend Console:
[HCL-AUTH] RECEIVED RAW RESPONSE FROM SERVER: {
  hasWcToken: true,
  hasWcTrustedToken: true,  ← GOOD!
  wcTrustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i..."
}

[HCL-AUTH] STORED IN SERVICE PROPERTIES: {
  hasTrustedToken: true,    ← GOOD!
  trustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i..."
}

Backend Cart Add Logs:
[CART-PROXY] Trusted token present: yes  ← CRITICAL!
[DEBUG] ║ WCTrustedToken header: 1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i...
```

### Error Signs (What NOT to See)

```
❌ [HCL-AUTH] Service initialized with: { hasToken: true, hasTrustedToken: false, ... }
❌ [CART-PROXY] Trusted token present: no
❌ CWXFR0213E: A security error has occurred because WCTrustedToken was not passed
❌ HTTP 401 response
```

## Detailed Documentation

For more information, see:

- **`TRUSTED_TOKEN_FIX.md`** - Technical explanation of the fix
- **`TESTING_TRUSTED_TOKEN_FIX.md`** - Comprehensive testing guide
- **`WCTUSTED_TOKEN_IMPLEMENTATION.md`** - Implementation details

## What the Fix Does

### Before (Broken)

```
Frontend sends: {accessToken: "...", sessionCookies: {...}}
Backend sets headers:
  WCToken: [same token]
  WCTrustedToken: [same token]  ← WRONG! Should be different!
HCL rejects: "WCTrustedToken not passed properly"
Result: 401 Error
```

### After (Fixed)

```
Frontend sends: {accessToken: "...", trustedToken: "...", sessionCookies: {...}}
Backend sets headers:
  WCToken: [first token]
  WCTrustedToken: [second token]  ← CORRECT! Different values!
HCL accepts authentication
Result: 200 Success, product added to cart
```

## Troubleshooting

**If the fix doesn't work:**

1. ✅ Make sure you killed ALL node processes (use Task Manager if needed)
2. ✅ Make sure servers are restarted with fresh code
3. ✅ Check that console.log messages appear in both browser and terminal
4. ✅ Verify token values in logs are DIFFERENT (not the same value twice)
5. ✅ Look for the specific error in the HCL response

**If you see missing trustedToken anywhere:**

Check these in order:

1. Backend: Is `[HCL-REST-AUTH] BEFORE RETURNING` showing trustedToken?
   - If NO → HCL not returning it, check HCL response
   - If YES → Continue

2. Frontend: Did login response have `hasWcTrustedToken: true`?
   - If NO → Not being sent from backend
   - If YES → Continue

3. Frontend: Does sessionStorage show trustedToken after login?
   - If NO → Not being stored
   - If YES → Continue

4. Backend Cart: Is `Trusted token present: yes`?
   - If NO → Not being sent from frontend
   - If YES → Check HCL headers

## Quick Reference

**These are the KEY logs to verify the fix works:**

| Step                 | Log                                            | Expected         |
| -------------------- | ---------------------------------------------- | ---------------- |
| 1. Backend extracts  | `hasWcTrustedToken: true`                      | TRUE             |
| 2. Backend returns   | `wcTrustedTokenSample: "1007002%2CTqdJGUO..."` | NOT "MISSING"    |
| 3. Frontend receives | `hasWcTrustedToken: true`                      | TRUE             |
| 4. Frontend stores   | `hasTrustedToken: true`                        | TRUE             |
| 5. Frontend sends    | `hasTrustedToken: true` in request             | TRUE             |
| 6. Backend receives  | `Trusted token present: yes`                   | YES              |
| 7. HCL gets both     | Different WCToken and WCTrustedToken           | DIFFERENT VALUES |
| 8. Result            | Status 200                                     | SUCCESS          |

## Questions?

If something isn't working:

1. Provide the **FULL backend terminal log** when you login
2. Provide the **FULL browser console log** when you login
3. Provide the **FULL backend terminal log** when you click "Add to Cart"
4. Look for any log entries that don't match the "Expected" column above
