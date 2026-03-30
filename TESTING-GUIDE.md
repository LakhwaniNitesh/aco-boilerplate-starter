# HCL Commerce Integration - Practical Testing Guide

**Current Status:** Your local dev server is running with `npm start`  
**Branch:** hcl-cart  
**Files Created:** 5 code modules + 4 documentation files

---

## Quick Start (5 minutes)

### Step 1: Verify Server is Running
Check if your EDS server is running:
```powershell
# Open your browser and go to:
http://localhost:3000
# or
http://localhost:5173
```

You should see your AEM storefront homepage. If you see a blank page or error, run:
```powershell
npm start
```

### Step 2: Open Browser Console
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. You're ready to test!

---

## Test Plan (30 minutes total)

### Phase 1: Verify Files Exist (2 minutes)

**In your IDE, check these files exist:**
- ✅ `scripts/hcl-commerce-api.js` (700+ lines)
- ✅ `scripts/hcl-pdp-integration.js` (350+ lines)
- ✅ `scripts/hcl-plp-integration.js` (200+ lines)
- ✅ `scripts/hcl-mini-cart-integration.js` (250+ lines)
- ✅ `scripts/initializers/hcl-cart.js` (40 lines)

**If any files are missing, they need to be created. Let me know!**

---

### Phase 2: Test Session Management (5 minutes)

In your browser console, run these commands one by one:

#### Test 2.1: Import the module
```javascript
import { HclSession, createHclGuestSession } from '/scripts/hcl-commerce-api.js';
```

**Expected Output:** No error. If you see an error like "Failed to import", it means the file path is wrong.

#### Test 2.2: Check if session exists
```javascript
HclSession.hasValidSession()
```

