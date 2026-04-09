# Visual Diagrams - Token Authentication Fix

## Diagram 1: Authentication Token Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      HCL LOGIN ENDPOINT                         │
│                  POST /loginidentity                            │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                   Response includes:
              ┌─────────────────────────┐
              │ - WCToken (main auth)   │
              │ - WCTrustedToken        │
              │ - Session Cookies       │
              │ - User ID               │
              └─────────────────────────┘
                            ↓
         Stored in sessionStorage.hcl_auth
              ┌─────────────────────────┐
              │ {                       │
              │   token: "1007002%2C.." │
              │   trustedToken: "1007.."│
              │   sessionCookies: {...} │
              │   userId: "1007002"     │
              │ }                       │
              └─────────────────────────┘
                            ↓
              ┌───────────────────────────────────────┐
              │   Mini-Cart on Page Load              │
              │                                       │
              │ 1. getAccessToken()                  │
              │    ↓                                  │
              │    Returns: "1007002%2C..."          │
              │                                       │
              │ 2. getTrustedToken() ← NEW FUNCTION   │
              │    ↓                                  │
              │    Returns: "1007002%2C..."          │
              │                                       │
              │ 3. fetchCartFromHCL(token, trusted)  │
              │    ↓                                  │
              │    Sends both in query params        │
              └───────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Frontend to Backend Request             │
        │  GET /api/hcl/cart?                      │
        │    accessToken=1007002%2C...&            │
        │    trustedToken=1007002%2C...            │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Backend Processing                      │
        │                                          │
        │  1. Extract accessToken from query  ✓   │
        │  2. Extract trustedToken from query ✓   │
        │  3. Validate both present          ✓   │
        │  4. hclClient.getCart(              │
        │       accessToken,                 │
        │       trustedToken  ← ADDED        │
        │     )                              │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Request to HCL Commerce                 │
        │  GET /cart/@self                         │
        │                                          │
        │  Headers:                                │
        │  - WCToken: 1007002%2C...                │
        │  - WCTrustedToken: 1007002%2C...         │
        │  - Cookie: JSESSIONID=...;               │
        │            WC_PERSISTENT=...             │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  HCL Commerce Validation                 │
        │                                          │
        │  ✓ WCToken valid?                       │
        │  ✓ WCTrustedToken valid?                │
        │  ✓ Tokens match session?                │
        │  ✓ User authenticated?                  │
        │                                          │
        │  All valid → Return cart data            │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Response to Backend                     │
        │                                          │
        │ HTTP 200 OK                              │
        │ {                                        │
        │   "orderId": "764613",                   │
        │   "orderItem": [                         │
        │     {                                    │
        │       "partNumber": "CLA022_220101",    │
        │       "quantity": "5.0",                │
        │       "unitPrice": "400.00000",         │
        │       ...                               │
        │     },                                   │
        │     ... 7 more items ...                │
        │   ],                                     │
        │   "totalProductPrice": "4362.98000"     │
        │ }                                        │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Backend Normalization                   │
        │  normalizeHCLCart()                      │
        │                                          │
        │  Converts:                               │
        │  {orderItem: [...], totalProductPrice:.} │
        │    ↓                                     │
        │  {items: [...], total: 4362.98}         │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Response to Frontend                    │
        │                                          │
        │ HTTP 200 OK                              │
        │ {                                        │
        │   "success": true,                       │
        │   "cart": {                              │
        │     "cartId": "764613",                  │
        │     "items": [                           │
        │       {partNumber, quantity, price},     │
        │       ... 7 more ...                     │
        │     ],                                   │
        │     "total": 4362.98                     │
        │   }                                      │
        │ }                                        │
        └──────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────────┐
        │  Mini-Cart Display Update                │
        │                                          │
        │  updateDisplay() called with:            │
        │  - items: 8 items                        │
        │  - count: 8                              │
        │  - total: $4,362.98                      │
        │                                          │
        │  Result:                                 │
        │  ┌────────────────────────────┐          │
        │  │ 🛒 8                       │          │
        │  │ Items in Cart              │          │
        │  ├────────────────────────────┤          │
        │  │ • Budget Laptop    Qty: 5  │          │
        │  │ • Furniture Item   Qty: 5  │          │
        │  │ • ... (show max 3)         │          │
        │  ├────────────────────────────┤          │
        │  │ Total: $4,362.98           │          │
        │  │ [View Cart] [Checkout]     │          │
        │  └────────────────────────────┘          │
        └──────────────────────────────────────────┘
