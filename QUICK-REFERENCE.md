# Testing Quick Reference Card

Print or bookmark this page for quick access while testing.

---

## 🟢 QUICK START (Copy-Paste These)

### Test 1: Create Guest Session
```javascript
import { createHclGuestSession } from '/scripts/hcl-commerce-api.js';
await createHclGuestSession();
```
✅ Look for: `[HCL] Guest session created successfully`

---

### Test 2: Add Product to Cart
```javascript
import { addToHclCart } from '/scripts/hcl-commerce-api.js';
await addToHclCart('CLA022_220601', 1);
```
✅ Look for: `[HCL] Product added to cart successfully`

---

### Test 3: View Cart
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';
const cart = await getHclCart();
console.log(cart);
```
✅ Look for: Cart object with `items` array and `cartTotals`

---

## 🔴 COMMON ERRORS & FIXES

| Error | Cause | Fix |
|-------|-------|-----|
| CORS blocked | Domain not whitelisted | Contact HCL team |
| 403 Forbidden | Token expired | `HclSession.clear();` then create new session |
| 404 Not Found | Wrong endpoint | Verify `20.40.52.251` is correct |
| Import failed | Wrong path | Use `/scripts/hcl-commerce-api.js` |
| Product not found | Invalid SKU | Use correct part number format |

---

## 📊 TESTING CHECKLIST

Phase 1: Session Management
- [ ] Session created: `true`
- [ ] Token exists: `getToken()` shows string
- [ ] No CORS errors

Phase 2: Add to Cart
- [ ] Response has `orderId`
- [ ] Response has `orderItemId`
- [ ] Status 200 OK in Network

Phase 3: Get Cart
- [ ] Cart has `items` array
- [ ] Cart has `cartTotals` object
- [ ] Total price is correct

Phase 4: PDP Button
- [ ] Button found in DOM
- [ ] Click works
- [ ] Console shows `[HCL]` logs

Phase 5: Mini-Cart
- [ ] Visible on page
- [ ] Updates on add
- [ ] Shows correct count

---

## 🛠️ DEBUGGING COMMANDS

### Check Session
```javascript
import { HclSession } from '/scripts/hcl-commerce-api.js';
console.log({
  hasSession: HclSession.hasValidSession(),
  isGuest: HclSession.isGuest(),
  token: HclSession.getToken()?.substring(0, 20) + '...',
  orderId: HclSession.getOrderId()
});
```

### Check Cart Status
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';
const cart = await getHclCart();
console.log(`Items: ${cart.items.length} | Total: $${cart.cartTotals.total}`);
```

### Clear Everything (Start Fresh)
```javascript
import { HclSession } from '/scripts/hcl-commerce-api.js';
HclSession.clear();
sessionStorage.clear();
console.log('✓ Everything cleared - refresh page to reload');
```

### Listen for All Events
```javascript
['itemAdded', 'itemRemoved', 'error', 'cartCleared']
  .forEach(e => document.addEventListener(`hcl:${e}`, 
    (ev) => console.log(`✓ ${e}:`, ev.detail)
  ));
```

---

## 📍 FILE LOCATIONS

| File | Purpose |
|------|---------|
| `scripts/hcl-commerce-api.js` | Core API wrapper |
| `scripts/hcl-pdp-integration.js` | PDP button override |
| `scripts/hcl-plp-integration.js` | PLP add-to-cart |
| `scripts/hcl-mini-cart-integration.js` | Mini-cart display |
| `scripts/initializers/hcl-cart.js` | Main initializer |

---

## 🌐 HCL ENDPOINTS

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Create Session | `/guestidentity` | POST |
| Add to Cart | `/cart` | POST |
| Get Cart | `/cart/@self` | GET |
| Remove Item | `/cart/@self/orderitem/{id}` | DELETE |
| Update Qty | `/cart/@self/orderitem/{id}` | PUT |

**Base URL:** `https://20.40.52.251/wcs/resources/store/715842834`

---

## 🔑 SESSION STORAGE KEYS

| Key | Contains |
|-----|----------|
| `hcl_wctoken` | Auth token |
| `hcl_wctrustedtoken` | Trusted token |
| `hcl_orderid` | Current order ID |
| `hcl_usertype` | `guest` or `authenticated` |
| `hcl_userid` | User ID (if logged in) |

---

## 📱 BROWSER DEVTOOLS

### Network Tab
1. Filter by: `20.40.52.251`
2. Check Status: Should be 200
3. Check Headers: Contains `WCToken`
4. Check Response: Has `orderId`, `orderItem`

### Console Tab
1. Look for `[HCL]` prefix logs
2. Check for red errors ❌
3. Check for yellow warnings ⚠️
4. Clear logs: `console.clear()`

---

## ✅ SUCCESS = When You See This

```
✓ Session created (no CORS error)
✓ [HCL] logs in console
✓ 200 OK in Network tab
✓ Cart data returned
✓ Items show in cart
✓ Button works on PDP
✓ Mini-cart updates automatically
```

---

## ❌ FAILURE = When You See This

```
✗ CORS error in console
✗ 403 Forbidden
✗ 404 Not Found
✗ Import error
✗ null/undefined responses
✗ Network errors
✗ SSL certificate warnings (block request)
```

---

## 🎯 TESTING WORKFLOW

1. **Start Session** → See `[HCL] Guest session created`
2. **Add Product** → See `success: true` in response
3. **Get Cart** → See items in `cart.items[]`
4. **Test PDP** → Click button, see logs
5. **Test Mini-Cart** → Add product, watch update

---

## 🔗 DOCUMENTATION LINKS

- **Full Testing Guide:** `TESTING-GUIDE.md`
- **Visual Diagrams:** `TESTING-VISUAL-GUIDE.md`
- **Console Commands:** `CONSOLE-COMMANDS.md`
- **API Reference:** `HCL-API-QUICK-REF.md`
- **Architecture:** `HCL-INTEGRATION-GUIDE.md`

---

## 💬 NEED HELP?

1. Check error in console
2. Look up error in "COMMON ERRORS" table above
3. Try suggested fix
4. If still stuck, check Network tab
5. Report with: Error message + Screenshot + Status code

---

**You're all set! Start with Test 1 and work your way through. 🚀**
