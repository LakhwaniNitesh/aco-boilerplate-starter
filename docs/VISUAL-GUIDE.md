# Cart Display Flow - Visual Guide

## Complete End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER VISITS WEBSITE                              │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER CLICKS "LOGIN"                                  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │  commerce-login.js Block Renders Login Form              │           │
│  │  - Username field                                        │           │
│  │  - Password field                                        │           │
│  │  - Submit button                                         │           │
│  └──────────────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    USER SUBMITS LOGIN FORM                               │
│                                                                           │
│  commerce-login.js calls:                                               │
│  POST /api/hcl/login with {username, password}                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  BACKEND: hcl-auth-controller.js                         │
│                                                                           │
│  1. Calls HCL Commerce login API                                        │
│  2. Receives: {wcToken: "...", wcTrustedToken: "...", ...}             │
│  3. Extracts tokens using hcl-rest-auth.js                             │
│  4. Returns to frontend:                                                │
│     {                                                                   │
│       token: "1007002%2C7KRQkAz5zsMeylITj%2B...",                       │
│       trustedToken: "1007002%2CZH6dm4Lu5ImLok%2BrZA...",               │
│       userId: "1007002",                                                │
│       sessionCookies: {JSESSIONID: "...", WC_PERSISTENT: "..."},       │
│       expiresIn: 3600                                                   │
│     }                                                                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            FRONTEND: hclAuthAdapter.js (Fetch Interceptor)              │
│                                                                           │
│  Intercepts login response and stores to sessionStorage:                │
│                                                                           │
│  sessionStorage.hcl_auth = {                                            │
│    token: "1007002%2C7KRQkAz5zsMeylITj%2B...",                          │
│    trustedToken: "1007002%2CZH6dm4Lu5ImLok%2BrZA...",                  │
│    userId: "1007002",                                                   │
│    expiresIn: 3600,                                                     │
│    expiry: 1775707360929,  ← Date.now() + 3600*1000                    │
│    storedAt: 1775707360929,                                             │
│    sessionCookies: {...}                                                │
│  }                                                                      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   USER SEES MINI-CART INITIALIZED                        │
│                                                                           │
│  commerce-mini-cart.js runs:                                            │
│                                                                           │
│  ┌─ getAccessToken() ◄─── sessionStorage.hcl_auth ───────┐             │
│  │  Reads: token = "1007002%2C7KRQkAz5zsMeylITj%2B..."   │             │
│  └─ syncCartFromHCL(token) ────────────────────────────────┘             │
│     │                                                                    │
│     └─► fetchCartFromHCL(token)                                        │
│         GET /api/hcl/cart?accessToken=...                              │
│         │                                                               │
│         ▼                                                               │
│     Backend: hcl-cart-controller.js                                    │
│         GET from HCL Commerce cart API                                 │
│         Returns: {cart: {items: [], total: 0}}  (empty initially)     │
│         │                                                               │
│         ▼                                                               │
│     updateCartState(cart)                                              │
│         Stores in simple-cart-state.js                                 │
│         Notifies listeners                                             │
│         │                                                               │
│         ▼                                                               │
│     mini-cart updateDisplay()                                          │
│         Renders: 0 items, empty state shown                            │
│                                                                           │
│  ✅ MINI-CART READY (empty but listening)                              │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  USER NAVIGATES TO PRODUCT PAGE                          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────┐               │
│  │  product-details.js Block Renders                  │               │
│  │  - Product image/description                       │               │
│  │  - Price: $29.99                                   │               │
│  │  - Quantity selector                               │               │
│  │  - "Add to Cart" button ◄─ READY TO CLICK          │               │
│  └─────────────────────────────────────────────────────┘               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              USER CLICKS "ADD TO CART" BUTTON                            │
│                                                                           │
│  product-details.js handleAddToCart():                                  │
│                                                                           │
│  ┌─ getAccessToken() ◄─── sessionStorage.hcl_auth ───────┐             │
│  │  Reads: token = "1007002%2C7KRQkAz5zsMeylITj%2B..."   │             │
│  └─────────────────────────────────────────────────────────┘             │
│                                                                           │
│  ┌─ hclAuthService.getTrustedToken() ◄─── sessionStorage ──┐           │
│  │  Checks: !isTokenExpired() ✓ (expiry in future)        │           │
│  │  Reads: trustedToken = "1007002%2CZH6dm4Lu5..."        │           │
│  └────────────────────────────────────────────────────────┘             │
│                                                                           │
│  ┌─ POST /api/hcl/cart/add                                            │
│  │  {                                                                   │
│  │    partNumber: "Budget_Laptop",                                    │
│  │    quantity: 1,                                                     │
│  │    accessToken: "1007002%2C7KRQkAz5zsMeylITj%2B...",              │
│  │    trustedToken: "1007002%2CZH6dm4Lu5ImLok%2BrZA...",              │
│  │    sessionCookies: {...}                                           │
│  │  }                                                                   │
│  └─────────────┬──────────────────────────────────────────────────     │
│                │                                                        │
└────────────────┼────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            BACKEND: hcl-cart-controller.js (Add to Cart)                │
│                                                                           │
│  1. Receive request with {partNumber, quantity, tokens}                │
│  2. Create hcl-client with tokens:                                     │
│     hclClient.wcToken = accessToken                                    │
│     hclClient.wcTrustedToken = trustedToken                            │
│  3. Call hclClient.addToCart(...)                                      │
│  4. HCL Commerce API returns:                                          │
│     {                                                                   │
│       items: [                                                          │
│         {partNumber: "Budget_Laptop", quantity: 1, price: 29.99}      │
│       ],                                                                │
│       total: 29.99,                                                    │
│       ...                                                               │
│     }                                                                   │
│  5. Normalize response: normalizeHCLCart()                             │
│  6. Return to frontend:                                                │
│     {                                                                   │
│       success: true,                                                   │
│       message: "Product added to cart",                                │
│       cart: {                                                           │
│         items: [{name: "Budget Laptop", price: 29.99, qty: 1}],      │
│         total: 29.99                                                   │
│       }                                                                 │
│     }                                                                   │
└────────────────┬──────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              FRONTEND: product-details.js (Response Handler)             │
│                                                                           │
│  1. Receive response: {success: true, cart: {...}}                     │
│  2. Show success alert: "Product added to cart!" ✅                    │
│  3. Call updateCartState(result.cart) with:                           │
│     {                                                                   │
│       items: [{name: "Budget Laptop", price: 29.99, quantity: 1}],   │
│       total: 29.99                                                     │
│     }                                                                   │
│  4. This triggers simple-cart-state.js                                │
└────────────────┬──────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           CENTRAL: simple-cart-state.js (Update State)                   │
│                                                                           │
│  updateCartState(newCart) called with:                                 │
│  {items: [{name: "Budget Laptop", ...}], total: 29.99}                │
│                                                                           │
│  1. Update in-memory state:                                            │
│     cartState = newCart                                                │
│                                                                           │
│  2. Loop through all listeners and call them:                          │
│     listeners = Set [                                                   │
│       commerce-mini-cart's updateDisplay function,                     │
│       cart page's renderCartPage function,                             │
│       ... other subscribers                                             │
│     ]                                                                   │
│                                                                           │
│  3. For each listener, call:                                           │
│     listener(cartState) ← Pass updated state                           │
└────────────────┬──────────────────────────────────────────────────────┘
                 │
        ┌────────┴────────────────────────────────────────┐
        │                                                  │
        ▼                                                  ▼
