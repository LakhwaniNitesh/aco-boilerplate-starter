# Testing the WCTrustedToken Fix

## Problem Statement

The add-to-cart operation was failing with:

```
CWXFR0213E: A security error has occurred because WCTrustedToken was not passed with WCToken when using HTTPS.
```

## Root Cause

1. **Backend**: Successfully extracting `WCTrustedToken` from HCL login response ✅
2. **Backend**: Should include `wcTrustedToken` in response to frontend ❌ **NOT CONFIRMED**
3. **Frontend**: Should receive and store `wcTrustedToken` ❌ **NOT HAPPENING**
4. **Frontend**: Should send `trustedToken` with cart requests ❌ **NOT HAPPENING**

## Solution Implemented

### Backend Changes

**File: `api/controllers/hcl-auth-controller.js`**

- Added detailed logging to show what's in the response before sending
- Response includes both `wcToken` and `wcTrustedToken` fields

**File: `api/utils/hcl-rest-auth.js`**

- Extracts `WCTrustedToken` from HCL response
- Returns as `wcTrustedToken` and `trustedToken` (alias)

### Frontend Changes

**File: `scripts/hcl-commerce-auth.js`**

- Constructor now initializes `this.trustedToken`
- `login()` method extracts `wcTrustedToken` from response and stores in `this.trustedToken`
- `storeToken()` persists `trustedToken` to sessionStorage
- `getTrustedToken()` retrieves current trusted token
- Added detailed logging to verify storage

**File: `scripts/hcl-commerce-api.js`**

- `request()` method now calls `hclAuthService.getTrustedToken()`
- Includes `trustedToken` in every cart request body alongside `accessToken`
- Added detailed logging to verify sending

**File: `api/controllers/hcl-cart-controller.js`**

- Already extracts `trustedToken` from request body
- Passes to HCL Commerce API

**File: `api/utils/hcl-client.js`**

- Sets separate headers: `WCToken` and `WCTrustedToken`
- Never duplicates the token value

## Test Procedure

### 1. Fresh Start

```bash
# Kill all node processes
Stop-Process -Name node -Force

# Restart server
npm run dev:backend
npm run dev:frontend
```

### 2. Check Backend Logging on Login

**Expected logs when user logs in:**

```
[AUTH-CONTROLLER] ✓ Login successful for user: auroraadobetest

[AUTH-CONTROLLER] BEFORE SENDING RESPONSE - authResult contains: {
  hasWcToken: true,
  hasWcTrustedToken: true,  ← MUST BE TRUE
  hasTrustedToken: true,
  wcTokenSample: "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2F...",
  wcTrustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",
  trustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t..."
}

[AUTH-CONTROLLER] RESPONSE DATA BEING SENT TO FRONTEND: {
  success: true,
  hasWcToken: true,
  hasWcTrustedToken: true,  ← MUST BE TRUE
  hasTrustedToken: true,
  wcTokenSample: "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2F...",
  wcTrustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",
  trustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",
  hasCookies: true,
  cookieKeys: [ 'JSESSIONID', 'WC_PERSISTENT' ]
}

[AUTH-CONTROLLER] FULL RESPONSE DATA: {
  "success": true,
  "wcToken": "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2FTN0OTORW...",
  "wcTrustedToken": "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2tfkg0kBHwztJVw%3D",  ← MUST BE PRESENT
  "accessToken": "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2FTN0OTORW...",
  "trustedToken": "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2tfkg0kBHwztJVw%3D",
  ...
}
```

### 3. Check Frontend Logging on Login

**Open browser console and look for:**

```
[HCL-AUTH] RECEIVED RAW RESPONSE FROM SERVER: {
  hasWcToken: true,
  wcTokenSample: "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2F...",
  hasWcTrustedToken: true,  ← MUST BE TRUE
  wcTrustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",
  hasAccessToken: true,
  hasTrustedToken: true,    ← MUST BE TRUE
  hasSessionCookies: true
}

[HCL-AUTH] STORED IN SERVICE PROPERTIES: {
  hasToken: true,
  tokenSample: "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2F...",
  hasTrustedToken: true,    ← MUST BE TRUE
  trustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",
  hasUserId: true
}
```

### 4. Check sessionStorage After Login

Open browser DevTools → Application → Session Storage → http://localhost:3000

**Must contain:**

```json
{
  "hcl_auth": {
    "token": "1007002%2CKTUTiEb%2F...",
    "trustedToken": "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",  ← MUST BE PRESENT
    "userId": "1007002",
    "expiry": 1775702530889,
    "sessionCookies": { ... },
    "storedAt": 1775702530889
  }
}
```

### 5. Check Frontend Logging on Add to Cart