**Expected Result:** `false` (because we haven't created a session yet)

#### Test 2.3: Create a guest session
```javascript
await createHclGuestSession();
```

**Expected Output:**
```
[HCL] Creating guest session...
[HCL] Guest session created successfully
```

**Check browser console for errors:**
- ❌ **CORS error?** → HCL team needs to whitelist your domain
- ❌ **SSL cert error?** → Accept the warning in browser security settings
- ❌ **404/500 error?** → HCL API endpoint is incorrect or server is down

#### Test 2.4: Verify session is stored
```javascript
HclSession.hasValidSession()
HclSession.isGuest()
HclSession.getToken()  // Should show a long token string
```

**Expected Results:**
- `hasValidSession()` → `true`
- `isGuest()` → `true`
- `getToken()` → A string like `"AAC2345..."`

**If you see `null` or `false`, the session wasn't stored correctly.**

---

### Phase 3: Test Add to Cart (10 minutes)

#### Test 3.1: Add a product (guest checkout)
```javascript
import { addToHclCart } from '/scripts/hcl-commerce-api.js';

// Replace 'CLA022_220601' with an actual product part number from HCL
const result = await addToHclCart('CLA022_220601', 1);
console.log(result);
```

**Expected Output:**
```javascript
{
  success: true,
  orderId: "...",
  orderItemId: "123456",
  message: "Product added to cart successfully"
}
```

**Possible Errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `Part number not found` | SKU doesn't exist | Use correct HCL part number |
| `403 Forbidden` | Token expired | Run `createHclGuestSession()` again |
| `CORS error` | Domain not whitelisted | Contact HCL team |
| `Network error` | HCL server down | Verify endpoint is reachable |

#### Test 3.2: Verify in Network Tab
1. Open **Network** tab in DevTools
2. Repeat test 3.1
3. You should see a POST request to:
   - `https://20.40.52.251/wcs/resources/store/715842834/cart`
4. Check Response:
   - Status should be **200 OK**
   - Body should contain `orderId` and `orderItem` array

---

### Phase 4: Test Get Cart (5 minutes)

#### Test 4.1: Fetch current cart
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';

const cart = await getHclCart();
console.log(cart);
```

**Expected Output:**
```javascript
{
  orderId: "12345",
  items: [
    {
      orderItemId: "1",
      partNumber: "CLA022_220601",
      description: "Product Name",
      quantity: 1,
      unitPrice: 99.99,
      totalPrice: 99.99
    }
  ],
  cartTotals: {
    subtotal: 99.99,
    shipping: 0,
    tax: 0,
    total: 99.99,
    currency: "USD"
  }
}
```

#### Test 4.2: Verify the product is there
```javascript
const cart = await getHclCart();
console.log(cart.items.length);  // Should be 1 or more
console.log(cart.cartTotals.total);  // Should show total price
```

---

### Phase 5: Test on a Real PDP (10 minutes)

#### Step 1: Navigate to a Product Details Page
1. Click on any product to go to its PDP
2. Look for an "Add to Cart" button

#### Step 2: Open Console and Watch for Logs
1. Press F12 to open DevTools
2. Go to Console tab
3. Look for logs starting with `[HCL]`

#### Step 3: Click "Add to Cart" Button
1. Click the button on the PDP
2. Watch Console for messages:
   - `[HCL] Creating guest session...` ✅
   - `[HCL] Product added to cart successfully` ✅
   - OR error message ❌

#### Step 4: Check for Errors in Network Tab
1. Go to Network tab
2. Find the POST request to `20.40.52.251/wcs/resources/store/...`
3. Check Status: Should be **200 OK** (not 4xx or 5xx)

#### Step 5: Visual Feedback
- Button should show "✓ Added to Cart" temporarily
- Or show an error message if it failed
- Mini-cart should update (if implemented)

---

### Phase 6: Test Mini-Cart Display (5 minutes)

#### Step 1: Look for Mini-Cart
Navigate to any page and look for the shopping cart icon/button in the header

#### Step 2: Add Products
Use the PDP or console to add 2-3 products

#### Step 3: Click Mini-Cart
1. Click the cart icon
2. You should see items you added
3. Check for:
   - ✅ Product names
   - ✅ Quantities
   - ✅ Prices
   - ✅ Cart total

#### Step 4: Check Console Logs
Look for logs like:
```
[HCL Mini-Cart] Initializing...
[HCL Mini-Cart] Fetching cart data...
[HCL Mini-Cart] Cart updated with 2 items
```

---

### Phase 7: Test Remove Item (3 minutes)

#### In Console:
```javascript
import { getHclCart, removeFromHclCart } from '/scripts/hcl-commerce-api.js';

// Get current cart
const cart = await getHclCart();
console.log(cart.items);  // See items

// Remove first item
if (cart.items.length > 0) {
  const orderItemId = cart.items[0].orderItemId;
  const result = await removeFromHclCart(orderItemId);
  console.log(result);
}

// Verify it's gone
const updatedCart = await getHclCart();
console.log(updatedCart.items.length);  // Should be one less
```

**Expected Output:**
```
[HCL] Item removed from cart successfully
```

---

## Troubleshooting

### ❌ "Cannot find module" or Import Errors

**Problem:** 
```
Uncaught SyntaxError: Cannot use import statement outside a module
```

**Solution 1:** Import from correct path
```javascript
// ✅ Correct
import { addToHclCart } from '/scripts/hcl-commerce-api.js';

// ❌ Wrong
import { addToHclCart } from 'hcl-commerce-api.js';
```

**Solution 2:** Make sure file exists
```powershell
# In PowerShell, verify file exists
Test-Path "scripts/hcl-commerce-api.js"  # Should return True
```

### ❌ CORS Error: "Access to XMLHttpRequest has been blocked"

**Problem:**
```
Access to XMLHttpRequest at 'https://20.40.52.251/...' from origin
'http://localhost:3000' has been blocked by CORS policy
```

**Root Cause:** HCL server doesn't allow requests from localhost (or your domain)

**Solutions:**
1. **Contact HCL team** and ask to whitelist:
   - For localhost testing: `http://localhost:3000`, `http://localhost:5173`
   - For production: Your EDS domain (e.g., `https://main--repo--owner.aem.page`)

2. **Temporary workaround** (for testing only):
   - Use browser extension like CORS Unblock (not recommended for production)
   - Or test with Postman instead of browser

### ❌ SSL Certificate Error: "NET::ERR_CERT_AUTHORITY_INVALID"

**Problem:**
```
SSL_ERROR_BAD_CERT_DOMAIN or NET::ERR_CERT_AUTHORITY_INVALID
```

**Root Cause:** HCL uses self-signed or staging certificate

**Solution:**
1. In browser, click "Advanced" → "Proceed anyway"
2. Or ask HCL team for proper staging certificate
3. For production, use valid certificate

### ❌ 403 Forbidden Error

**Problem:**
```
Failed to add to cart: 403 Forbidden
```

**Root Cause:** Token expired or invalid

**Solution:**
```javascript
// Clear session and create new one
import { HclSession, createHclGuestSession } from '/scripts/hcl-commerce-api.js';

HclSession.clear();
await createHclGuestSession();

// Try again
const result = await addToHclCart('SKU123', 1);
```

### ❌ Product Not Found: "Part number doesn't exist"

**Problem:**
```
Failed to add to cart: Product not found or inventory not available
```

**Root Cause:** SKU is invalid or doesn't exist in HCL

**Solution:**
1. Verify correct part number with HCL team
2. Check HCL product catalog for valid SKUs
3. Example valid SKU format: `CLA022_220601`

---

## Success Checklist

After running all tests above, verify:

- [ ] Session created without CORS errors
- [ ] Products added to cart successfully
- [ ] Cart fetched and displays items correctly
- [ ] Mini-cart shows correct item count
- [ ] Remove item works
- [ ] No 403/500 errors in Network tab
- [ ] Console shows [HCL] prefixed logs (no critical errors)
- [ ] PDP add-to-cart button works
- [ ] Items persist when navigating away and back

## If Everything Works ✅

Congratulations! Your HCL integration is ready. Next steps:

1. **Test PLP integration** - Navigate to product listing page
2. **Test full guest flow** - Add product → View cart → Checkout
3. **Test authenticated flow** - Login first, then add to cart
4. **Style the UI** - Add CSS for button states and mini-cart appearance
5. **Performance testing** - Test with larger carts (10+ items)

## If Something Fails ❌

1. **Document the error message exactly** (screenshot is helpful)
2. **Note which test phase failed**
3. **Check Network tab** - Look for failed requests and response codes
4. **Check browser security** - Sometimes CORS needs domain whitelist
5. **Contact HCL team** - They may need to adjust server configuration

---

## Test Commands Quick Reference

```javascript
// Session Management
HclSession.hasValidSession()
HclSession.isGuest()
HclSession.getToken()
HclSession.clear()

// API Operations
await createHclGuestSession()
await addToHclCart('PART_NUMBER', quantity)
await getHclCart()
await removeFromHclCart(orderItemId)

// Events (for debugging)
document.addEventListener('hcl:itemAdded', (e) => console.log('Item added:', e.detail))
document.addEventListener('hcl:itemRemoved', (e) => console.log('Item removed:', e.detail))
document.addEventListener('hcl:error', (e) => console.log('Error:', e.detail))
```

---

**Questions? Issues?** Let me know what error you encounter and I'll help you fix it!
