# Immediate Action Items - Cart Migration to HCL Commerce APIs

## ✅ Completed
- [x] Updated backend cart controller to proxy HCL Commerce REST APIs
- [x] Simplified cart state management (removed localStorage, file storage)
- [x] Updated mini-cart block to fetch from HCL on page load
- [x] Updated cart page block to fetch from HCL on page load
- [x] Updated add-to-cart button to use HCL API via backend proxy
- [x] Created comprehensive migration documentation

## 🔴 BLOCKING - Must Do Now

### 1. Test Cart Operations End-to-End
**What:** Verify cart works with HCL Commerce VM
**How:**
1. Ensure HCL Commerce instance is running on VM (accessible via OpenVPN)
2. Authenticate user (get accessToken)
3. Add product to cart
4. Check mini-cart updates
5. Navigate to cart page
6. Verify product shows with correct data

**Expected Behavior:**
```
✓ Add-to-cart POST to /api/hcl/cart/add succeeds
✓ Backend proxy calls HCL Commerce REST API
✓ Response normalized and returned
✓ Mini-cart auto-updates
✓ Cart page shows product on navigation
```

**Failure Signs:**
```
✗ "Not authenticated" error
✗ 401/403 from backend
✗ Timeout calling HCL
✗ Cart shows empty
✗ Network errors in console
```

### 2. Verify HCL API Response Format
**What:** Ensure HCL response matches expected structure
**Check:**
```javascript
// Expected structure:
{
  cartId: "...",
  items: [
    {
      partNumber: "SKU-123",
      sku: "SKU-123",
      quantity: 1,
      price: 600,
      name: "Product Name",
      orderItemId: "..."
    }
  ],
  total: 600
}
```

**If Different:**
- Update `normalizeHCLCart()` function in `api/controllers/hcl-cart-controller.js`
- Map HCL field names to our standard format

### 3. Verify Authentication Token Storage
**What:** Ensure token is available to frontend cart operations
**Check:**
1. After login, token should be in `sessionStorage.getItem('hcl-access-token')`
2. Token should be passed to `/api/hcl/cart/add` request
3. Backend should validate token before calling HCL

**If Token Missing:**
- Update login response handler to store token
- Verify sessionStorage vs localStorage setting
- Check token key name consistency

### 4. Check Server Logs During Cart Operations
**What:** Monitor backend for HCL API calls
**Look for:**
```
[CART-PROXY] Adding to cart: SKU-123 x1
[CART-PROXY] ✓ Added to HCL cart. Items: 1, Total: $600.00
```

**Failure Logs:**
```
[CART-PROXY] Error adding to cart: Cannot reach HCL
[CART-PROXY] Error: 401 Unauthorized
[CART-PROXY] Error: Invalid response format
```

## 🟡 Important - Complete This Week

### 5. Implement Authentication Token Management
**Current State:** Token manually stored in sessionStorage
**Needed:** Consistent token lifecycle management

**Tasks:**
- [ ] Verify login stores token with correct key: `hcl-access-token`
- [ ] Implement token refresh if using short-lived tokens
- [ ] Clear token on logout
- [ ] Handle token expiration gracefully

**Files to Update:**
- Login endpoint response handler
- Token expiration check before API calls
- Logout endpoint

### 6. Add Error Handling for Cart Operations
**Current:** Basic error messages shown to user
**Needed:** Better error recovery

**Scenarios:**
```
// Token expired - redirect to login
if (error.statusCode === 401) {
  redirectToLogin();
}

// HCL unreachable - show retry UI
if (error.statusCode >= 500) {
  showRetryButton();
}

// Invalid product - show specific error
if (error.message.includes('not found')) {
  showProductError();
}
```

**Files to Update:**
- `blocks/product-details/product-details.js` - add-to-cart error handling
- `blocks/commerce-mini-cart/commerce-mini-cart.js` - sync error handling
- `blocks/commerce-cart/commerce-cart.js` - load error handling

### 7. Remove Old Cart Storage Files
**Current:** Old cart storage directory still exists
**Action:** Clean up file-based storage

```bash
rm -rf api/.cart-storage/
```

**Status:** Can do after testing confirms HCL API works

## 🟢 Nice to Have - Next Sprint

