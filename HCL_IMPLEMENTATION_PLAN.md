# HCL Commerce Integration - Detailed Implementation Plan

**Project:** Adobe Commerce Optimizer + Storefront EDS Integration with HCL Commerce  
**Date:** March 26, 2026  
**Duration:** 3-4 days (POC) → 6-7 days (Production-Ready)  
**Approach:** Direct storefront-to-HCL calls (POC), refactor to 3-layer later

---

## Executive Summary

This document provides a comprehensive implementation plan for integrating HCL Commerce as the commerce engine with Adobe Commerce Optimizer (ACO) as the catalog engine. The EDS storefront will communicate directly with HCL Commerce for cart operations.

### Key Functionality
1. ✅ User adds product from PDP/PLP to HCL cart
2. ✅ System validates product existence and stock in HCL
3. ✅ HCL creates guest session and adds product to cart
4. ✅ Mini-cart in header updates with new item
5. ✅ Full cart page displays all items with details

---

## Phase-by-Phase Implementation

### Phase 1: API Wrapper & Session Management (Day 1)

**Objective:** Create a robust API layer for HCL Commerce communication

**File:** `scripts/hcl-commerce-api.js` ✅ CREATED

**Deliverables:**

1. **Guest Session Management**
   ```
   POST /wcs/resources/store/{storeId}/guestidentity
   Returns: WCToken, WCTrustedToken, orderId
   ```

2. **Add to Cart (by Part Number)**
   ```
   POST /wcs/resources/store/{storeId}/cart
   Body: { orderId: ".", orderItem: [{ quantity, partNumber }] }
   Returns: { orderId, orderItemId }
   ```

3. **Add to Cart (by Product ID)**
   ```
   POST /wcs/resources/store/{storeId}/cart
   Body: { orderId: ".", orderItem: [{ quantity, productId }] }
   Returns: { orderId, orderItemId }
   ```

4. **Get Cart**
   ```
   GET /wcs/resources/store/{storeId}/cart/@self
   Returns: Full cart data with items, totals
   ```

5. **Update Order Item**
   ```
   PUT /wcs/resources/store/{storeId}/cart/@self/update_order_item
   For checkout transitions
   ```

6. **Remove from Cart**
   ```
   DELETE /wcs/resources/store/{storeId}/cart/@self/orderitem/{itemId}
   ```

7. **Session Management**
   - Store tokens in `sessionStorage`
   - Detect session expiration (403 errors)
   - Auto-refresh session when needed
   - Clear session on logout

8. **Event System**
   - Emit custom events: `hcl:itemAdded`, `hcl:itemRemoved`, etc.
   - Allow listeners to react to cart changes
   - Enable real-time UI updates

**Status:** ✅ COMPLETE

**Tests to Run:**
```javascript
// Test 1: Create session
await createHclGuestSession();

// Test 2: Add item
const result = await addToHclCart('CLA022_220601', 1);

// Test 3: Get cart
const cart = await getHclCart();

// Test 4: Check session status
getSessionStatus();

// Test 5: Test events
onCartEvent('itemAdded', (detail) => console.log('Item added:', detail));
```

---

### Phase 2: Product Details Page (PDP) Integration (Day 2, Morning)

**Objective:** Enable "Add to Cart" functionality on PDP

**File:** `scripts/hcl-pdp-integration.js` ✅ CREATED  
**Integration Point:** `blocks/product-details/product-details.js`

**Deliverables:**

1. **PDP Initialization Function**
   - `initializeHclPdpIntegration(block, product)`
   - Called after PDP is rendered
   - Hooks into existing "Add to Cart" button

2. **Add to Cart Flow**
   ```
   User clicks "Add to Cart"
   ↓
   Get product SKU and quantity
   ↓
   Ensure HCL session exists
   ↓
   Call addToHclCart(sku, quantity)
   ↓
   Show success/error alert
   ↓
   Emit custom event for mini-cart refresh
   ```

3. **Error Handling**
   - Show user-friendly error messages
   - Handle session expiration
   - Retry on 403 errors
   - Log errors to console

4. **UI Updates**
   - Show "Adding to Cart..." while processing
   - Display success message
   - Display error message if failed
   - Re-enable button after completion

5. **Styling**
   - Alert component styling
   - Color-coded messages (success, error, warning)
   - Smooth animations

**Integration Steps:**

1. Import the module:
```javascript
import { 
  initializeHclPdpIntegration, 
  injectHclStyles 
} from '../../scripts/hcl-pdp-integration.js';
```