```

---

## Diagram 2: What Changed - Before vs After

```
BEFORE (BROKEN):
┌────────────────────────────────────────────────────────┐
│ Frontend                                               │
├────────────────────────────────────────────────────────┤
│ const token = getAccessToken()                         │
│ fetchCartFromHCL(token)  ← ONLY 1 TOKEN               │
│     ↓                                                  │
│ GET /api/hcl/cart?accessToken=...                     │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ Backend Controller                                     │
├────────────────────────────────────────────────────────┤
│ let accessToken = req.query.accessToken              │
│ // NO trustedToken extraction                         │
│ await hclClient.getCart(accessToken)  ← MISSING 2ND   │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ HCL Client                                             │
├────────────────────────────────────────────────────────┤
│ async getCart(accessToken) {  ← MISSING PARAMETER     │
│   request("GET", ..., null, accessToken)              │
│   // WCTrustedToken header NOT sent                   │
│ }                                                      │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ HCL Commerce API                                       │
├────────────────────────────────────────────────────────┤
│ Headers received:                                      │
│ ✓ WCToken present                                      │
│ ✗ WCTrustedToken MISSING                              │
│ ✓ Cookie present                                       │
│                                                        │
│ Validation: FAIL!                                      │
│ Response: HTTP 401                                     │
│ Error: "ERR_SECURE_TOKEN_NOT_IN_HTTPS"               │
└────────────────────────────────────────────────────────┘


