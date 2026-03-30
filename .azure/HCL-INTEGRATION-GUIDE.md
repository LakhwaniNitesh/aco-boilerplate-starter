# HCL Commerce Cart Integration - Implementation Guide

## Overview

This is a **POC (Proof of Concept)** implementation that integrates HCL Commerce as the cart/order management engine with the Adobe Commerce Optimizer (ACO) EDS storefront.

**Architecture:** Direct browser calls from EDS storefront → HCL Commerce APIs

**Timeline:** 3-4 days for POC

## Key Files

### Core API Wrapper
- **`scripts/hcl-commerce-api.js`** - Main HCL Commerce API wrapper
  - Guest session creation
  - Add/remove from cart
  - Get cart data
  - Token management
  - Custom event system

### Integration Modules
- **`scripts/hcl-pdp-integration.js`** - Product Details Page integration
  - Intercepts PDP "Add to Cart" button
  - Calls HCL APIs instead of Adobe Commerce
  - Shows loading/success/error states
  
- **`scripts/hcl-plp-integration.js`** - Product Listing Page integration
  - Sets up add-to-cart for all product cards
  - Minimal overhead, quick operations

- **`scripts/hcl-mini-cart-integration.js`** - Mini-cart in header
  - Displays HCL cart items
  - Updates on cart changes
  - Shows item count and totals

### Initializer
- **`scripts/initializers/hcl-cart.js`** - Main entry point
  - Wires up all integrations
  - Called from scripts.js

## Implementation Status

### ✅ Completed (Phase 1)
- [x] Core HCL Commerce API wrapper (hcl-commerce-api.js)
- [x] Guest & authenticated session management
- [x] Add to cart via part number
- [x] Get cart data
- [x] Token caching (sessionStorage)
- [x] Custom event system

### 🔄 In Progress (Phase 2)
- [ ] PDP integration refinement
- [ ] Selector tuning for add-to-cart button

### 📋 TODO (Phase 3-4)
- [ ] Mini-cart display updates
- [ ] Full cart page implementation
- [ ] CSS styling
- [ ] End-to-end testing

## How It Works

### 1. Guest Checkout Flow

```
User clicks "Add to Cart" on PDP
         ↓
Check for HCL session token in sessionStorage
         ↓
If no token: Create guest session (POST to /guestidentity)
         ↓
Add product to HCL cart (POST to /cart)
         ↓
Emit 'hcl:itemAdded' event
         ↓
Mini-cart listens and updates display
```

### 2. Session Management

**Guest Session:**
- Created on first add-to-cart
- Stored in sessionStorage (survives page reload)
- WCToken + WCTrustedToken required for all requests

**Authenticated Session:**
- User logs in via Adobe Commerce auth
- Pass tokens to `setAuthenticatedSession()`
- Uses same API calls

### 3. HCL API Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create Guest Session | POST | `/wcs/resources/store/{storeId}/guestidentity` |
| Add to Cart | POST | `/wcs/resources/store/{storeId}/cart` |
| Get Cart | GET | `/wcs/resources/store/{storeId}/cart/@self` |
| Remove Item | DELETE | `/wcs/resources/store/{storeId}/cart/@self/orderitem/{orderItemId}` |
| Update Quantity | PUT | `/wcs/resources/store/{storeId}/cart/@self/orderitem/{orderItemId}` |

## API Usage Examples

### Add Product to Cart

```javascript
import { addToHclCart, createHclGuestSession } from './hcl-commerce-api.js';

// Ensure session exists
await createHclGuestSession();

// Add product
const result = await addToHclCart('CLA022_220601', 1);
console.log(result.orderId); // HCL order ID
console.log(result.orderItemId); // Item ID in cart
```

### Listen for Cart Events

```javascript
import { onCartEvent } from './hcl-commerce-api.js';

onCartEvent('itemAdded', (detail) => {
  console.log('Item added:', detail.partNumber);
  // Update mini-cart display
});

onCartEvent('itemRemoved', (detail) => {
  console.log('Item removed:', detail.orderItemId);
});

onCartEvent('error', (detail) => {
  console.error('Cart error:', detail.error);
});
```