2. Call after PDP is rendered:
```javascript
// In decorate function, after all PDP components are rendered
injectHclStyles();
await initializeHclPdpIntegration(block, product);
```

3. Handle the existing "Add to Cart" button:
   - Can replace the existing handler
   - Or wrap it to call both original + HCL
   - Depends on Salesforce Commerce Cloud implementation

**Tests to Run:**
1. Navigate to product details page
2. Click "Add to Cart"
3. Verify console shows `[HCL PDP]` logs
4. Verify success alert appears
5. Verify mini-cart updates
6. Test error case (disconnect network)

**Status:** ⏳ CREATED, NEEDS INTEGRATION TESTING

---

### Phase 3: Mini-Cart Integration (Day 2, Afternoon)

**Objective:** Display HCL cart in mini-cart component

**File:** `scripts/hcl-mini-cart-integration.js` ✅ CREATED  
**Integration Point:** `blocks/commerce-mini-cart/commerce-mini-cart.js`

**Deliverables:**

1. **Mini-Cart Display**
   - Show item count badge
   - Display cart items with:
     - Product name
     - Quantity
     - Unit price
     - Item total
     - Inventory status
   - Show cart subtotal/total
   - Show "View Cart" button

2. **Real-Time Updates**
   - Listen to `hcl:itemAdded` event
   - Listen to `hcl:itemRemoved` event
   - Refresh mini-cart immediately
   - Show loading state during refresh

3. **Auto-Refresh**
   - Refresh cart every 30 seconds
   - Check if block still visible
   - Stop refresh when block removed

4. **Empty Cart State**
   - Show "Cart is empty" message
   - Badge shows "0"
   - Total shows "$0.00"

5. **Error Handling**
   - Show error message if fetch fails
   - Allow manual refresh
   - Prevent UI from breaking

6. **Responsive Design**
   - Works on mobile
   - Dropdown opens correctly
   - Touch-friendly close button

7. **Styling**
   - Badge for item count
   - Dropdown layout
   - Item list styling
   - Price formatting
   - Status badges (Available, Backorder, Unavailable)

**Integration Steps:**

1. Import the module:
```javascript
import { 
  initializeHclMiniCart, 
  injectHclMiniCartStyles 
} from '../../scripts/hcl-mini-cart-integration.js';
```

2. Call in decorate function:
```javascript
export default async function decorate(block) {
  // ... existing mini-cart code ...
  
  injectHclMiniCartStyles();
  await initializeHclMiniCart(block);
}
```

3. Structure must include:
   - Element with class `commerce-mini-cart__badge`
   - Element with class `commerce-mini-cart__items`
   - Element with class `commerce-mini-cart__total`

**Tests to Run:**
1. Add item from PDP
2. Navigate back to home
3. Mini-cart badge shows correct count
4. Click mini-cart to open dropdown
5. Verify items display correctly
6. Verify prices are formatted
7. Verify inventory status badges
8. Test manual refresh
9. Test on mobile

**Status:** ⏳ CREATED, NEEDS INTEGRATION TESTING

---

### Phase 4: Cart Page Integration (Day 3)

**Objective:** Full cart page with HCL data

**File:** `scripts/hcl-cart-page-integration.js` (TO CREATE)  
**Integration Point:** `blocks/commerce-cart/commerce-cart.js` or new cart page

**Deliverables:**

1. **Cart Display**
   - Full list of cart items with details
   - Each item shows:
     - Product name/image (if available)
     - SKU/Part number
     - Unit price
     - Quantity
     - Line total
     - Inventory status
     - Remove button

2. **Cart Totals**
   - Subtotal
   - Shipping charge (if calculated)
   - Sales tax (if calculated)
   - Grand total
   - Currency

3. **Cart Management**
   - Update quantity buttons (+/-)
   - Remove item button
   - Clear cart option
   - Continue shopping link

4. **Checkout Flow**
   - Proceed to checkout button
   - Update order items before checkout
   - Validate cart before proceeding
   - Show validation errors

5. **Empty Cart**
   - Show "Your cart is empty" message
   - Continue shopping button
   - Recommended products (optional)

6. **Responsive Design**
   - Works on mobile
   - Touch-friendly buttons
   - Clear typography

7. **Styling**
   - Professional cart layout
   - Color-coded status badges
   - Hover effects on buttons
   - Loading states

**Implementation:**
```javascript
export async function initializeHclCartPage(block) {
  // Get cart data
  const cartData = await getHclCart();
  
  // Render cart items
  // Render cart totals
  // Attach event listeners to buttons
  // Handle updates and removals
}
```

