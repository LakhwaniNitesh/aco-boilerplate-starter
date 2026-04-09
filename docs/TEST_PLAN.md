# HCL Commerce Add-to-Cart Fix - Test Plan

## ✅ Fix Summary

**Root Cause:** Session cookies from login weren't being captured and passed to cart requests.

**Solution:** Complete session cookie propagation chain:

- Backend captures Set-Cookie headers from HCL login response
- Frontend receives and stores session cookies
- Frontend sends cookies with every cart API request
- Backend initializes HCL client with these cookies before cart operations

**Result:** Add-to-cart now sends BOTH tokens AND session cookies to HCL on the first request.

---

## 🚀 Quick Start Test

### 1. Start the backend dev server

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:backend
```

### 2. In another terminal, start the frontend

```powershell
npm run dev:frontend
```

### 3. In third terminal, start the proxy

```powershell
npm run dev:proxy
```

### 4. Test in browser

```
URL: http://localhost:8080/products/budget-laptop-CLA022_220101/CLA022_220101
```

---

## 📋 Manual Test Steps

### Step 1: Login

1. Open http://localhost:8080 in browser
2. Click "Account" → "Login"
3. Enter credentials:
   - Username: `auroraadobetest`
   - Password: `passw0rd`
4. Click "Login"

**Expected:**

- ✅ Login successful message displayed
- ✅ Backend logs show session cookies captured:
  ```
  [HCL-REST-AUTH] Captured session cookie from login: JSESSIONID
  [HCL-REST-AUTH] Captured session cookie from login: WC_PERSISTENT
  ```
- ✅ Browser sessionStorage contains sessionCookies

**Verify in Browser Console:**

```javascript
JSON.parse(sessionStorage.getItem("hcl_auth")).sessionCookies;
// Should output:
// {
//   JSESSIONID: "0000tXpK...",
//   WC_PERSISTENT: "hM1T9y..."
// }
```

---

### Step 2: Add Product to Cart

1. Navigate to product page: http://localhost:8080/products/budget-laptop-CLA022_220101/CLA022_220101
2. Click "Add to Cart" button
3. Wait for response

**Expected:**

- ✅ Success message: "Added to cart!"
- ✅ No error displayed
- ✅ Backend logs show:
  ```
  [CART-PROXY] Initializing HCL client with 2 session cookies from login
  [DEBUG] Add to cart attempt 1/2
  [DEBUG] ✓ Add to cart succeeded on attempt 1
  [CART-PROXY] ✓ Added to HCL cart
  ```

**NOT Expected (Bug Symptoms):**

- ❌ HTTP 400 error "This request cannot run as a generic user"
- ❌ `[DEBUG] Got "generic user" error - likely need session cookies`
- ❌ `[DEBUG] Add to cart attempt 2/2` (retry happening)

---

### Step 3: View Cart

1. Click on cart icon or navigate to `/cart`
2. Verify product is in cart with correct quantity

**Expected:**

- ✅ Product "Budget Laptop" appears in cart
- ✅ Quantity is 1
- ✅ Price is displayed correctly

---

## 🔍 Debug Verification

### Check 1: Backend Logs (Terminal 1)

**On Login:**

```
[HCL-REST-AUTH] FULL RESPONSE BODY: {
  "personalizationID": "...",
  "resourceName": "loginidentity",
  "WCToken": "1007002%2C...",  ← Token extracted
  "userId": "1007002",
  "WCTrustedToken": "1007002%2C..."
}
[HCL-REST-AUTH] ✓ Login successful for user: auroraadobetest
[DEBUG] ╔════════════════════════════════════════
[DEBUG] ║ SET-COOKIE RECEIVED FROM HCL
[DEBUG] ║ Count: 3
[DEBUG] ║ Cookie 1: JSESSIONID=... ← Captured ✓
[DEBUG] ║ Cookie 2: WC_PERSISTENT=... ← Captured ✓
[DEBUG] ║ Cookie 3: WC_PERSISTENT=... (second one)
[DEBUG] ╚════════════════════════════════════════
```

**On Add-to-Cart:**

```
[CART-PROXY] ║ TOKEN VERIFICATION
[CART-PROXY] ║ Full token: 1007002%2C... ← Token present ✓
[CART-PROXY] ║ Is URL-encoded: true ✓
[CART-PROXY] ║ Contains user ID (1007002): true ✓
[CART-PROXY] ║ Session cookies from login: 2 cookies ← NEW ✓
[CART-PROXY] Initializing HCL client with 2 session cookies ← NEW ✓
[DEBUG] ║ TOKEN BEING SENT TO HCL
[DEBUG] ║ Received token: 1007002%2C...
[DEBUG] ║ After decode: 1007002,... ← Decoded correctly ✓
[DEBUG] ║ COMPLETE COOKIE HEADER BEING SENT
[DEBUG] ║ WCToken=...; WCTrustedToken=...;
         JSESSIONID=...; WC_PERSISTENT=... ← All cookies included ✓
