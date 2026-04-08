# Step-by-Step Testing Instructions

## Phase 1: Browser Refresh & Header Verification (2 minutes)

### Step 1: Hard Refresh Browser
```
Windows/Linux: Ctrl+F5
Mac: Cmd+Shift+R
```
This clears the cache and loads the new JavaScript with the fetch interceptor.

### Step 2: Verify Header is Visible
Navigate to: `http://localhost:8080/`

You should now see:
- ✅ **Left**: Adobe Commerce logo and navigation menu
- ✅ **Center**: Search bar
- ✅ **Right**: Account button (person icon), Cart icon
- ✅ **No error messages** about module loading

**If header is still missing**: Check browser console (F12) for errors. Should see NO red "TypeError" messages.

---

## Phase 2: Login & Session Storage (5 minutes)

### Step 3: Open Developer Tools Console
```
F12 → Console tab
```

Clear any previous logs (click the trash icon).

### Step 4: Click Account → Login

1. Click the **Account icon** (person) in top right
2. Click **Sign In**
3. The login modal should appear (or dropdown form)

### Step 5: Monitor Console During Login

**Expected logs IN ORDER:**
```
[HCL-AUTH-ADAPTER] Intercepted auth request to: <URL>
[HCL-AUTH-ADAPTER] Detected login request for: auroraadobetest
[HCL-AUTH-ADAPTER] Login successful from HCL
[HCL-AUTH-ADAPTER] Response data has sessionCookies: true
[HCL-AUTH-ADAPTER] Storing session cookies: {JSESSIONID: "...", WC_PERSISTENT: "..."}
[HCL-AUTH-ADAPTER] Full data being stored to sessionStorage.hcl_auth: {...}
[HCL-AUTH-ADAPTER] Verification - data from sessionStorage: {...}
```

**If you see these logs**: ✅ Auth adapter is working!

**If you see red error**: ❌ Something is still wrong, take a screenshot of the error.

### Step 6: Enter Credentials
- Username: `auroraadobetest`
- Password: `passw0rd`
- Click **Sign In**

### Step 7: Wait for Success Message
You should see: **"Welcome, auroraadobetest!"**

---

## Phase 3: Verify Session Storage (3 minutes)

### Step 8: Open Developer Tools → Application

1. Press **F12** → **Application** tab
2. Left sidebar → **Session Storage**
3. Click **http://localhost:8080**

### Step 9: Check for `hcl_auth` Key

You should see a key called `hcl_auth`.

**Click on `hcl_auth`** to view its value. It should contain:

```json
{
  "token": "1007002%2C9%2Flf2FlIs...",
  "userId": "1007002",
  "sessionCookies": {
    "JSESSIONID": "0000fwKByfZQGZ8FLO8uhS55ih-:-1",
    "WC_PERSISTENT": "MVRL1UKFwU5BDCD9hGYGJ8Yl..."
  },
  "storedAt": 1775676913138
}
```

**If you see both JSESSIONID and WC_PERSISTENT**: ✅ Cookies are stored correctly!

**If `sessionCookies` is empty `{}`**: ❌ Adapter isn't storing cookies, check console logs.

---

## Phase 4: Add to Cart Test (5 minutes)

### Step 10: Navigate to a Product Page

Click on a product, or go directly to:
```
http://localhost:8080/products/budget-laptop-CLA022_220101/CLA022_220101
```

### Step 11: Open Console (Preserve Logs)

1. **F12** → **Console** tab
2. Check the **"Preserve log"** checkbox (⚙️ icon, top right)

This keeps logs visible even during page navigation.

### Step 12: Scroll to Add to Cart Button

Find the product quantity selector and **"Add to Cart"** button.

### Step 13: Monitor Console & Click Add to Cart

**Expected logs:**
```
[PDP] Adding to HCL cart with accessToken
[PDP] Raw hcl_auth from sessionStorage: {"token":"1007002...", ...}
[PDP] Parsed authData: {token: "1007002...", ...}
[PDP] Retrieved session cookies for cart request: ['JSESSIONID', 'WC_PERSISTENT']
[PDP] Session cookies content: {...}
```

**If you see these logs**: ✅ Frontend is sending cookies!

**If you see `Raw hcl_auth from sessionStorage: null`**: ❌ sessionStorage got cleared somehow, try logging in again.

---

## Phase 5: Backend Verification (2 minutes)

### Step 14: Check Backend Terminal

In your backend terminal (running `npm run dev:backend`), look for these logs:

**FIRST attempt (should fail with generic user error):**
```
[CART-PROXY] sessionCookies value from body: {JSESSIONID: "0000...", WC_PERSISTENT: "..."}
[CART-PROXY] Session cookies from login: 2 cookies
```

**If you see non-empty sessionCookies object**: ✅ Frontend sent cookies!

**Second attempt (after getting generic user error, backend captures cookies from response):**
```
[DEBUG] Session cookies captured so far: {JSESSIONID: "...", WC_PERSISTENT: "..."}
[DEBUG] Retrying with any captured session cookies...
[DEBUG] Add to cart attempt 2/2
```

On the second attempt, the cart should succeed.

### Step 15: Check Frontend for Success

Back in browser, you should see:
- ✅ **"Product added to cart!"** message (green success notification)
- OR modal closes and product page shows updated state

---

## Success Criteria Checklist

- [ ] Header visible with navigation, search, auth icon
- [ ] No red errors in browser console during page load
- [ ] Login modal appears when clicking Account
- [ ] Console shows `[HCL-AUTH-ADAPTER]` logs during login
- [ ] "Welcome, username!" message appears after login
- [ ] `sessionStorage.hcl_auth` contains both JSESSIONID and WC_PERSISTENT
- [ ] PDP console shows `[PDP] Retrieved session cookies...` logs
- [ ] Backend console shows non-empty sessionCookies in cart request
- [ ] Add to cart succeeds (no 500 error, success message appears)

---

## If Something Fails

### Header Still Missing?
1. Check console for red errors
2. Look for "TypeError" or "Cannot assign to property"
3. Hard refresh again (might need to clear more cache: Ctrl+Shift+Delete)

### sessionStorage.hcl_auth Not Found?
1. Check console for `[HCL-AUTH-ADAPTER]` logs
2. If missing, the fetch interceptor isn't working
3. Verify hclAuthAdapter.js imported in renderAuthCombine.js and renderAuthDropdown.js

### Cart Still Failing?
1. Check browser console for logs about sessionCookies
2. Check if sessionCookies empty or present in sessionStorage
3. Backend should show what it received in `[CART-PROXY] sessionCookies value from body:`

---

## Screenshots to Take (If Failing)

1. **Browser console showing errors** (F12 → Console, full view)
2. **sessionStorage contents** (F12 → Application → Session Storage → hcl_auth)
3. **Backend logs during login and cart** (terminal output)

Share these if you need help debugging.