┌──────────────────────────────────────┐    ┌─────────────────────────────┐
│  LISTENER 1: Mini-Cart updateDisplay │    │  LISTENER 2: Cart Page      │
│                                      │    │  renderCartPage()           │
│  Receives: {items: [{...}], ...}    │    │                             │
│                                      │    │  (Only runs if user on      │
│  Updates UI:                         │    │   /cart page)               │
│  ┌─────────────────────────────────┐│    │                             │
│  │ Badge: "1" ← Show count         ││    │  Updates page with:         │
│  │                                 ││    │  - Product list             │
│  │ Drawer Items:                   ││    │  - Prices                   │
│  │  Budget Laptop × 1  $29.99      ││    │  - Checkout button          │
│  │                                 ││    │                             │
│  │ Total: $29.99                   ││    │                             │
│  │                                 ││    │                             │
│  │ [View Cart] [Clear Cart]        ││    │                             │
│  └─────────────────────────────────┘│    │                             │
│                                      │    └─────────────────────────────┘
│  ✅ MINI-CART DISPLAYS ITEM          │
└──────────────────────────────────────┘

                        USER SEES:
┌─────────────────────────────────────────────────────────────────────────┐
│                          HEADER MINI-CART                                │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │                     🛒 1                                   │           │
│  │                   (Badge shows count)                    │           │
│  └──────────────┬───────────────────────────────────────────┘           │
│                │ (Click to expand)                                      │
│                ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │  CART DRAWER                                             │           │
│  │  ─────────────────────────────────────────────────────── │           │
│  │  Cart                                                    │           │
│  │                                                          │           │
│  │  Budget Laptop         × 1              $29.99           │           │
│  │                                                          │           │
│  │  ─────────────────────────────────────────────────────── │           │
│  │  Total:                                    $29.99        │           │
│  │  ─────────────────────────────────────────────────────── │           │
│  │  [View Cart]           [Clear Cart]                      │           │
│  └──────────────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────────────┘

                USER CLICKS "VIEW CART"
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CART PAGE (/cart)                                    │
│                                                                           │
│  cart.js initializes:                                                   │
│  1. Calls fetchCartFromHCL(token)                                      │
│  2. Updates cart page with items:                                      │
│                                                                           │
│  ┌────────────────────────────────────────────────────────┐            │
│  │  SHOPPING CART                                         │            │
│  │  ────────────────────────────────────────────────────  │            │
│  │                                                        │            │
│  │  Budget Laptop                    Qty: 1    $29.99    │            │
│  │  [Remove]                                              │            │
│  │                                                        │            │
│  │  ────────────────────────────────────────────────────  │            │
│  │                                                        │            │
│  │  Subtotal:                                  $29.99    │            │
│  │  Tax:                                        $0.00    │            │
│  │  Total:                                     $29.99    │            │
│  │                                                        │            │
│  │  [Continue Shopping]    [Proceed to Checkout]         │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                           │
│  ✅ CART PAGE DISPLAYS ITEMS                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

