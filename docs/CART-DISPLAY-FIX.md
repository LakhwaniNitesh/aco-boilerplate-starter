# Cart Display Synchronization - Fix Summary

## Problem Statement

After successfully adding a product to cart (200 response from backend), the mini-cart and cart page were not displaying the added items.

**Evidence:**

- Add-to-cart endpoint returned: `{success: true, message: "Product added to cart", cart: {items: [...]}}`
- Success message displayed correctly
- BUT: Mini-cart showed 0 items
- BUT: Cart page (/cart) showed empty

## Root Cause Analysis

### Primary Issue: Token Retrieval in Mini-Cart

The `commerce-mini-cart.js` block was trying to get auth token from old keys:

```javascript
// BEFORE (Wrong):
sessionStorage.getItem("hcl-access-token") ||
  localStorage.getItem("hcl-access-token");
```

But the consolidated auth system stores tokens in:

```javascript
// AFTER (Correct):
const authData = JSON.parse(sessionStorage.getItem("hcl_auth"));
authData.token; // ← Correct location
```

This meant:

1. Mini-cart couldn't get access token on page load
2. `syncCartFromHCL()` failed silently (token was null)
3. Cart state wasn't pre-populated
4. When product was added, state updated but UI was already partially broken

### Secondary Issue: Missing Debug Logging

Couldn't trace whether:

- Token was found in sessionStorage
- fetchCartFromHCL was called
- updateDisplay was being triggered
- Items were actually in state but not rendered

## Solution Implemented

### 1. Fixed Token Retrieval in commerce-mini-cart.js (Lines 40-57)

```javascript
const getAccessToken = () => {
  try {
    // Try consolidated auth data first (PRIMARY SOURCE)
    const authData = sessionStorage.getItem("hcl_auth");
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.token) {
          console.log("[MINI-CART] Found token in hcl_auth");
          return parsed.token;
        }
      } catch (e) {
        console.warn("[MINI-CART] Could not parse hcl_auth:", e);
      }
    }
    // Fallback to direct keys (for backward compatibility)
    return (
      sessionStorage.getItem("hcl-access-token") ||
      localStorage.getItem("hcl-access-token")
    );
  } catch (e) {
    console.warn("[MINI-CART] Error getting access token:", e);
    return null;
  }
};
```

**Impact:**

- Mini-cart now retrieves token from correct location
- Can sync with HCL on page load if user is logged in
- Fallback maintains backward compatibility

### 2. Enhanced syncCartFromHCL() Debug Logging (Lines 59-72)

```javascript
const syncCartFromHCL = async () => {
  try {
    const token = getAccessToken();
    console.log("[MINI-CART] syncCartFromHCL - token available?", !!token);
    if (token) {
      console.log("[MINI-CART] Syncing cart from HCL with token...");
      const cart = await fetchCartFromHCL(token);
      console.log("[MINI-CART] fetchCartFromHCL returned:", cart);
    } else {
      console.log("[MINI-CART] No token available, skipping HCL sync on init");
    }
  } catch (error) {
    console.warn("[MINI-CART] Could not sync with HCL, ...", error.message);
  }
};
```

**Impact:**

- Can see if token found
- Can see if HCL fetch succeeded
- Can see what cart data returned
- Better debugging for "empty cart" issues

### 3. Enhanced product-details.js Add-to-Cart Fallback (Lines 315-344)

```javascript
// Update cart state from HCL response to sync mini-cart
if (result.cart) {
  const { updateCartState } =
    await import("../../scripts/simple-cart-state.js");
  updateCartState(result.cart);
  console.log("[PDP] ✓ Cart state updated from add-to-cart response");
} else {
  // Fallback: fetch full cart if not in response
  try {
    const { fetchCartFromHCL } =
      await import("../../scripts/simple-cart-state.js");
    const fullCart = await fetchCartFromHCL(accessToken);
    if (fullCart) {
      const { updateCartState: updateState } =
        await import("../../scripts/simple-cart-state.js");
      updateState(fullCart);
      console.log("[PDP] ✓ Cart state updated from fetch-cart fallback");
    }
  } catch (error) {
    console.warn("[PDP] Could not fetch cart:", error);
  }
}
```

**Impact:**

- Handles both cases: cart in response OR need to fetch separately
- Better error handling
- Fallback ensures cart displays even if response format changes

## How the Fix Works

### Flow After Fix:

