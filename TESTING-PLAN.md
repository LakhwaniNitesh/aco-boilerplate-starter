# Testing Plan - Token Authentication Fix

## 🎯 Objective

Verify that cart display now works end-to-end by ensuring both WCToken and WCTrustedToken are sent to HCL Commerce.

---

## 📋 Pre-Test Checklist

- [ ] Backend server running (`npm run dev:backend`)
- [ ] Frontend server running (`npm run dev:frontend`)
- [ ] Browser DevTools Console open
- [ ] Browser DevTools Network tab open
- [ ] Cache cleared (or incognito window)

---

## 🧪 Test 1: Token Storage After Login

### Steps:

1. Navigate to `/account` or similar login page
2. Log in with HCL credentials
3. Open DevTools → Console
4. Run: `JSON.parse(sessionStorage.getItem('hcl_auth'))`

### Expected Output:

```javascript
{
  token: "1007002%2Cg%2B7MAaU%2Br7bcARUp...",        // accessToken present
  trustedToken: "1007002%2Ch6%2B%2FnM4gMM0r...",     // trustedToken present
  userId: "1007002",
  sessionCookies: { JSESSIONID: "...", WC_PERSISTENT: "..." }
}
```

### ✅ Pass Criteria:

- Both `token` and `trustedToken` are present
- Both are non-empty strings
- Both contain user ID "1007002"

### ❌ Fail Criteria:

- Missing `trustedToken` key
- `trustedToken` is null or undefined
- Either token is empty string

---

## 🧪 Test 2: Mini-Cart Initial Load

### Steps:

1. After login, stay on product page
2. Watch Console for messages
3. Note what appears

### Expected Console Output:

```
[MINI-CART] Found token in hcl_auth
[MINI-CART] Found trustedToken in hcl_auth
[MINI-CART] syncCartFromHCL - token available? true
[MINI-CART] syncCartFromHCL - trustedToken available? true
[MINI-CART] Syncing cart from HCL with both tokens...
[CART-STATE] Fetching cart from HCL via backend proxy with both tokens...
[CART-PROXY] Fetching cart from HCL with both tokens...
[CART-PROXY] ✓ Fetched cart. Items: [count], Total: $[amount]
```

### ✅ Pass Criteria:

- Both tokens found and logged
- Both tokens show as available (true)
- Cart fetch succeeds with items count and total
- NO 401 errors in logs

### ❌ Fail Criteria:

- "Missing tokens" message
- "trustedToken available? false"
- 401 error appears
- "ERR_SECURE_TOKEN_NOT_IN_HTTPS" in logs

---

## 🧪 Test 3: Network Request Validation

### Steps:

1. Open DevTools → Network tab
2. After login, look for GET request to `/api/hcl/cart`
3. Click the request to inspect it

### Expected Request:

```
URL: http://localhost:3000/api/hcl/cart?accessToken=1007002%2C...&trustedToken=1007002%2C...
Method: GET
Status: 200 OK
```

### Expected Response:

```json
{
  "success": true,
  "cart": {
    "cartId": "764613",
    "items": [
      {
        "partNumber": "CLA022_220101",
        "sku": "CLA022_220101",
        "quantity": 5,
        "price": 400,
        "name": "Budget Laptop",
        "orderItemId": "6560096"
      }
      // ... more items ...
    ],
    "total": 4362.98
  }
}
```

### ✅ Pass Criteria:

- Status: 200 OK (not 401)
- Both `accessToken` and `trustedToken` in query params
- Response contains `items` array with items
- Response contains `total` with numeric value

### ❌ Fail Criteria:

- Status: 401 Unauthorized
- Missing `trustedToken` in query
- Only `accessToken` in query
- Response shows 0 items
- Response shows total: 0

---

## 🧪 Test 4: Add to Cart and Display Update

### Steps:

1. Navigate to product detail page
2. Set quantity to desired amount
3. Click "Add to Cart"
4. Watch Console output
5. Check mini-cart badge in header

### Expected Console Output:

```
[PDP] Add to cart response: {success: true, message: '...', cart: {...}}
[CART-STATE] Updating from HCL Commerce: {cartId: '764613', items: [...], total: ...}
[MINI-CART] Received cart state update: {cartId: '764613', items: [...], total: ...}
[MINI-CART] updateDisplay() called
[MINI-CART] Updating display - items: [...] count: [N] total: $[amount]
```

### Expected Visual:

- Mini-cart badge shows number (e.g., "8" or "9" if adding to existing)
- Mini-cart drawer can be opened
- Shows list of items with quantities and prices
- Shows total at bottom

### ✅ Pass Criteria:

- No 401 errors in console
- Cart count increments (7 → 8)
- Mini-cart displays items
- Total updates correctly
- Both tokens shown as being used

### ❌ Fail Criteria:

- 401 error appears after add-to-cart
- Cart still shows 0 items
- Mini-cart empty message appears
- "Missing trustedToken" error

---

## 🧪 Test 5: Cart Page Display

### Steps:

1. Navigate to `/cart` page
2. Observe cart table
3. Check console for errors

### Expected:

- Cart page loads without errors
- Shows all items in table
- Each item shows:
  - Product name
  - Quantity
  - Unit price
  - Line total
- Cart subtotal matches HCL value
- No 401 or network errors

### ✅ Pass Criteria:

