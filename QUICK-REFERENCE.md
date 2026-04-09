# Quick Reference Card - Cart Display Fix

## 🎯 What Was Fixed

**Problem**: Mini-cart and cart page showing empty after successful add-to-cart  
**Root Cause**: Mini-cart looking for auth token in wrong sessionStorage location  
**Solution**: Updated token retrieval to use consolidated `hcl_auth` key

## ✅ Changes Made (2 Files)

### 1. `blocks/commerce-mini-cart/commerce-mini-cart.js`

**Location**: Lines 40-72

**Change 1: getAccessToken() (Lines 40-57)**

```javascript
// BEFORE: Looked in old keys only
sessionStorage.getItem("hcl-access-token");

// AFTER: Looks in consolidated auth first
const authData = sessionStorage.getItem("hcl_auth");
if (authData) {
  const parsed = JSON.parse(authData);
  if (parsed.token) return parsed.token;
}
// Then fallback to old keys for backward compatibility
```

**Change 2: syncCartFromHCL() (Lines 59-72)**

```javascript
// BEFORE: Silent failure if no token
// AFTER: Detailed logging for debugging
console.log("[MINI-CART] syncCartFromHCL - token available?", !!token);
console.log("[MINI-CART] fetchCartFromHCL returned:", cart);
```

**Why**: Lets mini-cart find auth token and sync with HCL on page load

---

### 2. `blocks/product-details/product-details.js`

**Location**: Lines 315-344

**Change: Enhanced error handling after add-to-cart**

```javascript
// BEFORE: Only called updateCartState if response had cart
if (result.cart) {
  updateCartState(result.cart);
}

// AFTER: Added fallback to fetch full cart
if (result.cart) {
  updateCartState(result.cart);
} else {
  // Fallback: fetch full cart if not in response
  const fullCart = await fetchCartFromHCL(accessToken);
  updateCartState(fullCart);
}
```

**Why**: Ensures cart always displays even if response format changes

---

## 🧪 How to Test

### Quick Test (2 minutes)

1. Clear browser storage (DevTools → Application → Clear storage)
2. Log in with HCL credentials
3. Add product to cart
4. **Check**: Mini-cart shows item count and product details

### Console Verification

```javascript
// In browser DevTools console:

// 1. Check auth token location
JSON.parse(sessionStorage.getItem("hcl_auth")).token;
// Should return: "1007002%2C7KRQkAz5zsMeylITj%2B..."

// 2. Check expiry is in future
const auth = JSON.parse(sessionStorage.getItem("hcl_auth"));
Date.now() < auth.expiry;
// Should return: true

// 3. Check cart state
sessionStorage.getItem("hcl_cart");
// OR look at console logs for: [CART-STATE] Updated in memory
```

### Expected Console Logs

```
✅ Add to cart succeeds:
[PDP] ✓ Cart state updated from add-to-cart response

✅ Mini-cart updates:
[MINI-CART] Received cart state update: {items: [...], count: 1}
[MINI-CART] Updating display - items: [...], count: 1, total: $29.99
```

---

## 📊 Auth Token Format

```javascript
sessionStorage.hcl_auth = {
  "token": "1007002%2C7KRQkAz5zsMeylITj%2B...",     // Main token
  "trustedToken": "1007002%2CZH6dm4Lu5ImLok%2BrZA...",  // Trusted token
  "userId": "1007002",
  "expiresIn": 3600,                                 // Seconds
  "expiry": 1775707360929,                          // Milliseconds
  "sessionCookies": {...}
}
```

**Key Point**: Both `token` AND `trustedToken` required for cart operations!

---

## 🔍 Troubleshooting

### If mini-cart still shows empty:

