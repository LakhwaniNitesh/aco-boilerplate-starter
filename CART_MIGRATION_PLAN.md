# Cart Migration Plan: From Custom File Storage to HCL Commerce API

## Overview
Migrate cart system from custom file-based storage to use HCL Commerce REST APIs directly, following Adobe Commerce drop-in patterns.

## Current State
- **Cart Storage:** File-based (`api/.cart-storage/test-cart-localhost.json`)
- **Frontend Sync:** localStorage + event listeners
- **Data Source:** HCL Commerce (only for display, not for persistence)

## Target State (Adobe Commerce Pattern)
- **Cart Storage:** HCL Commerce only (single source of truth)
- **Frontend Sync:** sessionStorage (temporary) + HCL API calls
- **Data Source:** HCL Commerce (for both persistence and display)
- **Mini-cart & Cart Page:** Both sync with HCL Commerce, not localStorage

## Implementation Strategy

### Phase 1: Backend Proxy Updates (Minimal Changes)
**File:** `api/controllers/hcl-cart-controller.js`
- Remove file-based storage logic
- Convert to direct HCL Commerce API proxy
- Keep same endpoints: `/api/hcl/cart/add`, `/api/hcl/cart`, `/api/hcl/cart/clear`
- Request flow: Frontend → Backend Proxy → HCL Commerce → Response to Frontend

### Phase 2: Frontend Cart State (Simplification)
**Current:** `scripts/simple-cart-state.js` (localStorage-based)
**New:** Update to use HCL Commerce as source of truth
- Keep same export interface: `getCartState()`, `updateCartState()`, `subscribeToCart()`
- Remove localStorage persistence
- Source data only from HCL Commerce responses

### Phase 3: Mini-Cart Block (No Breaking Changes)
**File:** `blocks/commerce-mini-cart/commerce-mini-cart.js`
- Continue using `getCartState()` - interface unchanged
- Remove localStorage restore logic
- Fetch cart on page load via `/api/hcl/cart` (proxy calls HCL)
- Subscribe to cart updates (same pattern as before)

### Phase 4: Cart Page Block (No Breaking Changes)
**File:** `blocks/commerce-cart/commerce-cart.js`
- Continue using `getCartState()` - interface unchanged
- Fetch cart on page load via `/api/hcl/cart`
- Render with HCL Commerce data (same logic as before)

### Phase 5: Add-to-Cart Button (No Breaking Changes)
**File:** `blocks/product-details/product-details.js`
- Continue posting to `/api/hcl/cart/add` - endpoint unchanged
- Backend now proxies to HCL Commerce instead of file storage
- Response handling remains same

## Benefits of This Approach

✅ **Single Source of Truth:** HCL Commerce only
✅ **Production Ready:** No custom file storage in prod
✅ **Drop-in Compatible:** Follows Adobe Commerce pattern
✅ **Minimal Code Changes:** Keep same component interfaces
✅ **Authentication Safe:** Backend handles token management
✅ **CORS Secure:** Backend acts as proxy
✅ **No Breaking Changes:** Components continue working with same APIs

## Detailed Implementation Steps

### Step 1: Update HCL Cart Controller
Replace file-based logic with HCL API calls:
```
- addToCart() → proxy to HCL REST API
- getCart() → proxy to HCL REST API
- removeFromCart() → proxy to HCL REST API
- clearCart() → clear session and notify frontend
```

### Step 2: Update Simple Cart State
Simplify to sync-only:
```
- Fetch cart from `/api/hcl/cart`
- Store in memory for UI
- No localStorage (session-only, like drop-ins)
- Subscribe mechanism stays same
```

### Step 3: Frontend Components
No logic changes needed:
```
- Mini-cart: Call updateCartState() on init + subscribe
- Cart page: Call getCartState() on load
- Add-to-cart: POST to /api/hcl/cart/add (unchanged)
```

## API Contracts (Unchanged from Frontend Perspective)

### Backend Endpoints (Frontend → Backend)
```
POST /api/hcl/cart/add
  Request: { partNumber, sku, quantity, accessToken }
  Response: { success, cart: { cartId, items[], total } }

GET /api/hcl/cart
  Query: { accessToken }
  Response: { success, cart: { cartId, items[], total } }

DELETE /api/hcl/cart/clear
  Response: { success }
```

### Frontend State Interface (Unchanged)
```
getCartState() → { cartId, items[], total }
updateCartState(cart) → void
subscribeToCart(listener) → unsubscribe function
```

## Testing Strategy

1. **Unit Tests:**
   - HCL Cart Controller proxy logic
   - Cart state sync from API responses

2. **Integration Tests:**
   - Add to cart → Backend proxy → HCL API → Frontend update
   - Mini-cart displays after add-to-cart
   - Cart page loads with correct data
   - Clear cart removes items from HCL

3. **E2E Tests:**
   - Full flow: Auth → Add Product → View Mini-cart → View Cart Page → Clear Cart

## Rollback Plan

If HCL Commerce API is unavailable:
- Backend returns 503 Service Unavailable
- Frontend shows error message
- No fallback to file storage (intentional - forces HCL connectivity)

## Dependencies

- HCL Commerce REST API accessible via VPN
- Valid credentials in environment variables
- Network connectivity to HCL Commerce VM

## Timeline

- **Step 1 (Backend):** 30 mins
- **Step 2 (State):** 20 mins
- **Step 3 (Components):** 10 mins (verify, no changes needed)
- **Testing:** 30 mins
- **Total:** ~90 mins

## Configuration Required

```env
HCL_HOST=https://vm-ip:port
HCL_STORE_ID=xxxxx
HCL_USERNAME=xxxxx
HCL_PASSWORD=xxxxx
```

All already in place, no new config needed.