**Expected logs when clicking "Add to Cart":**

```
[HCL-API] PREPARING CART REQUEST {
  hasAccessToken: true,
  accessTokenSample: "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2F...",
  hasTrustedToken: true,    ← MUST BE TRUE
  trustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t..."
}

[HCL-API] Session cookies from auth service: {
  hasCookies: true,
  cookieCount: 2,
  keys: [ 'JSESSIONID', 'WC_PERSISTENT' ]
}

[HCL-API] ✓ Including 2 session cookies in request

[HCL-API] FINAL REQUEST BODY BEING SENT: {
  hasPartNumber: true,
  hasAccessToken: true,
  hasTrustedToken: true,    ← MUST BE TRUE
  accessTokenSample: "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2F...",
  trustedTokenSample: "1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2t...",
  hasSessionCookies: true,
  sessionCookieCount: 2
}
```

### 6. Check Backend Logging on Cart Add

**Expected logs when cart add request arrives:**

```
[CART-PROXY] Full request body keys: [ 'partNumber', 'sku', 'quantity', 'accessToken', 'trustedToken', 'sessionCookies' ]

[CART-PROXY] Trusted token present: yes    ← MUST BE YES
[CART-PROXY] Token (first 50 chars): 1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2FTN0OTORW
[CART-PROXY] Trusted token present: yes    ← CRITICAL!

[DEBUG] TOKEN BEING SENT (AS HEADERS, URL-ENCODED)
[DEBUG] ║ WCToken header: 1007002%2CKTUTiEb%2F5BYFQ9m6ZI2GxMz8IUa%2FTN0OTORW...
[DEBUG] ║ WCTrustedToken header: 1007002%2CTqdJGUO0v1QZsqAwCgYDhJV6i0KV2tfkg0kBHwztJVw%3D
```

### 7. Success Criteria

**Cart add request should return 200 with:**

```json
{
  "success": true,
  "message": "Product added to cart",
  "cart": {
    "cartId": "...",
    "items": [
      {
        "partNumber": "CLA022_220101",
        "quantity": 1,
        ...
      }
    ],
    "total": 99.99
  }
}
```

**NOT:**

```json
{
  "statusCode": 401,
  "message": "HTTP 401",
  "details": {
    "errors": [
      {
        "errorKey": "ERR_SECURE_TOKEN_NOT_IN_HTTPS",
        "errorMessage": "CWXFR0213E: A security error has occurred because WCTrustedToken was not passed..."
      }
    ]
  }
}
```

## Debugging Checklist

If the test fails, check:

- [ ] Backend logs show `hasWcTrustedToken: true` in auth response
- [ ] Frontend logs show `hasWcTrustedToken: true` in received response
- [ ] sessionStorage contains `trustedToken` after login
- [ ] Frontend logs show `hasTrustedToken: true` when preparing cart request
- [ ] Backend logs show `Trusted token present: yes` in cart controller
- [ ] HCL API receives both `WCToken` and `WCTrustedToken` headers (not the same value)

## Files Modified

All changes made to implement the two-token system:

### Backend

- `api/controllers/hcl-auth-controller.js` - Return both tokens
- `api/controllers/hcl-cart-controller.js` - Extract and verify trustedToken
- `api/utils/hcl-rest-auth.js` - Extract WCTrustedToken from HCL response
- `api/utils/hcl-client.js` - Send separate headers for both tokens

### Frontend

- `scripts/hcl-commerce-auth.js` - Store and retrieve trustedToken
- `scripts/hcl-commerce-api.js` - Send trustedToken with requests
- `scripts/product-details.js` - No changes (uses hcl-commerce-api)

## Expected Behavior

### Login Flow

```
User logs in
  ↓
HCL returns: {WCToken: "...", WCTrustedToken: "..."}
  ↓
Backend extracts both and returns to frontend
  ↓
Frontend stores both in sessionStorage
  ↓
Success message displayed
```

### Add to Cart Flow

```
User clicks "Add to Cart"
  ↓
Frontend retrieves both tokens from sessionStorage
  ↓
Frontend sends: {accessToken: "...", trustedToken: "..."}
  ↓
Backend sets headers: WCToken: "..." AND WCTrustedToken: "..."  (DIFFERENT VALUES!)
  ↓
HCL Commerce verifies both tokens and adds to cart
  ↓
Response: {success: true, cart: {...}}
```

## Notes

- The tokens MUST be different values (not duplicated)
- Both tokens MUST be sent with EVERY cart operation
- Tokens expire after 25 minutes
- Session cookies (JSESSIONID, WC_PERSISTENT) must also be sent
- Do NOT decode URL-encoded token values - send as-is