## Token Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────┐
│           LOGIN RESPONSE FROM HCL                        │
│                                                          │
│  {                                                       │
│    wcToken: "1007002%2C7KRQkAz5zsMeylITj%2B...",       │
│    wcTrustedToken: "1007002%2CZH6dm4Lu5ImLok%2B...",   │
│    expiresIn: 3600                                      │
│  }                                                       │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│        hclAuthAdapter.js PROCESSES RESPONSE              │
│                                                          │
│  expiresIn = 3600                                       │
│  expiry = Date.now() + (3600 * 1000)                    │
│        = 1775700000000 + 3600000                        │
│        = 1775703600000                                  │
│                                                          │
│  Creates hcl_auth object:                               │
│  {                                                       │
│    token: "1007002%2C7KRQkAz5zsMeylITj%2B...",         │
│    trustedToken: "1007002%2CZH6dm4Lu5ImLok%2B...",     │
│    expiresIn: 3600,                                     │
│    expiry: 1775703600000,  ← ABSOLUTE timestamp         │
│    storedAt: 1775700000000                              │
│  }                                                       │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│    sessionStorage.setItem('hcl_auth', JSON.stringify)   │
│                                                          │
│  Session Storage Now Contains:                          │
│  hcl_auth → {"token":"...", "expiry":1775703600000}    │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼ (User navigates to PDP)
┌─────────────────────────────────────────────────────────┐
│     hcl-commerce-auth.js SERVICE INITIALIZES             │
│                                                          │
│  constructor():                                         │
│  ┌─ const auth = sessionStorage.getItem('hcl_auth')    │
│  │  Parse: {token, expiry, ...}                         │
│  │                                                      │
│  │─ this.token = auth.token                            │
│  │─ this.tokenExpiry = auth.expiry (1775703600000)     │
│  │                                                      │
│  │─ Log: [HCL-AUTH] Service initialized with:          │
│  │      hasTokenExpiry: true                            │
│  │      tokenExpiryTime: 2025-04-13 2:00:00 PM         │
│  └                                                      │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼ (User clicks Add to Cart)
┌─────────────────────────────────────────────────────────┐
│     getTrustedToken() CHECKS EXPIRY BEFORE USE           │
│                                                          │
│  ┌─ isTokenExpired():                                  │
│  │    now = Date.now() (1775700005000)                 │
│  │    expiry = this.tokenExpiry (1775703600000)        │
│  │                                                      │
│  │    if (now >= expiry) return true                   │
│  │    else return false                                │
│  │                                                      │
│  │    NOW < EXPIRY? ✅ YES, token is VALID             │
│  │    3600005000 < 3603600000? ✅ YES                  │
│  │                                                      │
│  │─ NOT expired, return trustedToken ✅                │
│  └                                                      │
│                                                          │
│  ┌─ return "1007002%2CZH6dm4Lu5ImLok%2B..." ──────────┐│
│  └────────────────────────────────────────────────────┘ │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼ (Token used for add-to-cart request)
┌─────────────────────────────────────────────────────────┐
│       REQUEST SUCCEEDS WITH 200 RESPONSE ✅             │
│                                                          │
│  Backend receives both:                                 │
│  - wctoken: "1007002%2C7KRQkAz5zsMeylITj%2B..."       │
│  - wctrustedtoken: "1007002%2CZH6dm4Lu5ImLok%2B..."   │
│                                                          │
│  Validates both tokens ✅                               │
│  Adds item to HCL cart ✅                               │
│  Returns: {success: true, cart: {...}} ✅              │
└─────────────────────────────────────────────────────────┘

                    LATER (3600 seconds later)
                       │
                       ▼ (1 hour passes)
