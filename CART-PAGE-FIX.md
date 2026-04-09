# Cart Page Not Displaying Items - FIX

## Problem

- ✅ Mini-cart shows correct badge count (14 items)
- ✅ Mini-cart displays item list correctly
- ❌ Cart page (/cart) shows empty state: `{cartId: null, items: Array(0), total: 0}`
- ❌ Console log: `[CART] Loading cart page with HCL cart: {cartId: null, items: Array(0), total: 0}`

## Root Cause

The cart page component (`commerce-cart.js`) was **missing the `trustedToken` parameter** when calling `fetchCartFromHCL()`:

```javascript
// BROKEN - Only 1 token
const token = getAccessToken();
if (token) {
  hclCart = await fetchCartFromHCL(token); // ← Missing trustedToken
}
```

The backend requires **BOTH** tokens (WCToken + WCTrustedToken) for HTTPS security. Without the trusted token, the backend returns a 401 error, and the function returns empty cart.

## Solution

Updated `blocks/commerce-cart/commerce-cart.js` to:

1. **Add `getTrustedToken()` function** - Retrieves WCTrustedToken from storage
2. **Extract both tokens** - Get accessToken AND trustedToken
3. **Validate both present** - Only proceed if BOTH tokens exist
4. **Pass both to function** - `fetchCartFromHCL(token, trustedToken)`
5. **Enhanced logging** - Show which tokens are available/missing

### Code Changes

**File**: `blocks/commerce-cart/commerce-cart.js` (Lines 45-107)

**Before (BROKEN)**:

```javascript
// Fetch cart from HCL Commerce
let hclCart = { cartId: null, items: [], total: 0 };

try {
  const getAccessToken = () => {
    try {
      return (
        sessionStorage.getItem("hcl-access-token") ||
        localStorage.getItem("hcl-access-token")
      );
    } catch (e) {
      return null;
    }
  };

  const token = getAccessToken();
  if (token) {
    console.log("[CART] Syncing cart from HCL...");
    hclCart = await fetchCartFromHCL(token); // ← ONLY 1 TOKEN
  } else {
    console.warn("[CART] No authentication token found, cart will be empty");
  }
} catch (error) {
  console.error("[CART] Failed to fetch cart from HCL:", error.message);
  hclCart = getCartState();
}
```

**After (FIXED)**:

```javascript
// Fetch cart from HCL Commerce
let hclCart = { cartId: null, items: [], total: 0 };

try {
  const getAccessToken = () => {
    try {
      const authData = sessionStorage.getItem("hcl_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.token) {
            console.log("[CART] Found token in hcl_auth");
            return parsed.token;
          }
        } catch (e) {
          console.warn("[CART] Could not parse hcl_auth:", e);
        }
      }
      return (
        sessionStorage.getItem("hcl-access-token") ||
        localStorage.getItem("hcl-access-token")
      );
    } catch (e) {
      return null;
    }
  };

  const getTrustedToken = () => {
    // ← NEW FUNCTION
    try {
      const authData = sessionStorage.getItem("hcl_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.trustedToken) {
            console.log("[CART] Found trustedToken in hcl_auth");
            return parsed.trustedToken;
          }
        } catch (e) {
          console.warn("[CART] Could not parse hcl_auth:", e);
        }
      }
      return (
        sessionStorage.getItem("hcl-trusted-token") ||
        localStorage.getItem("hcl-trusted-token")
      );
    } catch (e) {
      return null;
    }
  };

  const token = getAccessToken();
  const trustedToken = getTrustedToken(); // ← GET BOTH

  if (token && trustedToken) {
    // ← VALIDATE BOTH
    console.log("[CART] Syncing cart from HCL with both tokens...");
    hclCart = await fetchCartFromHCL(token, trustedToken); // ← PASS BOTH
  } else {
    console.warn("[CART] Missing authentication tokens, cart will be empty");
    if (!token) console.log("[CART]   - No accessToken found");
    if (!trustedToken) console.log("[CART]   - No trustedToken found");
  }
} catch (error) {
  console.error("[CART] Failed to fetch cart from HCL:", error.message);
  hclCart = getCartState();
}
```

## Why This Works

The `fetchCartFromHCL()` function signature (in `simple-cart-state.js`) now requires:

```javascript
export async function fetchCartFromHCL(accessToken, trustedToken) {
  const response = await fetch(
    `/api/hcl/cart?accessToken=${encodeURIComponent(accessToken)}&trustedToken=${encodeURIComponent(trustedToken)}`,
  );
  // ...
}
```

Without **both** tokens, the backend returns empty data. Now the cart page will:

1. ✅ Retrieve both tokens from `sessionStorage.hcl_auth`
2. ✅ Validate both are present
3. ✅ Pass both to the backend
4. ✅ Receive the full cart with 14 items
5. ✅ Display items on cart page

## Expected Behavior After Fix

**Console logs will show**:

```
[CART] Found token in hcl_auth
[CART] Found trustedToken in hcl_auth
[CART] Syncing cart from HCL with both tokens...
[CART-STATE] Fetching cart from HCL via backend proxy with both tokens...
[CART-STATE] Updating from HCL Commerce: {cartId: '764613', items: Array(14), total: 7362.98}
[CART] Loading cart page with HCL cart: {cartId: '764613', items: Array(14), total: 7362.98}
```

**Cart page will display**:

- ✅ All 14 items with correct quantities and prices
- ✅ Order summary showing total: $7,362.98
- ✅ Remove buttons functional
- ✅ Quantity update functional
- ✅ Shipping estimate form
- ✅ Coupon form
- ✅ Gift cards section

## Testing Checklist

- [ ] Navigate to `/cart` page
- [ ] Verify console shows both tokens found
- [ ] Verify items display (14 items listed)
- [ ] Verify total shows $7,362.98
- [ ] Verify item quantities are correct (5, 5, 3, 3, 3, 3, 2, 1, 1, 1, 1, 1, 1, 1)
- [ ] Verify price per item matches HCL data
- [ ] Verify can remove items
- [ ] Verify can update quantities
- [ ] Verify no 401 errors in console or network tab
- [ ] Verify mini-cart still works after cart page load

## Files Modified

| File                                    | Change                                                                     | Lines  |
| --------------------------------------- | -------------------------------------------------------------------------- | ------ |
| `blocks/commerce-cart/commerce-cart.js` | Added `getTrustedToken()` function, updated cart fetch to pass both tokens | 45-107 |

## Related Fixes

This fix completes the two-token authentication chain:

- ✅ `api/utils/hcl-client.js` - HCL client passes both tokens to HTTP headers
- ✅ `api/controllers/hcl-cart-controller.js` - Backend validates and forwards both tokens
- ✅ `scripts/simple-cart-state.js` - State management accepts and sends both tokens
- ✅ `blocks/commerce-mini-cart/commerce-mini-cart.js` - Mini-cart retrieves and passes both tokens
- ✅ `blocks/commerce-cart/commerce-cart.js` - **Cart page now retrieves and passes both tokens** ← THIS FIX

## Verification

✅ **Syntax Check**: No errors found  
✅ **Logic Review**: Both tokens retrieved, validated, and passed  
✅ **Consistency**: Matches implementation in mini-cart component  
✅ **Fallbacks**: Includes fallback to direct storage keys

---

**Date Fixed**: 2026-04-09  
**Status**: ✅ Complete and ready for testing