AFTER (FIXED):
┌────────────────────────────────────────────────────────┐
│ Frontend                                               │
├────────────────────────────────────────────────────────┤
│ const token = getAccessToken()                         │
│ const trustedToken = getTrustedToken()  ← NEW         │
│ fetchCartFromHCL(token, trustedToken)   ← BOTH        │
│     ↓                                                  │
│ GET /api/hcl/cart?accessToken=...&trustedToken=...   │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ Backend Controller                                     │
├────────────────────────────────────────────────────────┤
│ let accessToken = req.query.accessToken              │
│ let trustedToken = req.query.trustedToken  ← NEW     │
│ if (!trustedToken) return 401  ← NEW VALIDATION      │
│ await hclClient.getCart(accessToken, trustedToken)   │
│                                              ↑         │
│                                            BOTH        │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ HCL Client                                             │
├────────────────────────────────────────────────────────┤
│ async getCart(accessToken, trustedToken) {  ← ADDED   │
│   request("GET", ..., null, accessToken, trustedToken)│
│   // Both WCToken and WCTrustedToken headers sent     │
│ }                                                      │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ HCL Commerce API                                       │
├────────────────────────────────────────────────────────┤
│ Headers received:                                      │
│ ✓ WCToken present                                      │
│ ✓ WCTrustedToken present  ← NOW INCLUDED             │
│ ✓ Cookie present                                       │
│                                                        │
│ Validation: SUCCESS!                                   │
│ Response: HTTP 200 OK                                  │
│ Data: {orderItem: [...], totalProductPrice: "..."}    │
└────────────────────────────────────────────────────────┘
```

---

## Diagram 3: Token Flow Through Layers

```
                    ┌─────────────────────┐
                    │  LOGIN RESPONSE     │
                    ├─────────────────────┤
                    │ WCToken: "1007.." │
                    │ WCTrustedToken: "10" │
                    │ sessionCookies      │
                    └─────────────────────┘
                            ↓
                ┌───────────────────────────┐
                │  Store in Storage         │
                ├───────────────────────────┤
                │ sessionStorage.hcl_auth:  │
                │ {                         │
                │   token: "1007..",        │
                │   trustedToken: "10..",   │
                │   sessionCookies: {...}   │
                │ }                         │
                └───────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────┐
    │      MINI-CART INITIALIZATION             │
    ├───────────────────────────────────────────┤
    │                                           │
    │  getAccessToken() ───┐                   │
    │    Check hcl_auth  ├──→ Returns: "1007.."│
    │                   │                     │
    │  getTrustedToken()─┘  ← NEW FUNCTION    │
    │    Check hcl_auth  ──→ Returns: "10.."  │
    │                                           │
    └───────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────┐
        │  Check if Both Present        │
        ├───────────────────────────────┤
        │ if (token && trustedToken) ✓  │
        │   syncCartFromHCL()           │
        │ else                          │
        │   skip (log error)            │
        └───────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────┐
    │  Frontend → Backend Request              │
    ├──────────────────────────────────────────┤
    │                                          │
    │  fetch(`/api/hcl/cart?                  │
    │    accessToken=${token}&                │
    │    trustedToken=${trustedToken}`)        │
    │                                          │
    │  Both parameters now included ✓          │
    └──────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────┐
    │  Backend Receives Request                │
    ├──────────────────────────────────────────┤
    │                                          │
    │  Extract from Query Params:              │
    │  - req.query.accessToken                │
    │  - req.query.trustedToken ← NEW         │
    │                                          │
    │  Validate:                               │
    │  - if (!accessToken) return 401          │
    │  - if (!trustedToken) return 401 ← NEW  │
    │                                          │
    │  Pass to HCL:                            │
    │  hclClient.getCart(                      │
    │    accessToken,                          │
    │    trustedToken  ← NOW INCLUDED         │
    │  )                                       │
    └──────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────┐
    │  HCL Client Request Method               │
    ├──────────────────────────────────────────┤
    │                                          │
    │  async getCart(                          │
    │    accessToken,                          │
    │    trustedToken  ← NOW ACCEPTED          │
    │  ) {                                     │
    │    request(                              │
    │      "GET",                              │
    │      endpoint,                           │
    │      null,                               │
    │      accessToken,                        │
    │      trustedToken  ← NOW PASSED          │
    │    )                                     │
    │  }                                       │
    └──────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────┐
    │  HTTP Headers Sent to HCL                │
    ├──────────────────────────────────────────┤
    │                                          │
    │  WCToken: 1007002%2Cg%2B7MAaU...        │
    │  WCTrustedToken: 1007002%2Ch6...        │
    │  Cookie: JSESSIONID=...;WC_PERSIST...   │
    │                                          │
    │  All three now included ✓                │
    └──────────────────────────────────────────┘
                            ↓
    ┌──────────────────────────────────────────┐
    │  HCL Commerce Validation                 │
    ├──────────────────────────────────────────┤
    │                                          │
    │  Check WCToken: ✓ Valid                 │
    │  Check WCTrustedToken: ✓ Valid          │
    │  Check Cookie: ✓ Valid                  │
    │  Check all match: ✓ Yes                 │
    │                                          │
    │  Result: AUTHENTICATED & AUTHORIZED      │
    │  Response: HTTP 200 OK with cart data    │
    └──────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────┐
        │  Cart Displays Successfully   │
        ├───────────────────────────────┤
        │                               │
        │  🛒 8                         │
        │  Items in Cart                │
        │                               │
        │  • Budget Laptop  Qty: 5      │
        │  • Furniture Item Qty: 5      │
        │  • ... (+ 6 more)             │
        │                               │
        │  Total: $4,362.98             │
        └───────────────────────────────┘
```

---

## Diagram 4: Error Scenarios

```
SCENARIO 1: Missing trustedToken in Storage
┌──────────────────────┐
│ getAccessToken(): OK │
│ getTrustedToken():   │
│   → null/undefined   │ ← MISSING!
└──────────────────────┘
         ↓
