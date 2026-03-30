# HCL Commerce Integration - Getting Started Checklist

## Pre-Flight Check (Before Testing)

### ✅ Prerequisites
- [ ] HCL Commerce instance is running and accessible
- [ ] HCL API host: `20.40.52.251` is reachable from your network
- [ ] HCL Store ID: `715842834` is correct
- [ ] You have Postman or similar tool to test APIs

### ✅ Network & CORS Setup
- [ ] Contact HCL team and ask to whitelist your EDS domain
- [ ] EDS domain example: `https://main--aco-boilerplate-starter--lakhwaninitesh.aem.page`
- [ ] Ask HCL to add domain to CORS allowed origins
- [ ] Test CORS headers with curl or Postman

### ✅ SSL/Certificate Setup
- [ ] If HCL uses self-signed cert, accept the warning in browser
- [ ] Or ask HCL team for proper staging certificate
- [ ] In browser dev tools, check Network tab for 200 responses (not 3xx or 5xx)

### ✅ Code Files Verified
- [ ] `scripts/hcl-commerce-api.js` exists (700+ lines)
- [ ] `scripts/hcl-pdp-integration.js` exists (350+ lines)
- [ ] `scripts/hcl-plp-integration.js` exists (200+ lines)
- [ ] `scripts/hcl-mini-cart-integration.js` exists (250+ lines)
- [ ] `scripts/initializers/hcl-cart.js` exists
- [ ] Documentation files exist:
  - [ ] `HCL-INTEGRATION-GUIDE.md`
  - [ ] `HCL-API-QUICK-REF.md`
  - [ ] `IMPLEMENTATION-SUMMARY.md`

## Step 1: Test HCL APIs with Postman

### Create Guest Session
1. Open Postman
2. Create new request:
   - Method: `POST`
   - URL: `https://20.40.52.251/wcs/resources/store/715842834/guestidentity?langId=1`
   - Headers: `Content-Type: application/json`
   - Body: `{}` (empty)
3. Click "Send"
4. You should get back:
   ```json
   {
     "WCToken": "...",
     "WCTrustedToken": "..."
   }
   ```
5. ✅ Copy both tokens - you'll need them for next steps

### Add Product to Cart
1. Create new request:
   - Method: `POST`
   - URL: `https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1`
   - Headers:
     - `Content-Type: application/json`
     - `WCToken: <paste token from above>`
     - `WCTrustedToken: <paste trusted token from above>`
   - Body:
     ```json
     {
       "orderId": ".",
       "x_calculateOrder": "0",
       "orderItem": [
         {
           "quantity": "1",
           "partNumber": "CLA022_220601"
         }
       ],
       "x_inventoryValidation": true
     }
     ```
2. Click "Send"
3. You should get back an order with items
4. ✅ Note the `orderId` and `orderItem[0].orderItemId` for later

### Get Cart
1. Create new request:
   - Method: `GET`
   - URL: `https://20.40.52.251/wcs/resources/store/715842834/cart/@self?langId=1`
   - Headers:
     - `WCToken: <token from step 1>`
     - `WCTrustedToken: <trusted token from step 1>`
2. Click "Send"
3. You should see full cart with items, totals, payment info
4. ✅ Verify the product you added appears in `orderItem[]`

## Step 2: Test in Browser Console

### Initialize and Test Locally

1. Open your EDS storefront in browser
2. Open DevTools (F12) → Console
3. Run these commands:

```javascript
// Import the module
import { createHclGuestSession, addToHclCart, getHclCart } from '/scripts/hcl-commerce-api.js';

// Create guest session
await createHclGuestSession();
// Should see: "[HCL] Guest session created successfully"

// Add product to cart
const result = await addToHclCart('CLA022_220601', 1);
console.log(result);
// Should see: { success: true, orderId: "...", orderItemId: "..." }

// Get cart
const cart = await getHclCart();
console.log(cart);
// Should see cart with items and totals
```

### ✅ Expected Output
- No CORS errors in Console
- No 403/405/500 errors in Network tab
- Cart data shows items with prices
- Tokens stored in sessionStorage

## Step 3: Test PDP Integration

### 1. Navigate to a Product Details Page
- Go to any PDP on your storefront
- Example: `/products/product-name/SKU`

### 2. Test Add to Cart Button
1. Open DevTools Console
2. Look for "Add to Cart" button
3. Click it
4. In Console, you should see:
   - `[HCL] Creating guest session...`
   - `[HCL] Product added to cart: { orderId, orderItemId }`
   - `[HCL Event] itemAdded: {...}`