### 8. Implement Remove Item from Cart
**Current:** Not yet implemented in controller
**Status:** Ready in backend, needs frontend UI

**Files to Create/Update:**
- [ ] Add remove button to cart page item
- [ ] Wire to `/api/hcl/cart/item` DELETE endpoint
- [ ] Refresh cart on success

### 9. Implement Update Quantity
**Current:** Not yet implemented in controller
**Status:** Ready in backend, needs frontend UI

**Files to Create/Update:**
- [ ] Add quantity spinner to cart page
- [ ] Wire to `/api/hcl/cart/item` PUT endpoint
- [ ] Recalculate totals on change

### 10. Add Cart Sync on Interval
**Current:** Syncs only on page load
**Optimization:** Periodic sync to catch external changes

```javascript
// Add to mini-cart block
setInterval(async () => {
  await syncCartFromHCL();
}, 30000); // Every 30 seconds
```

### 11. Implement Caching Strategy
**Current:** Every page load hits HCL API
**Optimization:** Cache response with TTL

**Consider:**
- Browser sessionStorage cache
- Memory cache with expiry
- Invalidate on mutations (add/remove/update)

## 📋 Testing Checklist

Before marking migration complete:

- [ ] Add product to cart (no auth) → Error shown
- [ ] Add product to cart (with auth) → Success, mini-cart updates
- [ ] Mini-cart shows correct count and total
- [ ] Cart page shows all items with correct prices
- [ ] Clear cart button works
- [ ] Refresh page → cart persists in HCL
- [ ] Logout → cart cleared from UI
- [ ] Login → cart reloads from HCL
- [ ] Network tab shows `/api/hcl/` calls
- [ ] No localStorage cart data (removed)
- [ ] Server logs show `[CART-PROXY]` entries

## 📞 Troubleshooting

### "Not authenticated" Error on Add to Cart
```
→ Check: sessionStorage.getItem('hcl-access-token')
→ Verify: Login response stores token correctly
→ Solution: Fix token key name if needed
```

### Mini-cart shows empty after add-to-cart
```
→ Check: Network tab for /api/hcl/cart/add response
→ Verify: Response has success: true and cart object
→ Check: updateCartState() is being called
→ Solution: Add console.log to debug data flow
```

### Cart page shows empty despite items in mini-cart
```
→ Check: fetchCartFromHCL() is called on page load
→ Verify: accessToken is available
→ Check: Network tab for /api/hcl/cart request
→ Solution: Check authentication state on cart page
```

### HCL API returns 500 error
```
→ Check: HCL Commerce VM is running
→ Verify: Credentials in env variables are correct
→ Check: VPN connection to HCL VM
→ Solution: Restart HCL Commerce or check HCL logs
```

## 🎯 Success Criteria

Migration is complete when:

✅ Add-to-cart works end-to-end with HCL Commerce
✅ Mini-cart syncs automatically after add
✅ Cart page displays correct items from HCL
✅ Cart persists across page refreshes
✅ Authentication is required for cart operations
✅ All components follow Adobe Commerce pattern
✅ No file-based storage in production
✅ Error messages guide users to resolution
✅ Server logs show clean proxy calls
✅ No console errors or warnings

## 📅 Timeline

**Today/Tomorrow:** 
- Complete items 1-4 (testing, response format, auth, logs)

**This Week:**
- Complete items 5-7 (token management, error handling, cleanup)

**Next Sprint:**
- Complete items 8-11 (remove item, quantity update, caching)

## 📝 Files Modified in This Migration

```
✅ api/controllers/hcl-cart-controller.js (Complete rewrite)
✅ scripts/simple-cart-state.js (Major changes)
✅ blocks/commerce-mini-cart/commerce-mini-cart.js (Updated)
✅ blocks/commerce-cart/commerce-cart.js (Updated)
✅ blocks/product-details/product-details.js (Updated)
+ CART_MIGRATION_PLAN.md (New)
+ CART_MIGRATION_SUMMARY.md (New)
+ CART_MIGRATION_ACTION_ITEMS.md (This file)
```

## 📞 Support

For issues or questions:
1. Check CART_MIGRATION_SUMMARY.md for architecture details
2. Review console logs for error messages
3. Check server logs (`[CART-PROXY]` prefix)
4. Verify HCL Commerce connection via VPN
5. Review this checklist for your specific issue
