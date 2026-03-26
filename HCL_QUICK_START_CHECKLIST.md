# HCL Commerce Integration - Quick Start Checklist

## ✅ Completed (Phase 1)

- [x] Created `scripts/hcl-commerce-api.js`
  - Guest session management
  - Add to cart (by part number or product ID)
  - Get cart
  - Update order items
  - Remove from cart
  - Event system
  - Error handling

## ⏳ Created (Ready for Testing)

- [x] Created `scripts/hcl-pdp-integration.js`
- [x] Created `scripts/hcl-mini-cart-integration.js`
- [x] Created documentation:
  - `HCL_INTEGRATION_GUIDE.md`
  - `HCL_IMPLEMENTATION_PLAN.md`

## 📋 Next Steps

### Step 1: Test API Wrapper (30 minutes)

1. Open browser DevTools Console
2. Navigate to storefront
3. Run in console:
```javascript
import { createHclGuestSession, addToHclCart, getHclCart } from './scripts/hcl-commerce-api.js';

// Create guest session
console.log('Creating session...');
await createHclGuestSession();

// Get cart (should be empty)
let cart = await getHclCart();
console.log('Initial cart:', cart);

// Add item
console.log('Adding item...');
const result = await addToHclCart('CLA022_220601', 1);
console.log('Add result:', result);

// Get cart again (should have item)
cart = await getHclCart();
console.log('Updated cart:', cart);
```

**Expected Output:**
```
✓ Session created
✓ Initial cart: { items: [], cartTotals: { itemCount: 0 } }
✓ Item added: { success: true, orderId: "764417", orderItemId: "6545024" }
✓ Updated cart: { items: [{ partNumber: "CLA022_220601", quantity: 1 }], ... }
```

### Step 2: Verify HCL Connection (15 minutes)

1. Check if HCL server is accessible:
```javascript
// Should see [HCL API] logs in console
// Check Network tab for requests to 20.40.52.251
```

2. If CORS error:
   - Ask HCL team to whitelist your domain
   - Temporary workaround: Use proxy for POC

3. If SSL error:
   - Ignore certificate warning in browser
   - Or run in incognito mode

### Step 3: Integrate PDP (1 hour)

1. Open `blocks/product-details/product-details.js`

2. Add import at top:
```javascript
import { initializeHclPdpIntegration, injectHclStyles } from '../../scripts/hcl-pdp-integration.js';
```

3. Add initialization after PDP renders (around line 400-450):
```javascript
// After all PDP components are rendered
injectHclStyles();
await initializeHclPdpIntegration(block, product);
```

4. Test:
   - Navigate to product page
   - Click "Add to Cart"
   - Check console for `[HCL PDP]` logs
   - Verify success message appears
   - Check mini-cart updates

### Step 4: Integrate Mini-Cart (1 hour)

1. Open `blocks/commerce-mini-cart/commerce-mini-cart.js`

2. Add import at top:
```javascript
import { initializeHclMiniCart, injectHclMiniCartStyles } from '../../scripts/hcl-mini-cart-integration.js';
```

3. Add initialization in decorate function:
```javascript
export default async function decorate(block) {
  // ... existing code ...
  
  injectHclMiniCartStyles();
  await initializeHclMiniCart(block);
}
```

4. Test:
   - Add item from PDP
   - Check mini-cart badge updates
   - Click mini-cart to open
   - Verify items display with prices
   - Test mobile view

### Step 5: Integrate Cart Page (2 hours)

1. Create new file `scripts/hcl-cart-page-integration.js` (template provided in guide)

2. Update `blocks/commerce-cart/commerce-cart.js` to use it

3. Features needed:
   - Display all items
   - Update quantities
   - Remove items
   - Show totals
   - Proceed to checkout

4. Test:
   - Navigate to cart page
   - Verify all items display
   - Test update quantity
   - Test remove item
   - Test empty cart state

### Step 6: End-to-End Testing (1 hour)

1. **Happy Path Test**
   - [ ] Add item from PDP
   - [ ] See item in mini-cart
   - [ ] Navigate to cart page
   - [ ] See item in cart
   - [ ] Update quantity
   - [ ] Remove item
   - [ ] Cart is empty