### 3. Verify Success
- [ ] Button changes text to "✓ Added to Cart"
- [ ] Button is disabled during operation
- [ ] No errors in Console
- [ ] No errors in Network tab

### 4. Check Mini-Cart
- [ ] Item count badge updates (if implemented)
- [ ] Mini-cart shows new item (if implemented)

## Step 4: Test PLP Integration

### 1. Navigate to a Product Listing Page
- Go to any PLP on your storefront
- Example: `/products`

### 2. Test Add to Cart on Multiple Products
1. Click "Add to Cart" on first product
2. Verify it succeeds
3. Click "Add to Cart" on another product
4. Verify both appear in cart

### 3. Check Console Logs
- Look for `[HCL PLP]` prefix logs
- Should see one log per product added
- No errors

## Step 5: Test Mini-Cart Integration

### 1. Click Mini-Cart Icon
- Should see items you added
- [ ] Item count shows correct number
- [ ] Grand total displays correctly
- [ ] Product names visible

### 2. Verify Real-Time Updates
1. Add product from PDP/PLP
2. Watch mini-cart update automatically
3. Remove item from mini-cart
4. Watch count decrease

### 3. Check Responsive Display
- [ ] Mini-cart renders on desktop
- [ ] Mini-cart renders on tablet
- [ ] Mini-cart renders on mobile

## Step 6: Test Guest Checkout Flow

### Full User Journey
1. ✅ Clear browser storage (`sessionStorage.clear()`)
2. ✅ Navigate to PDP
3. ✅ Click "Add to Cart"
   - Should auto-create guest session
   - Product added
4. ✅ Check mini-cart
   - Shows 1 item
5. ✅ Navigate to cart page
   - Shows items with prices
6. ✅ Click remove item
   - Item disappears
   - Cart updates
7. ✅ Add product again
   - Reuses same session (not creating new)
8. ✅ Proceed to checkout (if implemented)

## Step 7: Test Error Cases

### Session Expired (403 Error)
1. Add product successfully
2. Clear `hcl_wctoken` from sessionStorage
3. Add another product
4. Should auto-create new session and retry
5. Second product should be added

### Invalid Part Number
1. Manually trigger add to cart with invalid SKU:
   ```javascript
   await addToHclCart('INVALID_SKU_123456', 1);
   ```
2. Should see error in Console
3. Should see error message in UI

### Network Error
1. Add product while online
2. Go offline (Dev Tools Network → Offline)
3. Try to add another product
4. Should show network error message
5. Go online and retry
6. Should work

## Troubleshooting

### CORS Errors
```
Access to XMLHttpRequest at 'https://20.40.52.251/...' from origin
'https://main--...' has been blocked by CORS policy
```
**Solution:** Contact HCL team to whitelist your EDS domain

### 403 Forbidden
```
Failed to add to cart: 403 Forbidden
```
**Solution:** Session expired, auto-refresh should handle it, try again

### SSL Certificate Error
```
NET::ERR_CERT_AUTHORITY_INVALID
```
**Solution:** Accept cert warning in browser or request proper staging cert

### Part Number Not Found
```
Product not found or out of stock
```
**Solution:** Verify correct part number with HCL team

### Selector Not Working
```
[HCL PDP] Could not find add-to-cart button in PDP
```
**Solution:** Update selectors in code to match your HTML structure:
```javascript
// In hcl-pdp-integration.js, update selectors
const addToCartButton = pdpBlock.querySelector(
  'button[class*="your-button-class"]'  // Change this
);
```

## Success Criteria

✅ All tests should pass:
- [ ] Postman: Guest session creation works
- [ ] Postman: Add to cart works
- [ ] Postman: Get cart works
- [ ] Browser: No CORS errors
- [ ] Browser: No SSL errors
- [ ] PDP: Add to cart button works
- [ ] PLP: Add to cart on multiple products works
- [ ] Mini-cart: Updates on item add/remove
- [ ] Guest flow: End-to-end journey complete
- [ ] Error cases: Handled gracefully
- [ ] Console: Clean logs with [HCL] prefixes
- [ ] No critical errors or warnings

## Next Steps After Testing

If all tests pass:
1. ✅ Commit changes to git
2. ✅ Document any selector changes needed
3. ✅ Create test report
4. ✅ Schedule demo for stakeholders
5. ✅ Plan Phase 5 refinements

If issues found:
1. 📝 Document error details
2. 📝 Check HCL API docs for fixes
3. 📝 Verify HCL team configuration
4. 📝 Update selectors if needed
5. 🔄 Retest

---

**Last Updated:** March 30, 2026  
**Status:** Ready for Testing  
**Estimated Time:** 2-3 hours for full test cycle
