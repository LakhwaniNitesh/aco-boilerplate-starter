# Cart Display Fix - Test Plan

## Issue Fixed

Cart items not displaying in mini-cart after successful add-to-cart, despite backend returning 200 success.

## Root Cause

1. Mini-cart component wasn't receiving auth token properly from consolidated `hcl_auth` sessionStorage key
2. updateCartState() was being called but mini-cart getAccessToken() was looking in old keys
3. Missing debug logging to track state flow

## Changes Made

### 1. product-details.js (Lines 315-344)

**What Changed:** Enhanced add-to-cart response handling

- Added logging to show when cart state updated
- Added fallback to fetch full cart if not in response
- Better error handling

**Purpose:** Ensure cart state is properly updated after add-to-cart success

### 2. commerce-mini-cart.js - getAccessToken() (Lines 40-57)

**What Changed:** Updated token retrieval to check consolidated auth data first

```javascript
// Now tries:
// 1. sessionStorage.hcl_auth (primary - from consolidated auth system)
// 2. hcl-access-token (fallback - old keys)
```

**Purpose:** Get auth token for syncing cart with HCL on page load

### 3. commerce-mini-cart.js - syncCartFromHCL() (Lines 59-72)

**What Changed:** Enhanced debug logging

- Shows token availability
- Shows what fetchCartFromHCL returns
- Shows skip reason if no token

**Purpose:** Better visibility into why cart might not sync on page load

## Test Procedure

### Setup

1. Clear browser storage: DevTools → Application → Clear storage
2. Refresh page
3. Log in with valid HCL Commerce credentials

### Test Case 1: Add Single Product to Empty Cart

**Steps:**

1. Navigate to a product page (e.g., Budget Laptop)
2. Click "Add to Cart"
3. Verify success message appears

**Expected Results:**

```
Console logs should show:
[PDP] Retrieved from auth service: {hasAccessToken: true, hasTrustedToken: true}
[PDP] Making add-to-cart request to /api/hcl/cart/add
[PDP] Add to cart response: {success: true, message: "Product added to cart", cart: {items: [...], total: ...}}
[PDP] ✓ Cart state updated from add-to-cart response
[CART-STATE] Updating from HCL Commerce: {cartId: "...", items: [{...}], total: ...}
[CART-STATE] Updated in memory: 1 items, Total: $...
[MINI-CART] Received cart state update: {cartId: "...", items: [{...}], total: ...}
[MINI-CART] updateDisplay() called
[MINI-CART] Updating display - items: [...], count: 1, total: ...
```

**UI Verification:**

- ✅ Success message: "Product added to cart!"
- ✅ Mini-cart badge in header shows "1"
- ✅ Mini-cart drawer shows product name, quantity (×1), and price
- ✅ Mini-cart total shows correct price

### Test Case 2: Add Second Product

**Steps:**

1. Navigate to another product
2. Click "Add to Cart"
3. Check mini-cart

**Expected Results:**

- ✅ Mini-cart badge updates to "2"
- ✅ Both products listed in mini-cart
- ✅ Correct quantities shown
- ✅ Total updated

### Test Case 3: Cart Page Display

**Steps:**

1. Click "View Cart" in mini-cart drawer
2. Navigate to /cart page

**Expected Results:**

- ✅ All added products listed
- ✅ Quantities correct
- ✅ Prices correct
- ✅ Cart total calculated correctly
- ✅ Proceed to Checkout button visible

### Test Case 4: Token Expiry and Logout

**Steps:**

1. Add product to cart successfully
2. Wait 1 hour (or manually trigger logout)
3. Try to add another product

**Expected Results:**

- ✅ Redirect to login page
- ✅ After logging back in, cart still shows previous items
- ✅ Can add new items

## Debugging Tips

### If cart still shows empty:

**Check 1: Auth Token Available?**

```javascript
// In DevTools console:
JSON.parse(sessionStorage.getItem("hcl_auth"));
// Should show: {token: "...", trustedToken: "...", expiry: ...}
```

**Check 2: updateCartState Called?**

- Look for logs: `[CART-STATE] Updating from HCL Commerce:`
- If missing, check product-details.js lines 315-344

**Check 3: Mini-cart Listener Registered?**

- Look for logs: `[MINI-CART] Listener added, total listeners: 1`
- If missing, check commerce-mini-cart.js line 293

**Check 4: updateDisplay Called?**

- Look for logs: `[MINI-CART] updateDisplay() called`
- If missing, listener callback not firing

**Check 5: Items in State?**

- Look for logs: `[MINI-CART] Updating display - items: [...], count: ...`
- If count is 0, state not being updated

### Token Issues?

```javascript
// In DevTools:
sessionStorage.getItem("hcl_auth");
// Should show expiry in future:
// "expiry": 1775707360929 (milliseconds since epoch)
// Current time should be less than this

const auth = JSON.parse(sessionStorage.getItem("hcl_auth"));
new Date(auth.expiry).toLocaleString(); // When token expires
```

## Expected Console Output Flow

```
🔐 Login Flow:
[MINI-CART] Subscribing to simple cart state
[MINI-CART] Calling initial updateDisplay()
[MINI-CART] updateDisplay() called
[MINI-CART] Updating display - items: [], count: 0, total: 0
[MINI-CART] syncCartFromHCL - token available? true
[MINI-CART] Syncing cart from HCL with token...
[CART-STATE] Fetching cart from HCL via backend proxy...

📦 Add to Cart Flow:
[PDP] Add to cart response: {success: true, ...}
[PDP] ✓ Cart state updated from add-to-cart response
[CART-STATE] Updating from HCL Commerce: {items: [{name: "...", quantity: 1, price: ...}]}
[CART-STATE] Updated in memory: 1 items, Total: $...
[MINI-CART] Received cart state update: {items: [...]}
[MINI-CART] updateDisplay() called
[MINI-CART] Updating display - items: [...], count: 1, total: ...
✅ Mini-cart UI updated: badge shows "1", items displayed

🛒 Cart Page Flow:
[CART-STATE] Fetching cart from HCL via backend proxy...
[CART-STATE] Updated in memory: 1 items, Total: $...
Cart page displays items
```

## Success Criteria

All of the following must be true:

✅ After add-to-cart success message:

- Mini-cart badge shows count > 0
- Mini-cart drawer lists product(s)
- Product name, quantity, and price displayed

✅ On cart page (/cart):

- All added products listed
- Quantities and prices correct
- Cart total calculated

✅ Console logs show:

- updateCartState called with cart data
- Mini-cart listener receives update
- updateDisplay called and items shown

✅ After logout:

- Mini-cart clears
- Cart page shows empty

## Performance Notes

- Cart state updates should be near-instant (< 100ms)
- Mini-cart should re-render immediately
- No page reload needed
- Listener system is synchronous (no async lag)

## Known Limitations

1. On page load, if user is logged in but cart is empty on HCL, mini-cart will show empty (correct behavior)
2. If user clears cache while shopping, auth token lost (requires new login)
3. Multiple browser tabs don't sync (sessionStorage is tab-specific)