2. **Error Handling Test**
   - [ ] Disconnect network
   - [ ] Try to add item
   - [ ] See error message
   - [ ] Reconnect network
   - [ ] Try again successfully

3. **Browser Compatibility**
   - [ ] Chrome desktop
   - [ ] Firefox desktop
   - [ ] Safari desktop
   - [ ] Chrome mobile
   - [ ] Safari mobile

### Step 7: Troubleshooting (as needed)

**If CORS error:**
```
Error: No 'Access-Control-Allow-Origin' header
Solution: Ask HCL to whitelist your domain, or use proxy
```

**If SSL error:**
```
Error: SEC_ERROR_UNKNOWN_ISSUER or similar
Solution: Accept the certificate in browser, or disable validation in dev
```

**If 403 error:**
```
Error: 403 Unauthorized
Solution: Session expired, integration will auto-refresh
```

**If no items in cart:**
```
Check: part number is correct
Check: product exists in HCL
Check: HCL server logs
```

## 🚀 Deployment

When ready for production:

1. [ ] Code review completed
2. [ ] All tests passing
3. [ ] Security review done
4. [ ] Performance verified
5. [ ] Documentation complete
6. [ ] Backup created
7. [ ] Deploy to staging
8. [ ] Test in staging
9. [ ] Get approval
10. [ ] Deploy to production
11. [ ] Monitor logs
12. [ ] Announce to users

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `HCL_INTEGRATION_GUIDE.md` | User guide and API reference |
| `HCL_IMPLEMENTATION_PLAN.md` | Detailed implementation plan |
| `HCL_QUICK_START_CHECKLIST.md` | This file |
| `scripts/hcl-commerce-api.js` | Core API wrapper |
| `scripts/hcl-pdp-integration.js` | PDP integration |
| `scripts/hcl-mini-cart-integration.js` | Mini-cart integration |

## 🔧 Configuration

Update in `scripts/hcl-commerce-api.js`:

```javascript
const HCL_API_HOST = '20.40.52.251';           // HCL server IP/hostname
const HCL_STORE_ID = '715842834';              // Store ID
const HCL_LANG_ID = '1';                       // Language ID
const HCL_PROTOCOL = 'https';                  // HTTP or HTTPS
```

Or use environment variables:
```
VITE_HCL_API_HOST=20.40.52.251
VITE_HCL_STORE_ID=715842834
VITE_HCL_LANG_ID=1
VITE_HCL_PROTOCOL=https
```

## 📞 Support

For issues:

1. **Check Console Logs**
   - Look for `[HCL *]` prefix
   - All operations are logged

2. **Check Network Tab**
   - DevTools → Network
   - Filter by XHR
   - Look for requests to `20.40.52.251`

3. **Check Session Status**
   ```javascript
   import { getSessionStatus } from './scripts/hcl-commerce-api.js';
   console.log(getSessionStatus());
   ```

4. **Test API Directly**
   - Use Postman
   - Call HCL endpoints manually
   - Verify responses

5. **Check HCL Logs**
   - Contact HCL team
   - Check server logs for errors
   - Verify store configuration

## ✅ Success Indicators

When everything is working:

- [ ] ✓ Console shows `[HCL API] Guest session created`
- [ ] ✓ Add to cart shows success message
- [ ] ✓ Mini-cart badge updates
- [ ] ✓ Mini-cart items display correctly
- [ ] ✓ Cart page shows all items
- [ ] ✓ No console errors
- [ ] ✓ No CORS errors
- [ ] ✓ Prices format correctly
- [ ] ✓ Mobile layout responsive

## 🎯 Phase 1 Complete

Once all steps above are completed, Phase 1 (POC) is complete.

**Estimated Time:** 4-5 hours for experienced developer

## 🚀 Next Phase (Production)

After Phase 1 approval:
- Refactor to 3-layer architecture
- Move API calls to backend
- Implement proper authentication
- Add comprehensive testing
- Security hardening
- Performance optimization

**Estimated Time:** 5-7 additional days

---

**Status:** READY TO START  
**Last Updated:** March 26, 2026  
**Questions?** Check `HCL_INTEGRATION_GUIDE.md` or `HCL_IMPLEMENTATION_PLAN.md`