### Get Current Cart

```javascript
import { getHclCart } from './hcl-commerce-api.js';

const cart = await getHclCart();
console.log(cart.items);        // Array of items
console.log(cart.cartTotals);   // Subtotal, tax, shipping, grand total
```

## Configuration

### Environment Variables (for production)

```bash
# .env.local
HCL_API_HOST=your-hcl-host.com
HCL_STORE_ID=your-store-id
HCL_LANG_ID=1
HCL_PROTOCOL=https
```

### CORS Setup Required

HCL must whitelist your EDS domain:

```
EDS Domain: https://main--{repo}--{owner}.aem.page
```

Ask HCL team to add this to CORS configuration.

## Testing

### Manual Testing Checklist

- [ ] Click "Add to Cart" on PDP
- [ ] Verify item appears in mini-cart
- [ ] Verify item count updates in header
- [ ] Click "Add to Cart" on PLP
- [ ] Navigate to cart page, verify items appear
- [ ] Click "Remove" on cart item
- [ ] Update quantity and verify
- [ ] Test guest checkout flow (no login)
- [ ] Test authenticated flow (after login)

### Browser Console Debugging

All operations log to console with `[HCL]` prefix:

```javascript
// View all HCL logs
console.log('Filter by: [HCL]')

// View current session
sessionStorage.getItem('hcl_wctoken')

// Manually trigger cart update
await updateMiniCartDisplay(block)
```

## Known Issues & Workarounds

### Issue: CORS Errors
**Cause:** EDS domain not whitelisted in HCL
**Workaround:** Contact HCL team to add domain to CORS whitelist

### Issue: 403 Forbidden on Add to Cart
**Cause:** Session token expired or invalid
**Workaround:** Session auto-refreshes, retry operation

### Issue: Self-signed SSL Certificate
**Cause:** HCL uses self-signed cert in staging
**Workaround:** Trust certificate in browser or ask HCL for proper cert

## Phase 2-4 Plan

### Phase 2: PDP Integration
- [ ] Test selector for add-to-cart button
- [ ] Handle product data extraction
- [ ] Display success/error messages
- [ ] Quantity selection

### Phase 3: Mini-Cart
- [ ] Real-time updates on item add/remove
- [ ] Item count in badge
- [ ] Grand total display
- [ ] Link to cart page

### Phase 4: Cart Page
- [ ] Full item details
- [ ] Quantity adjustment
- [ ] Remove items
- [ ] Proceed to checkout button
- [ ] CSS styling

### Phase 5: Testing & Polish
- [ ] End-to-end testing
- [ ] Browser compatibility
- [ ] Mobile responsiveness
- [ ] Error handling edge cases

## Refactoring to Production (Phase 5+)

This POC uses direct browser-to-HCL calls. For production, refactor to 3-layer architecture:

```
EDS Storefront
    ↓ (HTTPS)
Adobe I/O Runtime (Middleware)
    ↓ (Server-to-server)
HCL Commerce
```

Benefits:
- ✅ Credentials hidden from browser
- ✅ Better CORS handling
- ✅ Server-side session management
- ✅ Request validation & transformation
- ✅ Rate limiting & caching
- ✅ Audit logging

## Support & Debugging

**Enable Debug Mode:**

```javascript
// In browser console
window._HCL_DEBUG = true;
```

**Common selectors to update:**

```javascript
// PDP button
'button[class*="add"], .add-to-cart-btn, [data-test="add-to-cart"]'

// Mini-cart badge
'.mini-cart__badge, [class*="count"]'

// Cart items list
'.cart-items, [class*="items"]'
```

## Next Steps

1. ✅ Test Phase 1 (API wrapper) in Postman
2. 🔄 Refine Phase 2 (PDP integration)
3. 📋 Complete Phase 3 (Mini-cart)
4. 📋 Complete Phase 4 (Cart page)
5. 🧪 Run end-to-end testing

---

**Created:** March 30, 2026
**Target Completion:** April 2, 2026 (4 days)
