# Visual Guide: WCTrustedToken Fix

## The Token System

```
HCL Commerce API requires:

┌─────────────────────────────────────────────────────────┐
│           TWO SEPARATE TOKENS                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  WCToken                    WCTrustedToken             │
│  ════════════════════════   ════════════════════════   │
│  Main auth token            Trusted operations token    │
│  Length: ~300 chars         Length: ~50 chars          │
│  Value: 1007002%2C...       Value: 1007002%2CTqdJ...   │
│  Starts with user ID        Starts with user ID        │
│  URL-encoded                URL-encoded                │
│                                                         │
│  ⚠️  MUST BE DIFFERENT VALUES - NOT DUPLICATES!        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Request Headers

```
Original (Broken) Headers:
═══════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────┐
│  WCToken:           1007002%2CKTUTiEb%2F5BYFQ9m6ZI2... │
│  WCTrustedToken:    1007002%2CKTUTiEb%2F5BYFQ9m6ZI2... │
│  Cookie:            JSESSIONID=...; WC_PERSISTENT=...  │
└─────────────────────────────────────────────────────────┘
                        ⚠️ SAME VALUE!
                        HCL rejects
                        401 Error


Fixed Headers:
═══════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────┐
│  WCToken:           1007002%2CKTUTiEb%2F5BYFQ9m6ZI2... │
│  WCTrustedToken:    1007002%2CTqdJGUO0v1QZsqAwCgY... │
│  Cookie:            JSESSIONID=...; WC_PERSISTENT=...  │
└─────────────────────────────────────────────────────────┘
                        ✅ DIFFERENT VALUES!
                        HCL accepts
                        200 Success
```

## Full Request/Response Cycle

```
STEP 1: Login Request
════════════════════════════════════════════════════════════

Browser                         Backend                    HCL
  │                              │                         │
  │  POST /api/hcl/login        │                         │
  │  username: auroraadobetest  │                         │
  │  password: passw0rd         │                         │
  │────────────────────────────>│                         │
  │                              │  POST /loginidentity    │
  │                              │──────────────────────→  │
  │                              │                         │
  │                              │  Response:             │
  │                              │  WCToken: token1       │
  │                              │  WCTrustedToken: token2│
  │<──────────────────────────────────────────────────────│
  │


STEP 2: Backend Returns to Frontend
════════════════════════════════════════════════════════════

HCL Response                    Backend                    Frontend
WCToken: "1007002%2C..."       Extracts both
WCTrustedToken: "1007002%2CT"  Returns both
                                                           Receives both
                                                           Stores both
                                                           In sessionStorage:
                                                           {
                                                             token: "...",
                                                             trustedToken: "...",
                                                             sessionCookies: {}
                                                           }


STEP 3: Cart Add Request
════════════════════════════════════════════════════════════

Frontend (sessionStorage)        Backend                    HCL
token: "1007002%2C..."
trustedToken: "1007002%2CT"
                │
                │  POST /api/hcl/cart/add
                │  accessToken: token
                │  trustedToken: trustedToken
                │  sessionCookies: {}
                ├────────────────────────>│
                │                          │  Sets Headers:
                │                          │  WCToken: "1007002%2C..."
                │                          │  WCTrustedToken: "1007002%2CT"
                │                          │  Cookie: ...
                │                          ├─────────────────────────>│
                │                          │                          │
                │                          │                    Validates both
                │                          │                    Adds to cart
                │                          │<─────────────────────────┤
                │                          │  {orderId: "...", items:[]}
                │<──────────────────────┤
                │  200 OK
                │  Product added
```

## Code Flow Diagram

```
User Action: Login
║
╚═══════════════════════════════════════════════════════════════════════╗
    │                                                                   │
    ▼                                                                   ▼