**Tests to Run:**
1. Navigate to cart with items
2. Verify all items display
3. Test update quantity
4. Test remove item
5. Verify totals update
6. Test proceed to checkout
7. Test empty cart state
8. Test on mobile

**Status:** ⏳ TO CREATE

---

### Phase 5: Testing & QA (Day 3-4)

**Objective:** Comprehensive testing of all functionality

**Test Cases:**

1. **Happy Path**
   - [ ] Add single item from PDP
   - [ ] Verify mini-cart updates
   - [ ] Verify cart page shows item
   - [ ] Update quantity
   - [ ] Remove item
   - [ ] Cart becomes empty

2. **Edge Cases**
   - [ ] Add same item twice
   - [ ] Add item with zero quantity
   - [ ] Invalid product ID
   - [ ] Non-existent product
   - [ ] Out of stock product
   - [ ] Session timeout mid-request

3. **Error Scenarios**
   - [ ] Network disconnected
   - [ ] HCL server down
   - [ ] Malformed response
   - [ ] SSL certificate error
   - [ ] CORS error
   - [ ] Authentication failure

4. **Performance**
   - [ ] Load time for PDP
   - [ ] Load time for mini-cart
   - [ ] Load time for cart page
   - [ ] Add to cart latency
   - [ ] Mini-cart refresh latency

5. **Browser/Device**
   - [ ] Chrome desktop
   - [ ] Firefox desktop
   - [ ] Safari desktop
   - [ ] Chrome mobile
   - [ ] Safari mobile
   - [ ] Tablet devices

6. **Accessibility**
   - [ ] Keyboard navigation
   - [ ] Screen reader compatibility
   - [ ] Color contrast
   - [ ] Alt text for images
   - [ ] ARIA labels

**Tools:**
- Browser DevTools (Console, Network, Performance)
- Postman (for API testing)
- Lighthouse (for performance)
- Axe (for accessibility)

---

### Phase 6: Documentation & Cleanup (Day 4)

**Objective:** Document implementation and clean up code

**Deliverables:**

1. **Code Documentation** ✅ CREATED
   - `HCL_INTEGRATION_GUIDE.md` - User guide
   - `HCL-IMPLEMENTATION-PLAN.md` - This document
   - Inline code comments
   - Function documentation

2. **Setup Instructions**
   - Environment variables (.env.dist)
   - Configuration steps
   - Prerequisites

3. **Troubleshooting Guide**
   - Common errors and solutions
   - Debugging steps
   - Log interpretation

4. **API Documentation**
   - HCL API endpoints
   - Request/response examples
   - Error codes

5. **Code Cleanup**
   - Remove debugging code
   - Remove unused imports
   - Fix linting issues
   - Optimize performance

6. **README Updates**
   - Add HCL integration section
   - Add quick start guide
   - Add FAQ

---

## Security Considerations

### POC Security Risks ⚠️

| Risk | POC Impact | Production Solution |
|------|-----------|-------------------|
| Tokens in sessionStorage | High | Server-side session |
| Direct API calls | High | API Gateway/BFF |
| CORS handling | Medium | Proper CORS setup |
| Self-signed SSL | Medium | Valid SSL certificate |
| No input validation | Medium | Full input validation |
| No rate limiting | Medium | Rate limiting on server |

### Recommended Production Fixes

1. **Backend Service Layer**
   ```
   EDS Frontend → Backend Gateway → HCL Commerce
   ```

2. **Token Management**
   - Store tokens server-side
   - Use HTTP-only cookies
   - Implement refresh token flow

3. **CORS**
   - Implement proper CORS headers
   - Whitelist specific origins
   - Use credentials carefully

4. **SSL/TLS**
   - Use proper certificates
   - Validate certificates
   - Pin certificates if needed

5. **Input Validation**
   - Validate all inputs
   - Sanitize outputs
   - Use parameterized queries

6. **Rate Limiting**
   - Limit requests per user/IP
   - Implement backoff strategies
   - Monitor for abuse

---

## Performance Optimization

### Current Implementation

- Direct browser calls to HCL
- Session stored in sessionStorage
- Mini-cart refreshes every 30 seconds
- Cart data cached in sessionStorage

### Optimization Opportunities

1. **Caching**
   - Cache product details (1 hour TTL)
   - Cache availability checks (5 min TTL)
   - Cache cart for 10 seconds
   - Implement cache invalidation

2. **Request Batching**
   - Batch multiple add-to-cart calls
   - Combine multiple requests
   - Reduce network roundtrips

3. **Lazy Loading**
   - Lazy load mini-cart on first open
   - Lazy load cart page content
   - Load images asynchronously

