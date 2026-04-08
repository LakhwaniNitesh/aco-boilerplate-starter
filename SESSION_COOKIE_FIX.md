# HCL Commerce Session Cookie Integration Fix

## Problem Summary

The "Add to Cart" was failing with **HTTP 400: "This request cannot run as a generic user"** error despite having correct authentication tokens.

### Root Cause

HCL Commerce authentication requires **TWO components**:

1. **Tokens** (WCToken, WCTrustedToken) - Returned in login response body
2. **Session Cookies** (JSESSIONID, WC_PERSISTENT) - Returned in login response Set-Cookie headers

The original implementation was capturing and sending the tokens but **NOT capturing the session cookies from the login response**.

**The Error Flow:**
- Login succeeded → Tokens returned
- Tokens sent to cart endpoint → HCL didn't recognize as authenticated
- HCL responded with 400 "generic user" error
- Even session cookies captured from the 400 response weren't enough because they were "recovery" cookies, not the original session cookies

## Solution

Implement **complete session cookie propagation** across three layers:

### 1. Backend: Capture Login Cookies (`api/utils/hcl-rest-auth.js`)

```javascript
// Extract Set-Cookie headers from login response
const setCookieHeader = response.headers.get('set-cookie');

// Parse and store as sessionCookies object
const sessionCookies = {};
if (setCookieHeader) {
  const cookieStrings = Array.isArray(setCookieHeader) 
    ? setCookieHeader 
    : [setCookieHeader];
  cookieStrings.forEach(cookieString => {
    const parts = cookieString.split(';');
    const [name, value] = parts[0].split('=');
    if (name && value) {
      sessionCookies[name.trim()] = value.trim();
    }
  });
}

// Return to login controller
return {
  success: true,
  wcToken: wcToken,
  accessToken: wcToken,
  sessionCookies: sessionCookies, // ← NEW
  // ... other fields
};
```

### 2. Backend: Pass Cookies to Frontend (`api/controllers/hcl-auth-controller.js`)

```javascript
res.json({
  success: true,
  wcToken: authResult.wcToken,
  accessToken: authResult.wcToken,
  userId: authResult.userId,
  // ... other fields
  sessionCookies: authResult.sessionCookies || {}, // ← NEW
});
```

### 3. Frontend: Store & Send Cookies (`scripts/hcl-commerce-auth.js`)

```javascript
// Store session cookies from login
if (data.sessionCookies) {
  this.sessionCookies = data.sessionCookies;
}

// Provide getter for API requests
getSessionCookies() {
  return this.sessionCookies || {};
}

// Store in sessionStorage with token
storeToken() {
  const data = {
    token: this.token,
    sessionCookies: this.sessionCookies || {}, // ← NEW
    // ... other fields
  };
  sessionStorage.setItem('hcl_auth', JSON.stringify(data));
}
```

### 4. Frontend: Include in API Requests (`scripts/hcl-commerce-api.js`)

```javascript
async request(method, endpoint, body = null) {
  const token = hclAuthService.getToken();
  const sessionCookies = hclAuthService.getSessionCookies(); // ← NEW

  if (body) {
    const requestBody = {
      ...body,
      accessToken: token,
      sessionCookies: sessionCookies, // ← NEW
    };
    options.body = JSON.stringify(requestBody);
  }
  // ... rest of method
}
```

### 5. Backend: Initialize HCL Client with Cookies (`api/controllers/hcl-cart-controller.js`)

