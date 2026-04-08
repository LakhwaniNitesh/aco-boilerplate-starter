# Quick Testing Guide - Add-to-Cart Fix (Commit 28be578)

## What Was Fixed

**The Problem:**
- Header module was crashing because `renderAuthCombine` tried to use a null DOM element
- When header crashed, `hclAuthAdapter.js` never loaded
- Without the auth adapter, sessionCookies never got stored
- Frontend sent empty cookies to backend
- Add-to-cart failed with "generic user" error

**The Solution:**
- Added defensive null checks in `renderAuthCombine.js` and `renderAuthDropdown.js`
- Now header loads even if DOM structure varies
- Auth adapter loads → Fetch interceptor activates → sessionCookies get stored
- Add-to-cart can now succeed

## Test Steps

### Step 1: Hard Refresh Browser
```
Press: Ctrl+F5  (or Cmd+Shift+R on Mac)
```
This clears cache and reloads all code.

### Step 2: Check Header Loads
**Expected:** Header visible with:
- ✅ Navigation menu (Catalog, Account, Search Order)
- ✅ Search bar
- ✅ Cart icon (top right)
- ✅ Account icon / Sign In button

**If NOT visible:**
- Open DevTools (F12) → Console
- Look for error starting with "failed to load module for header"
- If error still exists, report to agent with full error message

### Step 3: Check Console for No Errors
Open DevTools (F12) → Console tab

**Expected:** 
- No red error messages about header module
- May see yellow warnings (ok)
- `[HCL-AUTH-ADAPTER]` log messages (good sign)

**If you see:**
```
failed to load module for header 
TypeError: Cannot read properties of null...
```
→ The fix didn't work, contact agent with this error

### Step 4: Perform Login
1. Click **Account** → **Sign In**
2. Enter credentials:
   - Email/Username: (your test account)
   - Password: (your test account)
3. Click **Sign In** button
4. Wait for success message: "Welcome, [username]!"

### Step 5: Check Session Storage
After login succeeds:

1. Open DevTools (F12)
2. Go to **Application** tab
3. Left sidebar → **Session Storage**
4. Click **http://localhost:8080** (or your dev domain)
5. Look for entry: **hcl_auth**

**Expected value (when clicked):**
```json
{
  "token": "1007002,3E0KemTamA1v0WZJQEBZswHZ7GJyb6r...",
  "userId": "1007002",
  "sessionCookies": {
    "JSESSIONID": "0000VnnKLkLxAhuqJoi12KMuw9B:-1",
    "WC_PERSISTENT": "gWZiYW0Ho90vFnylRbylKa4..."
  },
  "storedAt": 1775683800000
}
```

**Critical:** Must see `sessionCookies` with both:
- `JSESSIONID` ✅
- `WC_PERSISTENT` ✅

**If sessionCookies is empty {} :**
→ Auth adapter not capturing cookies, contact agent

### Step 6: Check Browser Console During Login
Open DevTools (F12) → Console before clicking Sign In

**Expected logs after login:**
```
[HCL-AUTH-ADAPTER] Intercepted auth request to /auth
[HCL-AUTH-ADAPTER] Detected login (email + password provided)
[HCL-AUTH-ADAPTER] Calling /api/hcl/login...
[HCL-AUTH-ADAPTER] Received response with sessionCookies
[HCL-AUTH-ADAPTER] Storing to sessionStorage.hcl_auth
[HCL-AUTH-ADAPTER] Verification - data from sessionStorage
```

**If you DON'T see these logs:**
→ Auth adapter not loading, contact agent with console screenshot

### Step 7: Navigate to Product
1. Click **Catalog** 
2. Find any product
3. Click to open product details page

**Expected:** Product page loads with:
- ✅ Product name, image, price
- ✅ Quantity selector
- ✅ "Add to Cart" button

### Step 8: Add to Cart
1. Click **Add to Cart** button
2. Wait 2-3 seconds for response

**Expected Success:**
- ✅ Success notification appears: "Product added to cart!"
- ✅ Cart icon shows "1" item count
- ✅ NO red error message

**If you see error:**
```
Failed to add product to cart: Internal Server Error
OR
This request cannot run as a generic user.
```
→ sessionCookies not being sent, check Step 5

### Step 9: Check Backend Console
In the backend terminal (node api/server.js):

**Expected logs:**
```
[CART-PROXY] sessionCookies value from body: {"JSESSIONID":"0000VnnK...","WC_PERSISTENT":"gWZiYW0H..."}
[CART-PROXY] Session cookies from login: 2 cookies
[DEBUG] Session cookies: JSESSIONID=0000VnnK...; WC_PERSISTENT=gWZiYW0H...
[DEBUG] Adding to cart: CLA022_220101 x1
[DEBUG] Response status: 200  ✅
```

**If you see:**
```
[CART-PROXY] sessionCookies value from body: {}
```
→ Frontend not sending cookies, check Step 5 again

### Step 10: Verify Cart Count
1. Look at cart icon (top right of header)
2. Should show **"1"** badge on cart icon
3. Click cart icon
4. Should see product listed in mini-cart

## Success Criteria

All of these must be TRUE:

- [ ] Header loads without errors
- [ ] No "failed to load module for header" error in console
- [ ] Login succeeds with "Welcome" message
- [ ] sessionStorage.hcl_auth exists with non-empty sessionCookies
- [ ] Browser console shows [HCL-AUTH-ADAPTER] logs during login
- [ ] "Add to Cart" button works
- [ ] NO "generic user" error
- [ ] Product appears in mini-cart with correct count
- [ ] Backend logs show `sessionCookies value from body: {JSESSIONID:..., WC_PERSISTENT:...}`

## If Tests Pass ✅

Congratulations! The fix is working. The add-to-cart flow is now:

```
Login (stores cookies in sessionStorage)
  ↓
PDP retrieves cookies from sessionStorage
  ↓
Includes cookies in cart request body
  ↓
Backend recognizes authenticated user
  ↓
Add-to-cart succeeds 🎉
```

## If Tests Fail ❌

Common issues and diagnostics:

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| "failed to load module for header" error | Header module still crashing | Browser DevTools Console |
| Header visible but auth not working | hclAuthAdapter not loading | Look for [HCL-AUTH-ADAPTER] logs |
| sessionStorage.hcl_auth is empty {} | Fetch interceptor not capturing | Backend logs - did login return sessionCookies? |
| "generic user" error | No cookies sent to backend | Step 5 - verify hcl_auth has sessionCookies |
| Cart shows "Internal Server Error" | Backend can't reach HCL | Check backend terminal for HCL API errors |

**For any failures, take screenshot of:**
1. Browser console (F12 → Console tab)
2. sessionStorage (F12 → Application → Session Storage)
3. Backend terminal output
4. Network tab (F12 → Network) showing the cart request

Then contact the agent with these screenshots.

---

**Commit:** 28be578 - FIX: Add defensive null checks to prevent header module loading errors

**Documentation:** HEADER_MODULE_FIX.md (detailed technical explanation)
