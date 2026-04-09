# Summary of Changes: WCTrustedToken Fix

## The Problem

When trying to add a product to the cart, the application was receiving a **401 authentication error**:

```json
{
  "statusCode": 401,
  "message": "HTTP 401",
  "details": {
    "errors": [
      {
        "errorKey": "ERR_SECURE_TOKEN_NOT_IN_HTTPS",
        "errorMessage": "CWXFR0213E: A security error has occurred because WCTrustedToken was not passed with WCToken when using HTTPS."
      }
    ]
  }
}
```

## The Root Cause

HCL Commerce requires **TWO separate authentication tokens** to be sent with API requests:

1. **WCToken** - Main authentication token
2. **WCTrustedToken** - Trusted operations token (DIFFERENT value)

The application was extracting both tokens from the HCL login response but:

- ❌ NOT storing the WCTrustedToken in the frontend
- ❌ NOT sending the WCTrustedToken with cart requests
- ❌ Only sending WCToken (duplicated as both headers)

## The Solution

All changes follow the **same pattern**: Extract → Store → Send

### Backend Changes

#### 1. Extract from HCL Response

**File:** `api/utils/hcl-rest-auth.js` (~line 250)

```javascript
// Extract BOTH tokens from HCL response
const wcToken = responseBody.WCToken;
const wcTrustedToken = responseBody.WCTrustedToken;  // ← NEW

// Return BOTH tokens
return {
  success: true,
  wcToken: wcToken,
  wcTrustedToken: wcTrustedToken,  // ← NEW
  accessToken: wcToken,
  trustedToken: wcTrustedToken,    // ← NEW (alias)
  ...
}
```

#### 2. Return Both Tokens to Frontend

**File:** `api/controllers/hcl-auth-controller.js` (~line 85)

```javascript
const responseData = {
  success: true,
  wcToken: authResult.wcToken,
  wcTrustedToken: authResult.wcTrustedToken,  // ← NEW
  accessToken: authResult.wcToken,
  trustedToken: authResult.trustedToken,      // ← NEW
  ...
}
```

#### 3. Cart Controller Already Extracts It

**File:** `api/controllers/hcl-cart-controller.js` (~line 47)

```javascript
const {
  accessToken: bodyAccessToken,
  trustedToken: bodyTrustedToken,  // ← Already defined
  ...
} = req.body;

let trustedToken = bodyTrustedToken;  // ← Already extracted
```

### Frontend Changes

#### 4. Store Both Tokens

**File:** `scripts/hcl-commerce-auth.js` (~line 18)

```javascript
constructor() {
  this.token = this.getStoredToken();
  this.trustedToken = this.getStoredTrustedToken();  // ← NEW
  ...
}

login(username, password) {
  // ... fetch login ...
  this.token = data.wcToken;
  this.trustedToken = data.wcTrustedToken;  // ← NEW - Extract from response
  this.storeToken();
}

storeToken() {
  const data = {
    token: this.token,
    trustedToken: this.trustedToken,  // ← NEW - Store in sessionStorage
    ...
  }
}

getTrustedToken() {  // ← NEW method
  return this.trustedToken;
}
```

#### 5. Send Both Tokens with Requests

**File:** `scripts/hcl-commerce-api.js` (~line 40)

```javascript
async request(method, endpoint, body = null) {
  const token = hclAuthService.getToken();
  const trustedToken = hclAuthService.getTrustedToken();  // ← NEW

  if (body) {
    const requestBody = {
      ...body,
      accessToken: token,
      trustedToken: trustedToken,  // ← NEW - Include in every request
    };
    ...
  }
}
```

### Client Headers (Already Correct)

**File:** `api/utils/hcl-client.js` (~line 75)

```javascript
// Set SEPARATE headers with DIFFERENT token values
if (wcToken) headers["WCToken"] = wcToken; // Value 1
if (wcTrustedToken) headers["WCTrustedToken"] = wcTrustedToken; // Value 2 (different!)
```

## Data Flow

### Before Fix (Broken)

```
HCL Response: { WCToken: "token1", WCTrustedToken: "token2" }
    ↓
Backend stores both ✅
    ↓
Backend returns to frontend: { wcToken: "token1", wcTrustedToken: ??? }  ← Missing!
    ↓
Frontend stores: { token: "token1", trustedToken: undefined }  ❌
    ↓
Frontend sends: { accessToken: "token1" }  ❌ Missing trustedToken
    ↓
Backend sets headers:
  WCToken: "token1"
  WCTrustedToken: undefined OR "token1" (duplicate)  ❌
    ↓
HCL rejects: "WCTrustedToken not passed properly"
    ↓
401 Error ❌
```

