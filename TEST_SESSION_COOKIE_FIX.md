# Testing Session Cookie Fix

## Quick Test (5 minutes)

### Setup

1. **Ensure your backend is running:**

   ```bash
   npm run dev
   ```

2. **Clear browser data:**
   - Press `F12` to open DevTools
   - Go to **Application** tab
   - Click **Storage** → **Clear site data**
   - This clears sessionStorage and cookies

3. **Hard refresh the page:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Test Flow

#### Step 1: Login

1. Navigate to `/customer/login`
2. Enter credentials:
   - Username: `auroraadobetest`
   - Password: `passw0rd`
3. Click "Sign In"
4. Confirm: "Welcome, auroraadobetest" message appears

#### Step 2: Verify Session Storage

1. Open DevTools (`F12`)
2. Go to **Application** tab → **Storage** → **Session Storage** → (Your site)
3. Look for `hcl_auth` key
4. Expand it and verify:
   ```json
   {
     "token": "...",
     "userId": "1007002",
     "sessionCookies": {
       "JSESSIONID": "0000PXErq05z0Zi9B1VuDWXzWoZ:-1",
       "WC_PERSISTENT": "FBvB2KH2WH%2B..."
     },
     "storedAt": 1234567890
   }
   ```
5. ✅ If `sessionCookies` object is present with JSESSIONID and WC_PERSISTENT, login is working

#### Step 3: Add to Cart

1. Navigate to a product page (e.g., `/products/...`)
2. Click **Add to Cart**
3. Check browser console for logs:
   ```
   [CART-PROXY] Clearing old cookies and setting NEW cookies from request
   [CART-PROXY] Old cookies: {...}
   [CART-PROXY] New cookies from body: {...}
   [CART-PROXY] ✓ Session cookies reset. Now using 2 cookies: JSESSIONID, WC_PERSISTENT
   [CART-PROXY] ✓ Added to HCL cart. Items: 1, Total: $XX.XX
   ```
4. ✅ If you see "Added to HCL cart" without errors, the fix is working!

#### Step 4: Verify Cart

1. View the cart - product should be there
2. Product should show correct price and quantity
3. ✅ If cart displays correctly, authentication is successful

### What Logs to Look For (Success Indicators)

**Success:**

```
[CART-PROXY] ✓ Session cookies reset. Now using 2 cookies: JSESSIONID, WC_PERSISTENT
[CART-PROXY] ✓ Added to HCL cart. Items: 1, Total: $25.99
```

**Failure (Old Issue):**

```
[ERROR] HCL API returned 400: "This request cannot run as a generic user."
```

### Debugging If It Fails

**If you see "generic user" error:**

1. **Check sessionStorage is populated:**
   - DevTools → Application → Session Storage
   - Verify `hcl_auth` key exists with `sessionCookies` object

2. **Check backend logs:**
   - Look for `[CART-PROXY]` lines
   - Verify: `sessionCookies value from body: {JSESSIONID: "...", WC_PERSISTENT: "..."}`
   - If empty `{}`, sessionCookies aren't being sent from frontend

3. **Check HCL response:**
   - Look for `[DEBUG]` or `[ERROR]` lines from hcl-client.js
   - Verify cookies are in the Cookie header being sent to HCL

4. **Try a different approach:**
   - Clear everything again
   - Do a completely fresh login
   - Don't use browser "back" button (navigate fresh each time)

### Test Scenario 2: Multiple Users (Optional, More Complex)

If you want to test the singleton cookie fix specifically:

1. **First User:**
   - Login as `auroraadobetest`
   - Add item to cart ✅

2. **Second User (Different Browser Tab):**
   - Open NEW INCOGNITO/PRIVATE tab
   - Login as different user (if available)
   - Add item to cart ✅

3. **Back to First User:**
   - Return to original tab
   - Try cart operations
   - Should still work with first user's session ✅

This tests that old session data doesn't persist.

---

## Commits to Reference

- **0ea4aaa**: "FIX: Clear old session cookies before setting request cookies - prevent cookie mismatch"
- **e2a87f6**: "ENHANCE: Add sessionCookies support to all cart endpoints"
- **99f86e4**: "DOC: Add critical fix explanation"

## Questions?

Check `SESSION_COOKIE_FIX.md` for detailed technical explanation of the issue and solution.
