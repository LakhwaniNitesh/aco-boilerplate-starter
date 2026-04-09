# HCL Commerce Authentication: WCTrustedToken Fix

## Issue Identified

**Error:** `CMN10139E: An invalid cookie was received for the user, your logonId may be in use by another user.`

**Root Cause:** The application was sending the same `WCToken` value for BOTH the `WCToken` header AND the `WCTrustedToken` header. HCL Commerce requires these to be **two completely different tokens**.

From the login response:

```
WCToken: 1007002%2Cp7Umebl4J86l3DjDyoPHcNMv%2B%2Bcy3K%2BdiK8zec...
WCTrustedToken: 1007002%2C6kvF2aentAMDcv6lEpxbBWhbH0pgZPU1jls8KUfp4Sg%3D
```

These are **DIFFERENT tokens** and must be sent as **separate headers**.

---

## Files Modified

### Backend (Node.js)

#### 1. `api/utils/hcl-client.js`

- **Added:** `this.trustedToken` property to store WCTrustedToken separately
- **Updated:** `request()` method signature to accept both `accessToken` and `trustedToken` parameters
- **Fixed:** Headers now send WCToken and WCTrustedToken as two separate, distinct headers
- **Updated:** Debug logging to show both tokens separately

**Key change:**

```javascript
// OLD - WRONG: Both headers got the same token
headers["WCToken"] = wcToken;
headers["WCTrustedToken"] = wcToken; // WRONG!

// NEW - CORRECT: Each header gets its own token
headers["WCToken"] = wcToken;
headers["WCTrustedToken"] = wcTrustedToken; // DIFFERENT token
```

#### 2. `api/utils/hcl-rest-auth.js`

- **Added:** Extract `WCTrustedToken` from login response
- **Updated:** Return both `wcToken` and `wcTrustedToken` in response
- **Added:** Return both as aliases: `accessToken`, `trustedToken`

**Key change:**

```javascript
const wcTrustedToken =
  responseBody.WCTrustedToken || responseBody.wcTrustedToken;

return {
  success: true,
  wcToken: wcToken,
  wcTrustedToken: wcTrustedToken, // NEW
  accessToken: wcToken,
  trustedToken: wcTrustedToken, // NEW - alias
  // ... other fields
};
```

#### 3. `api/controllers/hcl-auth-controller.js`

- **Updated:** Return `wcTrustedToken` and `trustedToken` in login response to frontend
- **Added:** Debug logging for trusted token

**Key change:**

```javascript
const responseData = {
  success: true,
  wcToken: authResult.wcToken,
  wcTrustedToken: authResult.wcTrustedToken, // NEW
  accessToken: authResult.wcToken,
  trustedToken: authResult.trustedToken, // NEW
  // ... other fields
};
```

#### 4. `api/controllers/hcl-cart-controller.js`

- **Updated:** Extract `trustedToken` from request body
- **Updated:** Log trusted token availability
- **Updated:** Pass `trustedToken` to `hclClient.addToCart()` call

**Key change:**

```javascript
const {
  partNumber,
  sku,
  quantity,
  accessToken: bodyAccessToken,
  trustedToken: bodyTrustedToken, // NEW
  userId,
  sessionCookies: bodySessionCookies,
} = req.body;

// ... later ...
const hclResponse = await hclClient.addToCart(
  accessToken,
  productId,
  quantity || 1,
  userId,
  trustedToken, // NEW - passed as separate parameter
);
```

### Frontend (Browser JavaScript)

#### 5. `scripts/hcl-commerce-auth.js`

- **Added:** `this.trustedToken` property to store WCTrustedToken separately
- **Added:** `getStoredTrustedToken()` method to retrieve from storage
- **Added:** `getTrustedToken()` method to get current trusted token
- **Updated:** `storeToken()` to persist trusted token to sessionStorage
- **Updated:** `login()` method to extract and store WCTrustedToken from response

**Key changes:**

```javascript
// In constructor
this.trustedToken = this.getStoredTrustedToken(); // NEW

// In storeToken()
const data = {
  token: this.token,
  trustedToken: this.trustedToken, // NEW
  userId: this.userId,
  // ... rest
};

// New methods
getStoredTrustedToken() { /* ... */ }
getTrustedToken() { /* ... */ }
```

#### 6. `scripts/hcl-commerce-api.js`

- **Updated:** `request()` method to include `trustedToken` in request body
- **Updated:** Call `hclAuthService.getTrustedToken()` to get the trusted token

**Key change:**