Browser                                              Backend Server
hcl-commerce-auth.js                                hcl-auth-controller.js
    │                                                    │
    │  fetch('/api/hcl/login',                         │
    │    {username, password})                         │
    │──────────────────────────────────────────────>  │
    │                                                    │
    │                                          hcl-rest-auth.js
    │                                               │
    │                                               ├─ HCL REST API
    │                                               │  POST /loginidentity
    │                                               │  Returns:
    │                                               │  {
    │                                               │    WCToken: "token1",
    │                                               │    WCTrustedToken: "token2"  ← Extract
    │                                               │  }
    │                                               │
    │                              authResult =    │
    │                              {               │
    │                                wcToken: "token1"
    │                                wcTrustedToken: "token2"  ← Pass to controller
    │                              }
    │                                               │
    │                          responseData =      │
    │                          {                   │
    │                            wcToken: "token1"
    │                            wcTrustedToken: "token2"  ← Return to frontend
    │                            accessToken: "token1"
    │                            trustedToken: "token2"
    │                          }
    │                                               │
    │  Response: {wcToken, wcTrustedToken, ...}   │
    │<──────────────────────────────────────────────┤
    │
    ├─ Extract from response:
    │  this.token = data.wcToken
    │  this.trustedToken = data.wcTrustedToken  ← Store
    │
    ├─ Store in sessionStorage:
    │  {
    │    token: "token1",
    │    trustedToken: "token2"  ← Persist
    │  }
    │
    └─ Success! Ready for cart operations



User Action: Add to Cart
║
╚═══════════════════════════════════════════════════════════════════════╗
    │                                                                   │
    ▼                                                                   ▼
Browser                                              Backend Server
hcl-commerce-api.js                                hcl-cart-controller.js
    │                                                    │
    ├─ Get tokens:
    │  token = hclAuthService.getToken()
    │  trustedToken = hclAuthService.getTrustedToken()  ← Retrieve
    │
    │  fetch('/api/hcl/cart/add', {
    │    partNumber: "...",
    │    quantity: 1,
    │    accessToken: token,
    │    trustedToken: trustedToken,  ← Include both
    │    sessionCookies: {}
    │  })
    │──────────────────────────────────────────────>  │
    │                                                    │
    │                                          Extract from body:
    │                                          accessToken = token1
    │                                          trustedToken = token2  ← Get from request
    │                                               │
    │                                          hcl-client.js
    │                                               │
    │                                          Set headers:
    │                                          WCToken: "token1"
    │                                          WCTrustedToken: "token2"  ← Different!
    │                                          Cookie: ...
    │                                               │
    │                                          POST https://HCL/cart
    │                                          with both headers
    │                                               │
    │                                          HCL validates:
    │                                          ✓ WCToken valid
    │                                          ✓ WCTrustedToken valid
    │                                          ✓ Both values different
    │                                          ✓ Add product
    │                                               │
    │  200 OK                                      │
    │  {success, cart}                             │
    │<──────────────────────────────────────────────┤
    │
    ├─ Update mini-cart
    └─ Success!
```

## Token Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                      TOKEN JOURNEY                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  START: HCL Commerce                                           │
│  ════════════════════════════════════════════════════════════  │
│  Returns 2 tokens on login:                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ WCToken:         "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."  │  │
│  │ WCTrustedToken:  "1007002%2CTqdJGUO0v1QZsqAwCgY..."    │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                           │                         │
│          ▼                           ▼                         │
│  Backend hcl-rest-auth.js          (BOTH EXTRACTED)          │
│  ════════════════════════════════════════════════════════════  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wcToken:         "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."  │  │
│  │ wcTrustedToken:  "1007002%2CTqdJGUO0v1QZsqAwCgY..."    │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                           │                         │
│          ▼                           ▼                         │
│  Backend auth-controller            (BOTH RETURNED)           │
│  ════════════════════════════════════════════════════════════  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ wcToken:         "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."  │  │
│  │ wcTrustedToken:  "1007002%2CTqdJGUO0v1QZsqAwCgY..."    │  │
│  │ accessToken:     "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."  │  │
│  │ trustedToken:    "1007002%2CTqdJGUO0v1QZsqAwCgY..."    │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                           │                         │
│          ▼                           ▼                         │
│  Frontend hcl-commerce-auth.js      (BOTH STORED)             │
│  ════════════════════════════════════════════════════════════  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ sessionStorage.hcl_auth:                               │   │
│  │ {                                                      │   │
│  │   token:        "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."  │   │
│  │   trustedToken: "1007002%2CTqdJGUO0v1QZsqAwCgY..."    │   │
│  │   userId:       "1007002"                             │   │
│  │   expiry:       1775702530889                         │   │
│  │ }                                                      │   │
│  └────────────────────────────────────────────────────────┘   │
│          │                           │                         │
│          ▼                           ▼                         │
│  Frontend hcl-commerce-api.js       (BOTH SENT)              │
│  ════════════════════════════════════════════════════════════  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /api/hcl/cart/add:                                │  │
│  │ {                                                      │  │
│  │   partNumber: "CLA022_220101",                        │  │
│  │   quantity: 1,                                        │  │
│  │   accessToken:   "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..." │  │
│  │   trustedToken:  "1007002%2CTqdJGUO0v1QZsqAwCgY..."   │  │
│  │   sessionCookies: {...}                               │  │
│  │ }                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                           │                         │
│          ▼                           ▼                         │
│  Backend hcl-cart-controller.js     (BOTH EXTRACTED)          │
│  ════════════════════════════════════════════════════════════  │
│  accessToken = "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."          │
│  trustedToken = "1007002%2CTqdJGUO0v1QZsqAwCgY..."           │
│          │                           │                         │
│          ▼                           ▼                         │
│  Backend hcl-client.js              (BOTH SET AS HEADERS)     │
│  ════════════════════════════════════════════════════════════  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ WCToken:         "1007002%2CKTUTiEb%2F5BYFQ9m6ZI2..."  │  │
│  │ WCTrustedToken:  "1007002%2CTqdJGUO0v1QZsqAwCgY..."    │  │
│  │ Cookie:          JSESSIONID=...; WC_PERSISTENT=...     │  │
│  └──────────────────────────────────────────────────────────┘  │
│          │                           │                         │
│          ▼                           ▼                         │
│  HCL Commerce                       (BOTH VALIDATED)          │
│  ════════════════════════════════════════════════════════════  │
│  ✅ WCToken is valid                                          │
│  ✅ WCTrustedToken is valid                                  │
│  ✅ Both are DIFFERENT values (not duplicates)               │
│  ✅ Add product to cart                                      │
│  ✅ Return 200 OK                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Before vs After

```
BEFORE (Broken):                    AFTER (Fixed):
═════════════════════════════════   ═════════════════════════════════