- All 8 items displayed
- Cart shows $4,362.98 (or $4,133.98 after discount)
- No errors in console
- Page loads in <2 seconds

### ❌ Fail Criteria:

- "Cart is empty" message
- Shows 0 items
- Total shows $0.00
- Network errors in console

---

## 🧪 Test 6: Multiple Add-to-Cart Operations

### Steps:

1. Start fresh cart
2. Add item A (quantity 1)
3. Add item B (quantity 2)
4. Go back and add same item A (quantity 2)
5. Check mini-cart after each operation

### Expected Behavior:

- After step 2: Mini-cart shows 1 item
- After step 3: Mini-cart shows 2 items
- After step 4: Mini-cart shows 3 items total (or quantity of A incremented)
- Each operation shows correct total

### ✅ Pass Criteria:

- Each add-to-cart succeeds without errors
- Mini-cart updates immediately
- Quantities accumulate correctly
- No 401 errors at any step

### ❌ Fail Criteria:

- 401 error on any add-to-cart
- Mini-cart doesn't update
- Incorrect quantities
- Cart total doesn't match expected

---

## 🧪 Test 7: Console Logging Validation

### Steps:

After each successful operation, check console for these specific logs:

### For Cart Fetch:

```
[MINI-CART] Found token in hcl_auth ✓
[MINI-CART] Found trustedToken in hcl_auth ✓
[CART-STATE] Fetching cart from HCL via backend proxy with both tokens... ✓
[CART-PROXY] Fetching cart from HCL with both tokens... ✓
```

### NOT these (old logs):

```
[MINI-CART] No token available, skipping HCL sync ✗
[CART-STATE] Fetching cart from HCL via backend proxy... ✗ (missing "with both tokens")
[MINI-CART] trustedToken available? false ✗
```

### ✅ Pass Criteria:

- All "with both tokens" messages appear
- No "missing tokens" messages
- No "available? false" messages

---

## 📊 Test Results Summary

| Test               | Status | Notes                              |
| ------------------ | ------ | ---------------------------------- |
| 1. Token Storage   | ✅/❌  | Both tokens in hcl_auth?           |
| 2. Mini-Cart Init  | ✅/❌  | Both found? Fetched with both?     |
| 3. Network Request | ✅/❌  | Both in query? Status 200?         |
| 4. Add to Cart     | ✅/❌  | Updates after add? No 401?         |
| 5. Cart Page       | ✅/❌  | All items shown? Correct total?    |
| 6. Multiple Adds   | ✅/❌  | Each succeeds? Quantities correct? |
| 7. Console Logs    | ✅/❌  | Correct messages? No errors?       |

---

## 🐛 Troubleshooting

### If Test 1 Fails (Missing trustedToken):

- **Cause**: Login endpoint not storing trustedToken
- **Fix**: Check `api/controllers/auth-controller.js` login response
- **Verify**: Login endpoint sets both `token` and `trustedToken` in response

### If Test 2 Fails (Token not found):

- **Cause**: Mini-cart not reading from sessionStorage
- **Fix**: Clear storage: `sessionStorage.clear()`
- **Retry**: Log in again
- **Verify**: Check hcl_auth structure with console

### If Test 3 Fails (Status 401):

- **Cause**: `trustedToken` not being sent to backend
- **Fix**: Verify `/api/hcl/cart` URL has both query params
- **Verify**: Backend receives both `accessToken` and `trustedToken`

### If Test 3 Fails (0 items in response):

- **Cause**: HCL returned empty cart (rare, but possible if no items exist)
- **Fix**: Try adding new item first via Test 4
- **Verify**: Check HCL account directly if items exist

### If Test 4 Fails (401 after add):

- **Cause**: Add-to-cart works, but fetch cart fails
- **Fix**: Verify both tokens still in storage after add
- **Verify**: Token hasn't expired
- **Check**: Session cookies still valid

### If Test 7 Fails (Wrong console messages):

- **Cause**: Code changes not deployed or cached
- **Fix**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- **Verify**: Network tab shows new JS files loaded

---

## 📱 Cross-Browser Testing

Test in:

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)
- [ ] Edge (if available)

---

## 🔄 Regression Testing

After fix is deployed, verify these still work:

- [ ] Login flow
- [ ] Token storage
- [ ] Cart display on subsequent visits
- [ ] Logout and re-login
- [ ] Add multiple items
- [ ] Remove items from cart
- [ ] Checkout flow

---

## 📝 Sign-Off

| Tester | Result    | Date | Notes |
| ------ | --------- | ---- | ----- |
|        | PASS/FAIL |      |       |

---

## 🚀 Success Criteria

Fix is considered **SUCCESSFUL** when:

✅ All 7 tests pass  
✅ Mini-cart shows items immediately after add-to-cart  
✅ Cart page displays all items with correct totals  
✅ No 401 errors in console or network  
✅ Both tokens shown as being sent in network requests  
✅ Console logs show "with both tokens" messages  
✅ Works on multiple browsers

---

## 📞 Support

If tests fail, check:

1. `TRUSTED-TOKEN-FIX.md` - Detailed explanation of fix
2. `CODE-CHANGES-SUMMARY.md` - Line-by-line code changes
3. Backend logs for `/api/hcl/cart` requests
4. HCL Commerce API response format matches expected

---

**Test Created**: 2026-04-09  
**Fix Version**: Token Authentication v1.0  
**Status**: Ready for Testing