```javascript
if (body) {
  const requestBody = {
    ...body,
    accessToken: token,
    trustedToken: hclAuthService.getTrustedToken(), // NEW
  };
  // ... rest of request
}
```

---

## Request/Response Flow

### 1. Login Request

```
POST /api/hcl/login
Body: { username, password }
```

### 2. Login Response (from backend)

```json
{
  "success": true,
  "wcToken": "1007002%2Cp7Umebl4J86l3DjDyoPHcNMv%2B%2B...",
  "wcTrustedToken": "1007002%2C6kvF2aentAMDcv6lEpxbBWhbH0pgZPU1jls8KUfp4Sg%3D",
  "accessToken": "1007002%2Cp7Umebl4J86l3DjDyoPHcNMv%2B%2B...",
  "trustedToken": "1007002%2C6kvF2aentAMDcv6lEpxbBWhbH0pgZPU1jls8KUfp4Sg%3D",
  "userId": "1007002",
  "sessionCookies": {
    "JSESSIONID": "0000_6clRowjQN2MZJbIeoX5Xit:-1",
    "WC_PERSISTENT": "PfUA5ayMK%2F..."
  }
}
```

### 3. Frontend stores both tokens

- `WCToken` → sessionStorage as `token`
- `WCTrustedToken` → sessionStorage as `trustedToken`

### 4. Add to Cart Request

```
POST /api/hcl/cart/add
Body: {
  partNumber: "CLA022_220101",
  quantity: 1,
  accessToken: "1007002%2Cp7Umebl4J86l3DjDyoPHcNMv%2B%2B...",
  trustedToken: "1007002%2C6kvF2aentAMDcv6lEpxbBWhbH0pgZPU1jls8KUfp4Sg%3D",
  sessionCookies: { ... }
}
```

### 5. Backend sends to HCL Commerce

```
POST https://20.40.52.251/wcs/resources/store/715842834/cart
Headers:
  WCToken: 1007002%2Cp7Umebl4J86l3DjDyoPHcNMv%2B%2B...
  WCTrustedToken: 1007002%2C6kvF2aentAMDcv6lEpxbBWhbH0pgZPU1jls8KUfp4Sg%3D
  Cookie: JSESSIONID=...; WC_PERSISTENT=...
```

---

## Testing

### Expected Debug Logs

**Frontend:**

```
[HCL-AUTH] hasTrustedToken: true
[HCL-API] Including trusted token in request
[CART-API] trustedToken present: yes
```

**Backend:**

```
[CART-PROXY] Trusted token present: yes
[DEBUG] WCToken header: 1007002%2Cp7Umebl4J86l3DjDyoPHcNMv%2B%2B...
[DEBUG] TRUSTED TOKEN BEING SENT (SEPARATE HEADER)
[DEBUG] ║ WCTrustedToken: 1007002%2C6kvF2aentAMDcv6lEpxbBWhbH0pgZPU1jls8KUfp4Sg%3D
[DEBUG] ✓ Add to cart succeeded on attempt 1
```

### Expected HTTP Response

```json
{
  "success": true,
  "message": "Product added to cart",
  "cart": {
    "cartId": "...",
    "items": [{ "partNumber": "CLA022_220101", "quantity": 1, ... }],
    "total": 99.99
  }
}
```

---

## Summary of Changes

| Component               | Change                                         | Impact                                      |
| ----------------------- | ---------------------------------------------- | ------------------------------------------- |
| Backend Token Storage   | Added separate trustedToken property           | Can now store and send two different tokens |
| Backend Request Headers | Send WCToken and WCTrustedToken separately     | HCL Commerce will accept authentication     |
| Backend Response        | Include wcTrustedToken in login response       | Frontend receives both tokens               |
| Frontend Storage        | Store both tokens separately in sessionStorage | Can retrieve and use both tokens            |
| Frontend Request        | Include both tokens in cart requests           | Backend can pass both to HCL Commerce       |
| Cart Endpoint           | Accept trustedToken parameter                  | Pass to HCL Commerce API calls              |

---

## Files Changed Summary

- `api/utils/hcl-client.js` - Fixed header generation
- `api/utils/hcl-rest-auth.js` - Extract and return WCTrustedToken
- `api/controllers/hcl-auth-controller.js` - Return WCTrustedToken to frontend
- `api/controllers/hcl-cart-controller.js` - Accept and pass WCTrustedToken
- `scripts/hcl-commerce-auth.js` - Store and retrieve WCTrustedToken
- `scripts/hcl-commerce-api.js` - Include WCTrustedToken in requests
- `.eslintrc.cjs` - Fixed ESLint configuration
- `postinstall.js` - Fixed module system compatibility