HCL Response                        HCL Response
┌────────────────────────────┐      ┌────────────────────────────┐
│ WCToken: token1            │      │ WCToken: token1            │
│ WCTrustedToken: token2     │      │ WCTrustedToken: token2     │
└────────────────────────────┘      └────────────────────────────┘
        ▼                                   ▼
Backend Returns                     Backend Returns
┌────────────────────────────┐      ┌────────────────────────────┐
│ wcToken: token1            │      │ wcToken: token1            │
│ wcTrustedToken: ??? MISSING│      │ wcTrustedToken: token2  ✅ │
└────────────────────────────┘      └────────────────────────────┘
        ▼                                   ▼
Frontend Stores                     Frontend Stores
┌────────────────────────────┐      ┌────────────────────────────┐
│ token: token1              │      │ token: token1              │
│ trustedToken: undefined ❌ │      │ trustedToken: token2    ✅ │
└────────────────────────────┘      └────────────────────────────┘
        ▼                                   ▼
Frontend Sends                      Frontend Sends
┌────────────────────────────┐      ┌────────────────────────────┐
│ accessToken: token1        │      │ accessToken: token1        │
│ trustedToken: ??? MISSING  │      │ trustedToken: token2    ✅ │
└────────────────────────────┘      └────────────────────────────┘
        ▼                                   ▼
HCL Gets Headers                    HCL Gets Headers
┌────────────────────────────┐      ┌────────────────────────────┐
│ WCToken: token1            │      │ WCToken: token1            │
│ WCTrustedToken: token1 ❌  │      │ WCTrustedToken: token2  ✅ │
└────────────────────────────┘      └────────────────────────────┘
        ▼                                   ▼
        ❌ 401 Error                       ✅ 200 Success
```

## Summary Diagram

```
                    THE FIX IN ONE IMAGE
═══════════════════════════════════════════════════════════════════

    HCL Response with 2 tokens
              │
              ▼
    Backend EXTRACTS both
              │
              ├─ WCToken: token1
              └─ WCTrustedToken: token2
              │
              ▼
    Backend RETURNS both to frontend
              │
              ├─ wcToken: token1
              └─ wcTrustedToken: token2
              │
              ▼
    Frontend STORES both in sessionStorage
              │
              ├─ token: token1
              └─ trustedToken: token2
              │
              ▼
    Frontend SENDS both with cart requests
              │
              ├─ accessToken: token1
              └─ trustedToken: token2
              │
              ▼
    Backend SETS as separate headers
              │
              ├─ WCToken header: token1
              └─ WCTrustedToken header: token2 (DIFFERENT!)
              │
              ▼
    HCL Commerce VALIDATES both tokens
              │
              ▼
         ✅ 200 Success
         Product added to cart
```