| Check                  | Command                                                   | Expected              |
| ---------------------- | --------------------------------------------------------- | --------------------- |
| **Token exists?**      | `JSON.parse(sessionStorage.hcl_auth).token`               | Non-empty string      |
| **Token not expired?** | `Date.now() < JSON.parse(sessionStorage.hcl_auth).expiry` | `true`                |
| **State updated?**     | Look for: `[CART-STATE] Updating from HCL Commerce`       | Log appears           |
| **Listener fired?**    | Look for: `[MINI-CART] Received cart state update`        | Log appears           |
| **Display rendered?**  | Look for: `[MINI-CART] updateDisplay() called`            | Log shows items count |

---

## 🚀 Implementation Checklist

- [x] Fixed token retrieval in commerce-mini-cart.js
- [x] Enhanced logging for debugging
- [x] Added fallback cart fetch in product-details.js
- [x] Verified simple-cart-state.js listener system works
- [x] Tested add-to-cart flow end-to-end
- [x] Verified mini-cart displays items
- [ ] Test on production HCL Commerce instance
- [ ] Test with various product types and quantities
- [ ] Test token expiry after 1 hour
- [ ] Test multi-browser scenarios

---

## 📚 Key Files Reference

| File                                              | Purpose                    | Status     |
| ------------------------------------------------- | -------------------------- | ---------- |
| `blocks/commerce-mini-cart/commerce-mini-cart.js` | Mini-cart UI component     | ✅ Fixed   |
| `blocks/product-details/product-details.js`       | Product page + add-to-cart | ✅ Fixed   |
| `scripts/simple-cart-state.js`                    | Cart state management      | ✅ Working |
| `blocks/header/hclAuthAdapter.js`                 | Auth storage               | ✅ Working |
| `scripts/hcl-commerce-auth.js`                    | Auth service               | ✅ Working |
| `api/controllers/hcl-cart-controller.js`          | Backend proxy              | ✅ Working |

---

## 🔗 Flow Summary

```
Login
  ↓ (stores to hcl_auth)
Navigate to product
  ↓ (mini-cart reads from hcl_auth, syncs with HCL)
Mini-cart initialized (ready)
  ↓
Click "Add to Cart"
  ↓ (product-details reads token from hcl_auth)
POST /api/hcl/cart/add
  ↓ (backend returns cart)
updateCartState()
  ↓ (notifies listeners)
Mini-cart updateDisplay()
  ↓ (re-renders UI)
✅ Items visible in mini-cart
```

---

## 💡 Key Concepts

### Two-Token Authentication

- **WCToken**: Main auth token (validates user)
- **WCTrustedToken**: Trusted operations token (allows cart operations)
- **Both required**: Sending only one causes 401 error

### Token Expiry

- **expiresIn**: Duration in seconds (usually 3600 = 1 hour)
- **expiry**: Absolute timestamp when token expires
- **Checked before use**: Prevents use of expired tokens

### Cart State Flow

1. **updateCartState()** called with new cart data
2. **Notifies all listeners** (mini-cart, cart page, etc.)
3. **Each listener calls updateDisplay()**
4. **UI re-renders** with new items

---

## 📞 Support

**Debugging**: Always check console logs first - they show complete flow  
**Token issues**: Verify with `JSON.parse(sessionStorage.hcl_auth)`  
**Cart issues**: Look for `[CART-STATE]` logs to see state updates  
**UI issues**: Check `[MINI-CART]` logs to see display updates

---

## ✨ Success Indicators

After fix, you should see:

- ✅ Mini-cart badge shows item count
- ✅ Mini-cart drawer lists products with prices
- ✅ Cart page displays all items
- ✅ Console shows `[MINI-CART] Received cart state update`
- ✅ No 401 errors in network tab
- ✅ Token expiry managed automatically

---

## 📄 Related Documentation

- `IMPLEMENTATION-COMPLETE.md` - Full implementation details
- `CART-DISPLAY-FIX.md` - Technical deep dive
- `CART-DISPLAY-TEST.md` - Comprehensive test plan
- `VISUAL-GUIDE.md` - Flow diagrams and architecture

---

**Last Updated**: This session  
**Status**: ✅ Cart Display Fix Complete  
**Next Phase**: Production testing with real HCL instance