┌─────────────────────────────────────────────────────────┐
│     NOW = 1775703601000 (1 second after expiry)         │
│                                                          │
│  User tries to add another product                      │
│  getTrustedToken() checks:                              │
│                                                          │
│  ┌─ NOW >= EXPIRY?                                     │
│  │  3703601000 >= 3703600000?                          │
│  │  ✅ YES, token is EXPIRED                            │
│  │                                                      │
│  │─ Log: Token expired, logging out                    │
│  │─ Clear sessionStorage.hcl_auth                      │
│  │─ return null                                         │
│  └                                                      │
│                                                          │
│  Add-to-cart fails:                                     │
│  Error: "Missing authentication token" ❌               │
│  User is logged out → Redirect to login ✅              │
└─────────────────────────────────────────────────────────┘
```

## State Flow During Add-to-Cart

```
BEFORE ADD TO CART:
┌─────────────────────────────────┐
│  simple-cart-state.cartState:   │
│                                 │
│  {                              │
│    items: [],                   │
│    total: 0                     │
│  }                              │
│                                 │
│  listeners: Set(1) [            │
│    mini-cart updateDisplay      │
│  ]                              │
└─────────────────────────────────┘

                    │ (User clicks Add to Cart)
                    ▼ (updateCartState called)

AFTER ADD TO CART:
┌─────────────────────────────────┐
│  simple-cart-state.cartState:   │
│                                 │
│  {                              │
│    items: [                     │
│      {                          │
│        name: "Budget Laptop",   │
│        price: 29.99,            │
│        quantity: 1              │
│      }                          │
│    ],                           │
│    total: 29.99                 │
│  }                              │
│                                 │
│  listeners.forEach(listener =>  │
│    listener(cartState)          │
│  )                              │
│  ↓                              │
│  Mini-cart updateDisplay()      │
│  ↓                              │
│  DOM Updated with items ✅      │
└─────────────────────────────────┘
```

## API Request/Response Diagram

```
ADD TO CART REQUEST:
┌────────────────────────────────────────────┐
│ POST /api/hcl/cart/add                     │
├────────────────────────────────────────────┤
│ Headers:                                   │
│   Content-Type: application/json           │
│   Authorization: Bearer <sessionCookies>   │
├────────────────────────────────────────────┤
│ Body:                                      │
│ {                                          │
│   "partNumber": "Budget_Laptop",          │
│   "quantity": 1,                          │
│   "accessToken": "1007002%2C7K...",       │
│   "trustedToken": "1007002%2CZH...",      │
│   "sessionCookies": {                     │
│     "JSESSIONID": "0000ABCD...",          │
│     "WC_PERSISTENT": "..."                │
│   }                                        │
│ }                                          │
└────────────────────────────────────────────┘
            │
            ▼ (Backend processes)