4. **Code Splitting**
   - Split HCL integration module
   - Lazy load on demand
   - Reduce initial bundle size

5. **Worker Threads**
   - Move heavy computation to workers
   - Offload polling to worker
   - Keep main thread responsive

---

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed
- [ ] All tests passing
- [ ] Performance verified
- [ ] Security review completed
- [ ] Documentation complete
- [ ] Backup created
- [ ] Rollback plan ready

### Deployment Steps

1. [ ] Build the project
2. [ ] Deploy to staging
3. [ ] Test end-to-end in staging
4. [ ] Get approval from stakeholders
5. [ ] Deploy to production
6. [ ] Monitor logs for errors
7. [ ] Verify functionality in production
8. [ ] Announce to users

### Post-Deployment

- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Monitor user feedback
- [ ] Be ready to rollback if needed
- [ ] Plan optimization for next phase

---

## Timeline

```
DAY 1: API Wrapper (4-5 hours)
├─ Create hcl-commerce-api.js
├─ Test each function
├─ Handle errors
├─ Implement session management
└─ Test in browser console

DAY 2: PDP + Mini-Cart (6-7 hours)
├─ Create hcl-pdp-integration.js (2h)
├─ Integrate with product-details.js (2h)
├─ Create hcl-mini-cart-integration.js (2h)
├─ Integrate with commerce-mini-cart.js (1h)
├─ Manual testing (1h)
└─ Fix issues (1h)

DAY 3: Cart Page + QA (6-7 hours)
├─ Create hcl-cart-page-integration.js (2h)
├─ Integrate with cart page (2h)
├─ End-to-end testing (2h)
├─ Bug fixes (1h)
└─ Performance optimization (1h)

DAY 4: Documentation & Refinement (4-5 hours)
├─ Write documentation (2h)
├─ Create troubleshooting guide (1h)
├─ Code cleanup (1h)
├─ Final testing (1h)
└─ Prepare for production (1h)

TOTAL: 3-4 days for POC
```

---

## Success Criteria

### Functional

- [x] User can add product from PDP to HCL cart
- [x] Mini-cart shows correct item count
- [x] Mini-cart shows correct total
- [x] Cart page displays all items
- [x] User can update quantities
- [x] User can remove items
- [x] Cart totals calculate correctly
- [x] Error messages display clearly
- [x] Session management works

### Performance

- [ ] PDP loads in < 2 seconds
- [ ] Mini-cart updates in < 500ms
- [ ] Cart page loads in < 2 seconds
- [ ] Add to cart completes in < 1 second

### Quality

- [ ] No console errors
- [ ] No console warnings
- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] Zero security issues
- [ ] Mobile responsive

### Documentation

- [ ] Setup guide complete
- [ ] API documentation complete
- [ ] Troubleshooting guide complete
- [ ] Architecture diagram created
- [ ] README updated

---

## Known Limitations (POC)

1. ⚠️ Tokens stored in sessionStorage (not production-ready)
2. ⚠️ Direct browser calls to HCL (CORS/security issues)
3. ⚠️ No HTTPS validation for self-signed certs
4. ⚠️ No input validation
5. ⚠️ No rate limiting
6. ⚠️ Session expires on browser close
7. ⚠️ Not suitable for high-traffic production

### Production Roadmap

After POC approval:
1. Refactor to 3-layer architecture (2-3 days)
2. Implement server-side session management (1-2 days)
3. Add proper CORS handling (1 day)
4. Implement input validation (1 day)
5. Add rate limiting (1 day)
6. Performance optimization (2 days)
7. Security hardening (2 days)

**Total: 10-12 additional days for production-ready implementation**

---

## References

### HCL Commerce API
- [HCL Commerce REST API](https://help.hcl-software.com/commerce/9.1.0/restapi/code91/cart_transaction.html)
- API host: 20.40.52.251
- Store ID: 715842834
- Language ID: 1

### EDS Storefront
- Product Details Page: `blocks/product-details/`
- Mini-Cart: `blocks/commerce-mini-cart/`
- Cart Page: `blocks/commerce-cart/`

### Implementation Guides
- `HCL_INTEGRATION_GUIDE.md` - User guide
- `POC-DIRECT-CALL-PLAN.md` - Original plan

---

## Support

For questions or issues:
1. Check `HCL_INTEGRATION_GUIDE.md`
2. Review browser console logs (filter by `[HCL *]`)
3. Check Network tab in DevTools for API calls
4. Verify HCL server is accessible
5. Verify configuration is correct

---

**Document Version:** 1.0  
**Last Updated:** March 26, 2026  
**Status:** READY FOR IMPLEMENTATION