┌──────────────────────────────────┐
│ if (token && trustedToken)       │
│   // FALSE - skip fetch          │
│ else                             │
│   // Log: "Missing tokens"       │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│ Result: No network request       │
│ Cart: Empty (in-memory state)    │
│ Fix: Check login stored both     │
└──────────────────────────────────┘

SCENARIO 2: Backend Doesn't Receive trustedToken
┌──────────────────────────────────┐
│ Frontend sends:                  │
│ /api/hcl/cart?accessToken=...   │
│                                  │
│ Missing: &trustedToken=... ← BUG │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│ Backend:                         │
│ let trustedToken = ...           │
│   → null/undefined               │
│                                  │
│ Validation:                      │
│ if (!trustedToken)               │
│   return 401                     │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│ Response: HTTP 401               │
│ Error: "Missing trustedToken"    │
│ Frontend shows: Network error    │
│ Fix: Add &trustedToken=... param │
└──────────────────────────────────┘

SCENARIO 3: HCL Client Doesn't Receive trustedToken
┌──────────────────────────────────┐
│ Backend calls:                   │
│ hclClient.getCart(               │
│   accessToken,                   │
│   undefined  ← MISSING!          │
│ )                                │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│ HCL Client request() call:       │
│ request(                         │
│   "GET",                         │
│   endpoint,                      │
│   null,                          │
│   accessToken,    ✓              │
│   undefined       ✗              │
│ )                                │
│                                  │
│ Header sent:                     │
│ - WCToken: ...    ✓              │
│ - WCTrustedToken: (empty) ✗      │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│ HCL Commerce:                    │
│ Missing WCTrustedToken!          │
│                                  │
│ Response: HTTP 401               │
│ Error: "ERR_SECURE_TOKEN_NOT_    │
│         IN_HTTPS"                │
│                                  │
│ Fix: Pass trustedToken param     │
└──────────────────────────────────┘
```

---

## Diagram 5: Complete Fix Coverage

```
┌─────────────────────────────────────────────────────────────┐
│                 AUTHENTICATION FIX MATRIX                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 1: HCL Client                                        │
│  ├─ Method signature: getCart(accessToken, trustedToken) ✓ │
│  └─ Both parameters passed to request()                  ✓ │
│                                                             │
│  Layer 2: Backend Controller                               │
│  ├─ Extract accessToken from query              ✓          │
│  ├─ Extract trustedToken from query             ✓ NEW      │
│  ├─ Validate accessToken present                ✓          │
│  ├─ Validate trustedToken present               ✓ NEW      │
│  └─ Pass both to hclClient.getCart()            ✓          │
│                                                             │
│  Layer 3: State Management                                 │
│  ├─ Accept trustedToken parameter               ✓ NEW      │
│  ├─ Include trustedToken in fetch URL           ✓ NEW      │
│  └─ Pass to mini-cart component                 ✓          │
│                                                             │
│  Layer 4: UI Component (Mini-Cart)                         │
│  ├─ Retrieve accessToken                        ✓          │
│  ├─ Retrieve trustedToken (NEW)                 ✓ NEW      │
│  ├─ Validate both present before fetch          ✓ NEW      │
│  ├─ Pass both to fetchCartFromHCL()             ✓ NEW      │
│  └─ Enhanced logging for debugging              ✓ NEW      │
│                                                             │
│  Documentation                                             │
│  ├─ TRUSTED-TOKEN-FIX.md (Technical)            ✓ NEW      │
│  ├─ 401-ERROR-QUICK-FIX.md (Quick ref)          ✓ NEW      │
│  ├─ CODE-CHANGES-SUMMARY.md (Diffs)             ✓ NEW      │
│  ├─ TESTING-PLAN.md (Test procedures)           ✓ NEW      │
│  └─ VISUAL DIAGRAMS (This document)             ✓ NEW      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Visual diagrams created**: 2026-04-09  
**Status**: ✅ Complete - Ready for testing