┌────────────────────────────────────────────┐
│ 200 OK Response                            │
├────────────────────────────────────────────┤
│ Headers:                                   │
│   Content-Type: application/json           │
├────────────────────────────────────────────┤
│ Body:                                      │
│ {                                          │
│   "success": true,                        │
│   "message": "Product added to cart",     │
│   "cart": {                                │
│     "cartId": "...",                      │
│     "items": [                             │
│       {                                    │
│         "name": "Budget Laptop",          │
│         "partNumber": "Budget_Laptop",    │
│         "sku": "BL-001",                  │
│         "quantity": 1,                    │
│         "price": 29.99,                   │
│         "orderItemId": "..."              │
│       }                                    │
│     ],                                     │
│     "total": 29.99                        │
│   }                                        │
│ }                                          │
└────────────────────────────────────────────┘
```

## Browser Storage State Diagram

```
BEFORE LOGIN:
┌─────────────────────────────────────────┐
│  sessionStorage:                        │
│  (empty or no hcl_auth)                 │
└─────────────────────────────────────────┘

AFTER LOGIN:
┌─────────────────────────────────────────────────────────────┐
│  sessionStorage.hcl_auth:                                   │
│                                                              │
│  {                                                          │
│    "token": "1007002%2C7KRQkAz5zsMeylITj%2B...",           │
│    "trustedToken": "1007002%2CZH6dm4Lu5ImLok%2BrZA...",   │
│    "userId": "1007002",                                    │
│    "sessionCookies": {                                     │
│      "JSESSIONID": "0000A1B2C3D4E5F6...",                 │
│      "WC_PERSISTENT": "..."                               │
│    },                                                       │
│    "expiresIn": 3600,                                      │
│    "expiry": 1775707360929,                                │
│    "storedAt": 1775707360929                               │
│  }                                                          │
│                                                              │
│  → Token available for 1 hour                              │
│  → After expiry, user auto-logged out                      │
└─────────────────────────────────────────────────────────────┘

AFTER ADD TO CART:
┌─────────────────────────────────────────┐
│  sessionStorage.hcl_auth:                │
│  (UNCHANGED - tokens still valid)        │
│                                          │
│  simple-cart-state.js (in-memory):      │
│  cartState = {                           │
│    items: [                              │
│      {name: "Budget Laptop", qty: 1}    │
│    ],                                    │
│    total: 29.99                          │
│  }                                       │
└─────────────────────────────────────────┘

AFTER LOGOUT:
┌─────────────────────────────────────────┐
│  sessionStorage.hcl_auth:                │
│  (CLEARED by commerce-login or logout)  │
│                                          │
│  simple-cart-state.js (in-memory):      │
│  cartState = {                           │
│    items: [],                            │
│    total: 0                              │
│  }                                       │
│  (Cleared by clearCartState())          │
└─────────────────────────────────────────┘
```

## Component Initialization Order

```
Page Load
  │
  ├─→ header block initializes
  │   └─→ commerce-mini-cart.js
  │       ├─→ getAccessToken() from hcl_auth ✅
  │       ├─→ subscribeToCart() registers listener ✅
  │       ├─→ syncCartFromHCL() fetches existing cart
  │       └─→ updateDisplay() renders mini-cart UI
  │
  ├─→ scripts/hcl-commerce-auth.js Service
  │   ├─→ Initializes from sessionStorage
  │   ├─→ Loads token and trustedToken
  │   └─→ Ready for auth calls
  │
  └─→ Simple Cart State
      ├─→ Initialize cartState (empty)
      ├─→ Setup listeners (Set)
      └─→ Ready for updates

Add to Cart Flow
  │
  ├─→ product-details.js
  │   ├─→ getAccessToken() from hcl_auth ✅
  │   ├─→ getTrustedToken() from service ✅
  │   ├─→ POST /api/hcl/cart/add
  │   └─→ updateCartState(response.cart) ✅
  │
  ├─→ simple-cart-state.js updateCartState()
  │   ├─→ Update in-memory cartState
  │   └─→ Call all listeners
  │
  └─→ commerce-mini-cart.js updateDisplay()
      ├─→ Get current cartState
      ├─→ Render items in DOM
      └─→ Update badge count ✅

Cart Page Load
  │
  ├─→ cart/cart.js
  │   ├─→ getAccessToken() from hcl_auth ✅
  │   ├─→ fetchCartFromHCL(token)
  │   ├─→ GET /api/hcl/cart
  │   └─→ updateCartState(cart)
  │
  └─→ Cart page renders items ✅
```

This visual guide shows how all pieces connect together to create a seamless cart experience!