[DEBUG] Response status: 200 ← Success! ✓
[DEBUG] ✓ Add to cart succeeded on attempt 1 ← No retry needed ✓
```

### Check 2: Frontend Console

**On Login (Browser Console):**

```javascript
// Check if sessionCookies stored
JSON.parse(sessionStorage.getItem("hcl_auth"));
// Output should include:
// {
//   token: "1007002%2C...",
//   userId: "1007002",
//   sessionCookies: {
//     JSESSIONID: "0000tXpK...",
//     WC_PERSISTENT: "hM1T9y..."
//   }
// }
```

**On Add-to-Cart Request:**

```javascript
// Network tab shows POST /api/hcl/cart/add with body containing:
{
  "partNumber": "CLA022_220101",
  "quantity": 1,
  "accessToken": "1007002%2C...",
  "sessionCookies": {  ← NEW
    "JSESSIONID": "0000tXpK...",
    "WC_PERSISTENT": "hM1T9y..."
  }
}
```

### Check 3: Browser Network Tab

**POST /api/hcl/login Response Headers:**

```
HTTP/1.1 200 OK
Set-Cookie: JSESSIONID=0000tXpK...; Path=/; HttpOnly
Set-Cookie: WC_PERSISTENT=hM1T9y...; Path=/; ...
```

**POST /api/hcl/login Response Body:**

```json
{
  "success": true,
  "wcToken": "1007002%2C...",
  "accessToken": "1007002%2C...",
  "sessionCookies": {
    "JSESSIONID": "0000tXpK...",
    "WC_PERSISTENT": "hM1T9y..."
  }
}
```

---

## ⚠️ Troubleshooting

### Issue: Still getting "generic user" error

**Check these in order:**

1. **Verify login cookies are being captured:**

   ```
   Backend logs: [HCL-REST-AUTH] Captured session cookie from login: JSESSIONID
   If NOT present → HCL login not returning Set-Cookie headers
   ```

2. **Verify frontend stored cookies:**

   ```javascript
   // Browser console
   JSON.parse(sessionStorage.getItem("hcl_auth")).sessionCookies;
   // If empty/undefined → cookies not being stored
   ```

3. **Verify cookies sent to backend:**

   ```
   Network tab → POST /api/hcl/cart/add → Request body
   Check if "sessionCookies" field exists and has values
   ```

4. **Verify backend initialized HCL client:**
   ```
   Backend logs: [CART-PROXY] Initializing HCL client with N session cookies
   If missing → cookies not being extracted or initialized
   ```

### Issue: Add-to-cart retrying (attempt 2/2)

**Means:** First request failed with 400 "generic user"

**Check:**

- Verify Step 1 of troubleshooting above
- Verify sessionCookies properly formatted
- Check if JSESSIONID format is correct

### Issue: Cart not showing item after add

**Check:**

- Backend logs show success (200 response)
- Verify `/cart` endpoint returns the added item
- Check if cart is loading fresh data or using cached data

---

## 📊 Success Criteria

✅ **All of these must pass:**

1. Login succeeds without errors
2. Backend logs show session cookies captured from login
3. Frontend stores session cookies in sessionStorage
4. Add-to-cart succeeds on first attempt (attempt 1/2)
5. Backend logs show "✓ Add to cart succeeded on attempt 1"
6. Response status is 200 (not 400)
7. Cart page displays the added product
8. No retry logic needed (no attempt 2/2)

---

## 📝 Test Results Template

Use this to document your test run:

```markdown
## Test Run: [DATE & TIME]

### Login Test

- [ ] Login successful
- [ ] Backend logs show JSESSIONID captured
- [ ] Backend logs show WC_PERSISTENT captured
- [ ] Frontend sessionStorage contains sessionCookies

### Add-to-Cart Test

- [ ] Click button succeeds
- [ ] No 400 error displayed
- [ ] Backend logs show "attempt 1/2" only (no retry)
- [ ] Backend logs show "✓ Add to cart succeeded on attempt 1"
- [ ] Response status is 200

### Cart View Test

- [ ] Product appears in cart
- [ ] Quantity is correct
- [ ] Price is displayed

### Issues Encountered

[List any problems]

### Overall Result

[ ] PASS - All criteria met
[ ] FAIL - Issues found (see above)
```

---

## 🎯 Key Changes Made

**Backend Files:**

1. `api/utils/hcl-rest-auth.js` - Capture Set-Cookie headers
2. `api/controllers/hcl-auth-controller.js` - Return sessionCookies to frontend
3. `api/controllers/hcl-cart-controller.js` - Extract and use sessionCookies
4. `api/utils/hcl-client.js` - Enhanced logging

**Frontend Files:**

1. `scripts/hcl-commerce-auth.js` - Store/retrieve sessionCookies
2. `scripts/hcl-commerce-api.js` - Include sessionCookies in requests

**Documentation:**

1. `SESSION_COOKIE_FIX.md` - Complete technical documentation

---

## 🚨 Important Notes

- **Session storage only** - sessionCookies stored in browser sessionStorage (cleared on browser close)
- **No third-party storage** - Uses native browser APIs only
- **First request success** - With this fix, first add-to-cart request should succeed
- **No manual retry needed** - Automatic retry logic for 400 errors still in place as fallback
- **Token format unchanged** - Token URL-encoding/decoding logic remains the same

---

## 📞 Support

If tests fail:

1. Check **[SESSION_COOKIE_FIX.md](./SESSION_COOKIE_FIX.md)** for detailed explanation
2. Enable all logging to see complete flow
3. Compare your logs with "Expected Log Output" above
4. Check browser Network tab for exact request/response payloads