```
1. User logs in
   └─> hclAuthAdapter stores: {token: "...", trustedToken: "...", expiry: ...}

2. User navigates to PDP (product page loads)
   └─> commerce-mini-cart.js initializes
       └─> getAccessToken() finds token in hcl_auth ✅
       └─> syncCartFromHCL() called
           └─> fetchCartFromHCL() fetches existing cart from HCL
           └─> updateCartState() updates in-memory state
           └─> listeners notified → mini-cart displays items

3. User clicks "Add to Cart"
   └─> product-details.js calls /api/hcl/cart/add ✅
   └─> Backend returns {success: true, cart: {...}}
   └─> updateCartState(result.cart) called ✅
   └─> updateCartState notifies all listeners
   └─> Mini-cart listener updateDisplay() called ✅
   └─> Mini-cart re-renders with new item count ✅

4. User navigates to /cart page
   └─> Cart page initializes
   └─> Calls fetchCartFromHCL(token)
   └─> updateCartState() updates state
   └─> Page renders all cart items ✅
```

### State Flow Diagram:

```
┌─────────────────────────────────────┐
│   sessionStorage.hcl_auth           │
│   {token, trustedToken, expiry}     │
└────────────┬────────────────────────┘
             │
             ├─→ commerce-mini-cart.js
             │   └─→ getAccessToken()
             │       └─→ fetchCartFromHCL(token)
             │           └─→ updateCartState()
             │               └─→ notifyListeners()
             │
             ├─→ product-details.js
             │   └─→ getAccessToken()
             │   └─→ addToCart()
             │       └─→ updateCartState(response.cart)
             │           └─→ notifyListeners()
             │
             └─→ cart/cart.js
                 └─→ fetchCartFromHCL(token)
                     └─→ updateCartState()
                         └─→ renderCartPage()
```

## Files Modified

### 1. `blocks/commerce-mini-cart/commerce-mini-cart.js`

- **Lines 40-57**: Enhanced getAccessToken() with consolidated auth support
- **Lines 59-72**: Enhanced syncCartFromHCL() with debug logging
- **No functional changes to listener system** (already working correctly)

### 2. `blocks/product-details/product-details.js`

- **Lines 315-344**: Enhanced add-to-cart response handling with fallback
- **Added comprehensive logging** for debugging
- **Added error handling** for missing cart data

### 3. `scripts/simple-cart-state.js`

- **No changes** - system was already correct!
- Confirmed:
  - `updateCartState()` properly notifies listeners
  - `subscribeToCart()` returns unsubscribe function
  - `fetchCartFromHCL()` properly fetches from backend

## Testing the Fix

### Quick Test:

1. Clear browser storage
2. Log in
3. Add product to cart
4. **Expected:** Mini-cart shows item count > 0, drawer shows product

### Verify with Console:

```javascript
// Check consolidated auth
JSON.parse(sessionStorage.getItem("hcl_auth"));
// Should show: {token: "...", trustedToken: "...", expiry: timestamp}

// Check if token valid
const auth = JSON.parse(sessionStorage.getItem("hcl_auth"));
Date.now() < auth.expiry; // Should be true

// Check cart state
localStorage.getItem("hcl_cart"); // May be empty (uses in-memory)
// Instead, look at console logs: [CART-STATE] Updated in memory: ...
```

## Why This Matters

### Before Fix:

```
Mini-cart initialized → Token lookup failed → sync skipped
→ Cart state empty → User adds product → State updated
→ Listener fires but UI renders from empty list → Shows nothing
```

### After Fix:

```
Mini-cart initialized → Token found in hcl_auth → sync succeeds
→ Cart pre-populated from HCL → User adds product
→ State updated → Listener fires → UI renders correctly ✅
```

## Performance Impact

- **Negligible**: Added console.log statements (debug info)
- **Positive**: Fallback fetch ensures cart always displays
- **Positive**: Token retrieval now checks correct location (faster)

## Backward Compatibility

- ✅ Old token locations still supported as fallback
- ✅ existing commerce-login.js unaffected
- ✅ hcl-commerce-auth.js still works
- ✅ Simple cart state system unchanged

## What's NOT Fixed (Out of Scope)

These would be separate issues if they exist:

1. **Cart persistence across tabs** - sessionStorage is tab-specific
2. **Multi-user scenarios** - design doesn't support shared carts
3. **Complex cart operations** (promos, discounts) - uses normalized format
4. **Cart sync on manual storage changes** - only syncs on updateCartState()

## Next Steps if Issues Persist

If mini-cart still shows empty after these fixes:

1. **Check auth token location**: Console → `JSON.parse(sessionStorage.hcl_auth)`
2. **Check token expiry**: Should be future timestamp, not past
3. **Check listener registration**: Look for `[MINI-CART] Listener added` log
4. **Check state updates**: Look for `[CART-STATE] Updating from HCL Commerce` log
5. **Check render**: Look for `[MINI-CART] updateDisplay() called` and items count

See `CART-DISPLAY-TEST.md` for comprehensive test plan.