### After Fix (Working)

```
HCL Response: { WCToken: "token1", WCTrustedToken: "token2" }
    ↓
Backend extracts both ✅
    ↓
Backend returns: { wcToken: "token1", wcTrustedToken: "token2" }  ✅
    ↓
Frontend receives: { wcToken: "token1", wcTrustedToken: "token2" }  ✅
    ↓
Frontend stores: { token: "token1", trustedToken: "token2" }  ✅
    ↓
Frontend sends: { accessToken: "token1", trustedToken: "token2" }  ✅
    ↓
Backend sets headers:
  WCToken: "token1"
  WCTrustedToken: "token2"  ✅ (different value)
    ↓
HCL validates both tokens ✅
    ↓
200 Success ✅
```

## Files Changed

| File                                     | Change Type      | Lines      | Change                                     |
| ---------------------------------------- | ---------------- | ---------- | ------------------------------------------ |
| `api/utils/hcl-rest-auth.js`             | Extract & Return | ~250, ~330 | Extract WCTrustedToken, return both tokens |
| `api/controllers/hcl-auth-controller.js` | Response         | ~85-100    | Include wcTrustedToken in response         |
| `api/controllers/hcl-cart-controller.js` | Already Done     | ~47        | Extracts trustedToken from body            |
| `scripts/hcl-commerce-auth.js`           | Store & Retrieve | Multiple   | New property, storage methods              |
| `scripts/hcl-commerce-api.js`            | Send in Requests | ~40        | Include trustedToken in body               |
| `api/utils/hcl-client.js`                | Already Done     | ~75        | Separate headers (already correct)         |

## Testing

After restart, verify:

1. **Login succeeds** → Check backend logs for `hasWcTrustedToken: true`
2. **Frontend receives tokens** → Check browser console for `hasWcTrustedToken: true`
3. **Frontend stores tokens** → Check sessionStorage for `trustedToken` field
4. **Add to cart succeeds** → Product appears in cart (200 response)
5. **No 401 error** → CWXFR0213E error is gone

## Logging Points

All changes include **comprehensive logging** at:

| Step         | Logger              | Message Pattern                                                                   |
| ------------ | ------------------- | --------------------------------------------------------------------------------- |
| Extract      | `[HCL-REST-AUTH]`   | `BEFORE RETURNING FROM login(), returnData contains: { hasWcTrustedToken: true }` |
| Return       | `[AUTH-CONTROLLER]` | `RESPONSE DATA BEING SENT TO FRONTEND: { hasWcTrustedToken: true }`               |
| Receive      | `[HCL-AUTH]`        | `RECEIVED RAW RESPONSE FROM SERVER: { hasWcTrustedToken: true }`                  |
| Store        | `[HCL-AUTH]`        | `STORED IN SERVICE PROPERTIES: { hasTrustedToken: true }`                         |
| Send         | `[HCL-API]`         | `FINAL REQUEST BODY BEING SENT: { hasTrustedToken: true }`                        |
| Receive Cart | `[CART-PROXY]`      | `Trusted token present: yes`                                                      |

## Code Pattern

The fix follows a consistent pattern across all files:

```
1. Extract the field
   const trustedToken = response.WCTrustedToken;

2. Store the field
   this.trustedToken = trustedToken;

3. Add to response/request
   { ..., trustedToken: trustedToken, ... }

4. Retrieve when needed
   const trustedToken = service.getTrustedToken();

5. Send with other data
   { accessToken: "...", trustedToken: "...", ... }
```

## Key Insights

- ✅ HCL Commerce **requires both tokens** to be sent
- ✅ The tokens are **different values** (not interchangeable)
- ✅ Both tokens must be sent with **every cart operation**
- ✅ Tokens can be **URL-encoded** (leave as-is, don't decode)
- ✅ Session cookies must **also be sent** (JSESSIONID, WC_PERSISTENT)

## Next Action

1. Restart servers
2. Login and verify logs
3. Add product to cart
4. Verify success (no 401 error)

See `NEXT_STEPS_TEST_FIX.md` for detailed testing instructions.