```javascript
// Extract from request body
const { sessionCookies: bodySessionCookies } = req.body;

// Initialize HCL client with captured cookies
if (bodySessionCookies && Object.keys(bodySessionCookies).length > 0) {
  Object.assign(hclClient.sessionCookies, bodySessionCookies);
}

// Now addToCart() will use these cookies in first request
const hclResponse = await hclClient.addToCart(accessToken, productId, ...);
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND LOGIN                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. User enters credentials                                  │
│ 2. POST /api/hcl/login                                      │
│    → Backend makes request to HCL                           │
│    → HCL returns tokens + Set-Cookie headers                │
│    → Backend captures BOTH ✓                                │
│    → Returns to frontend: wcToken + sessionCookies ✓        │
│ 3. Frontend stores in sessionStorage ✓                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND ADD TO CART                                        │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks "Add to Cart"                                │
│ 2. Fetch token + sessionCookies from sessionStorage          │
│ 3. POST /api/hcl/cart/add                                   │
│    body: {                                                  │
│      partNumber: "SKU123",                                  │
│      quantity: 1,                                           │
│      accessToken: "1007002%2C...",         ✓ from login    │
│      sessionCookies: {                      ✓ from login    │
│        JSESSIONID: "0000tXpK...",                           │
│        WC_PERSISTENT: "hM1T9y..."                          │
│      }                                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ BACKEND CART PROXY                                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Extract token + sessionCookies from body                 │
│ 2. Initialize HCL client sessionCookies:                    │
│    hclClient.sessionCookies = {                             │
│      JSESSIONID: "0000tXpK...",                             │
│      WC_PERSISTENT: "hM1T9y..."                             │
│    }                                                        │
│ 3. Call hclClient.addToCart(token, productId, ...)          │
│    → First request to HCL with:                             │
│        • WCToken = decoded token ✓                         │
│        • WCTrustedToken = decoded token ✓                  │
│        • JSESSIONID = captured from login ✓                │
│        • WC_PERSISTENT = captured from login ✓             │
│ 4. HCL recognizes authenticated user ✓                     │
│ 5. Item added to cart successfully ✓                       │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

### Backend (Server-side)
1. `api/utils/hcl-rest-auth.js` - Capture Set-Cookie from login response
2. `api/controllers/hcl-auth-controller.js` - Return sessionCookies to frontend
3. `api/controllers/hcl-cart-controller.js` - Extract and initialize with sessionCookies
4. `api/utils/hcl-client.js` - Enhanced logging for session cookie capture

### Frontend (Client-side)
1. `scripts/hcl-commerce-auth.js` - Store/retrieve sessionCookies
2. `scripts/hcl-commerce-api.js` - Include sessionCookies in API requests

## Commits

```
ca30cb5 feat: Include session cookies from login in all cart API requests
d8c88ff fix: Capture and propagate session cookies from login to cart requests
210ac50 fix: Auto-retry add-to-cart with session cookies on 'generic user' error
8441b6a debug: Add detailed session cookie capture logging
cd484ec feat: Add comprehensive token verification logging to trace token flow
```

## Testing

### Manual Test Steps

1. **Login:**
   - Browser Console: Check if login succeeds
   - Backend Logs: Verify "Captured session cookie: JSESSIONID" message
   - Frontend: Verify sessionStorage contains sessionCookies object

2. **Add to Cart:**
   - Backend Logs: Should show "Initializing HCL client with N session cookies"
   - Backend Logs: Should show "Add to cart attempt 1/2" → Success on attempt 1
   - Frontend: Should display success message
   - Cart should show the added item

### Expected Log Output

**Login:**
```
[HCL-REST-AUTH] Captured session cookie from login: JSESSIONID
[HCL-REST-AUTH] Captured session cookie from login: WC_PERSISTENT
[AUTH-CONTROLLER] ✓ Login successful
```

**Add to Cart:**
```
[CART-PROXY] Session cookies from login: 2 cookies
[CART-PROXY] Initializing HCL client with 2 session cookies from login
[DEBUG] Add to cart attempt 1/2
[DEBUG] ✓ Add to cart succeeded on attempt 1
[CART-PROXY] ✓ Added to HCL cart
```

## Key Differences from Previous Approach

| Aspect | Before | After |
|--------|--------|-------|
| **Session Cookies** | Not captured from login response | ✓ Captured from login Set-Cookie headers |
| **Token Only** | Tokens sent but HCL didn't recognize user | ✓ Tokens + Cookies sent together |
| **First Request** | Failed with 400 "generic user" | ✓ Succeeds with proper session cookies |
| **Retry Logic** | Retried with bad cookies | Not needed - first request succeeds |
| **Frontend Storage** | Token only | ✓ Token + Session Cookies |
| **API Requests** | Only token in body | ✓ Token + Session Cookies in body |

## Troubleshooting

**If Add to Cart still fails:**

1. **Check login response** - Verify Set-Cookie headers present:
   ```
   Backend logs should show:
   [HCL-REST-AUTH] Set-Cookie header from login: JSESSIONID=...
   ```

2. **Check frontend storage** - Verify sessionCookies stored:
   ```javascript
   // Browser console
   JSON.parse(sessionStorage.getItem('hcl_auth')).sessionCookies
   ```

3. **Check cart request** - Verify cookies included:
   ```
   Backend logs should show:
   [CART-PROXY] Session cookies from login: 2 cookies
   [CART-PROXY] Initializing HCL client with 2 session cookies
   ```

4. **Enable detailed logging** - Check hcl-client.js for:
   ```
   [DEBUG] SET-COOKIE RECEIVED FROM HCL
   [DEBUG] COMPLETE COOKIE HEADER BEING SENT
   [DEBUG] TOKEN BEING SENT TO HCL
   ```

## References

- **HCL Commerce Docs:** [Authentication & Session Management](https://help.hcl-software.com/commerce/9.0.0/restapi/code/authentication_and_session_management.html)
- **HTTP Cookies:** [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- **Session Management:** HTTP stateless protocol uses cookies for session persistence
