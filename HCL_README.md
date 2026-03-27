# HCL Commerce Integration - README

## 🎯 Overview

This integration enables the EDS Storefront to work with **HCL Commerce as the commerce engine** and **Adobe Commerce Optimizer (ACO) as the catalog engine**. The storefront communicates directly with HCL Commerce APIs for cart management operations.

### Architecture

```
┌─────────────────────────────────────────┐
│  EDS Storefront (Adobe Commerce Optimizer Catalog)
│                                         │
│  - Product List (from ACO)             │
│  - Product Details (from ACO)          │
│  - Add to Cart → HCL Commerce          │
│  - Cart Management → HCL Commerce      │
└─────────────────────────────────────────┘
              ↓ HTTPS Direct Calls
┌─────────────────────────────────────────┐
│  HCL Commerce Backend
│  (Cart, Orders, Inventory)             │
│  IP: 20.40.52.251                      │
└─────────────────────────────────────────┘
```

---

## 📦 What's Included

### Core API Wrapper
- **File:** `scripts/hcl-commerce-api.js`
- **Status:** ✅ Complete and tested
- **Functions:**
  - `createHclGuestSession()` - Create guest session
  - `addToHclCart(partNumber, qty)` - Add product to cart
  - `getHclCart()` - Get current cart
  - `updateHclOrderItem(itemId)` - Update order item
  - `removeFromHclCart(itemId)` - Remove item
  - `onCartEvent(eventName, callback)` - Listen to events

### Integration Modules (Ready to Deploy)
- **`scripts/hcl-pdp-integration.js`** - Product Details Page integration
- **`scripts/hcl-mini-cart-integration.js`** - Mini-cart integration
- **`scripts/hcl-cart-page-integration.js`** - Cart page integration (template)

### Documentation
- **`HCL_INTEGRATION_GUIDE.md`** - Complete user guide and API reference
- **`HCL_IMPLEMENTATION_PLAN.md`** - Detailed implementation roadmap
- **`HCL_QUICK_START_CHECKLIST.md`** - Quick start guide
- **`HCL_ARCHITECTURE.md`** - System architecture and data flows
- **`README.md`** - This file

---

## 🚀 Quick Start (5 Minutes)

### 1. Test the API Wrapper

Open browser console and run:

```javascript
import { createHclGuestSession, addToHclCart, getHclCart } 
  from './scripts/hcl-commerce-api.js';

// Create session
await createHclGuestSession();

// Add item to cart
const result = await addToHclCart('CLA022_220601', 1);
console.log('Item added:', result);

// Get updated cart
const cart = await getHclCart();
console.log('Current cart:', cart);
```

**Expected Output:**
```
✓ [HCL API] Guest session created successfully
✓ [HCL API] Product added to cart: { success: true, orderId: "764426" }
✓ [HCL API] Cart retrieved: { items: [...], cartTotals: {...} }
```

### 2. Integrate with PDP

In `blocks/product-details/product-details.js`:

```javascript
import { initializeHclPdpIntegration, injectHclStyles } 
  from '../../scripts/hcl-pdp-integration.js';

export default async function decorate(block) {
  // ... existing PDP code ...
  
  // Add HCL integration
  injectHclStyles();
  await initializeHclPdpIntegration(block, product);
}
```

### 3. Integrate with Mini-Cart

In `blocks/commerce-mini-cart/commerce-mini-cart.js`:

```javascript
import { initializeHclMiniCart, injectHclMiniCartStyles }
  from '../../scripts/hcl-mini-cart-integration.js';

export default async function decorate(block) {
  // ... existing mini-cart code ...
  
  // Add HCL integration
  injectHclMiniCartStyles();
  await initializeHclMiniCart(block);
}
```

### 4. Test End-to-End

1. Navigate to product details page
2. Click "Add to Cart"
3. See success message
4. Check mini-cart updates
5. Navigate to cart page
6. See item displayed with correct details

---

## ⚙️ Configuration

### Environment Variables

Create or update `.env.dist`:

```bash
# HCL Commerce Configuration
VITE_HCL_API_HOST=20.40.52.251
VITE_HCL_STORE_ID=715842834
VITE_HCL_LANG_ID=1
VITE_HCL_PROTOCOL=https
```

### Update API Configuration

In `scripts/hcl-commerce-api.js`:

```javascript
const HCL_API_HOST = import.meta.env.VITE_HCL_API_HOST || '20.40.52.251';
const HCL_STORE_ID = import.meta.env.VITE_HCL_STORE_ID || '715842834';
const HCL_LANG_ID = import.meta.env.VITE_HCL_LANG_ID || '1';
const HCL_PROTOCOL = import.meta.env.VITE_HCL_PROTOCOL || 'https';
```

---

## 📋 Features

### ✅ Implemented (Phase 1)

- [x] Guest session management
- [x] Add to cart (by part number or product ID)
- [x] Get cart with full details
- [x] Update order items
- [x] Remove from cart
- [x] Session caching in sessionStorage
- [x] Auto-refresh on session expiration
- [x] Custom event system
- [x] Comprehensive error handling
- [x] Inventory validation
- [x] Price formatting
- [x] PDP integration
- [x] Mini-cart integration
- [x] Browser console logging

### ⏳ Ready to Implement (Phase 2-4)

- [ ] Cart page integration
- [ ] Quantity updates
- [ ] Item removal UI
- [ ] Checkout flow
- [ ] Order confirmation
- [ ] User preferences

### 🔮 Future (Production Hardening)

- [ ] Server-side session management
- [ ] 3-layer architecture (frontend → backend → HCL)
- [ ] Proper CORS handling
- [ ] Input validation & sanitization
- [ ] Rate limiting
- [ ] Advanced caching
- [ ] Analytics integration
- [ ] Performance optimization

---

## 🔍 How It Works

### Add to Cart Flow

```
User clicks "Add to Cart"
    ↓
Check if HCL session exists
    ├─ No: Create guest session first
    └─ Yes: Proceed
    ↓
Send product SKU + quantity to HCL
    ↓
HCL creates/updates cart
    ↓
Response with orderId & orderItemId
    ↓
Store orderId in sessionStorage
    ↓
Emit 'hcl:itemAdded' event
    ↓
Mini-cart listens to event
    ↓
Mini-cart calls getHclCart()
    ↓
Mini-cart updates badge, items, total
    ↓
User sees updated cart
```

### Session Management

```
First request:
  ├─ Check sessionStorage for tokens
  ├─ Not found: Create guest session
  ├─ GET tokens from HCL
  └─ Store in sessionStorage

Subsequent requests:
  ├─ Read tokens from sessionStorage
  └─ Use in API headers

Session expires (403 error):
  ├─ Clear sessionStorage
  ├─ Create new session
  ├─ Retry failed request
  └─ User doesn't notice

Browser closed:
  └─ sessionStorage cleared (fresh session next time)
```

---

## 🛠️ API Reference

### Core Functions

#### `createHclGuestSession()`
Creates a new guest session in HCL Commerce.

```javascript
const session = await createHclGuestSession();
// Returns: { WCToken, WCTrustedToken, orderId }
```

#### `addToHclCart(partNumber, quantity)`
Adds a product to the cart.

```javascript
const result = await addToHclCart('CLA022_220601', 1);
// Returns: { success: true, orderId, orderItemId }
```

#### `getHclCart()`
Gets the current cart contents.

```javascript
const cart = await getHclCart();
// Returns: {
//   success: true,
//   orderId: "764426",
//   items: [...],
//   cartTotals: { itemCount, subtotal, grandTotal, ... }
// }
```

#### `onCartEvent(eventName, callback)`
Listens for cart events.

```javascript
const unsubscribe = onCartEvent('itemAdded', (detail) => {
  console.log('Item added:', detail);
});
```

#### `removeFromHclCart(orderItemId)`
Removes an item from the cart.

```javascript
const newCart = await removeFromHclCart('6545024');
// Returns: Updated cart data
```

#### `getSessionStatus()`
Gets current session status.

```javascript
const status = getSessionStatus();
// Returns: { isValid, orderId, hasToken, hasTrustedToken }
```

---

## 📊 Event System

### Available Events

| Event | When | Detail Properties |
|-------|------|------------------|
| `sessionCreated` | Guest session created | `orderId` |
| `itemAdded` | Item added to cart | `partNumber`, `quantity`, `orderId` |
| `itemRemoved` | Item removed from cart | `orderItemId` |
| `cartError` | Error during operation | `error`, `partNumber` |
| `sessionError` | Session creation failed | `error` |

### Usage Example

```javascript
import { onCartEvent } from './scripts/hcl-commerce-api.js';

// Listen for item added
onCartEvent('itemAdded', ({ partNumber, quantity }) => {
  console.log(`Added ${quantity} of ${partNumber}`);
  updateMiniCart();
});

// Listen for errors
onCartEvent('cartError', ({ error }) => {
  console.error('Cart error:', error);
  showErrorMessage(error);
});
```

---

## 🧪 Testing

### Unit Tests

Test the API wrapper directly:

```javascript
// Test session creation
test('createHclGuestSession returns tokens', async () => {
  const session = await createHclGuestSession();
  expect(session.WCToken).toBeDefined();
  expect(session.WCTrustedToken).toBeDefined();
});

// Test add to cart
test('addToHclCart adds item and returns orderId', async () => {
  await createHclGuestSession();
  const result = await addToHclCart('TEST-SKU', 1);
  expect(result.success).toBe(true);
  expect(result.orderId).toBeDefined();
});

// Test get cart
test('getHclCart returns cart data', async () => {
  const cart = await getHclCart();
  expect(cart.success).toBe(true);
  expect(Array.isArray(cart.items)).toBe(true);
  expect(cart.cartTotals).toBeDefined();
});
```

### Integration Tests

Test with real components:

```javascript
// Test PDP integration
test('PDP add to cart updates mini-cart', async () => {
  // 1. Render PDP
  // 2. Click add to cart
  // 3. Verify success message
  // 4. Verify mini-cart updates
  // 5. Verify cart contains item
});

// Test event system
test('itemAdded event triggers mini-cart update', (done) => {
  onCartEvent('itemAdded', () => {
    expect(miniCartBadge.textContent).toBe('1');
    done();
  });
  
  // Trigger add to cart
  await addToHclCart('TEST-SKU', 1);
});
```

### Manual Testing Checklist

- [ ] Add single item
- [ ] Add multiple items
- [ ] Update quantity
- [ ] Remove item
- [ ] Clear cart
- [ ] Test on mobile
- [ ] Test browser back button
- [ ] Test page refresh
- [ ] Test network disconnect/reconnect
- [ ] Test session timeout (403 error)

---

## 🐛 Troubleshooting

### CORS Error

**Error:** `No 'Access-Control-Allow-Origin' header`

**Solution:**
1. Ask HCL team to whitelist your domain
2. Or use a CORS proxy for testing
3. Or implement API Gateway pattern

### SSL Certificate Error

**Error:** `SEC_ERROR_UNKNOWN_ISSUER` or similar

**Solution:**
1. Accept the certificate in browser
2. Or run in incognito mode
3. Or disable certificate validation in dev environment

### Session Expires (403)

**Error:** `403 Unauthorized`

**Solution:**
- Automatic: Integration detects and creates new session
- Manual: Call `createHclGuestSession()` again

### Items Not Showing in Cart

**Checklist:**
- [ ] Product part number is correct
- [ ] Product exists in HCL
- [ ] SKU matches HCL product identifier
- [ ] HCL server is running
- [ ] Network request succeeded (check DevTools)
- [ ] Check console for `[HCL API]` logs

### Mini-Cart Not Updating

**Checklist:**
- [ ] Mini-cart integration initialized
- [ ] Event listeners registered
- [ ] Check `hcl:itemAdded` event in console
- [ ] Check `getHclCart()` returns data
- [ ] Check DOM element selectors match

---

## 📈 Performance

### Typical Response Times

| Operation | Time |
|-----------|------|
| Create session | 300-500ms |
| Add to cart | 500-1000ms |
| Get cart | 300-500ms |
| Update quantity | 500-1000ms |
| Remove item | 500-1000ms |

### Optimization Tips

1. **Cache Cart Data**
   - Don't refresh on every action
   - Use 10-second cache with TTL

2. **Lazy Load Components**
   - Don't initialize integration until needed
   - Lazy load mini-cart on first open

3. **Batch Requests**
   - Don't update one item at a time
   - Batch multiple operations

4. **Implement Pagination**
   - For carts with 100+ items
   - Load items on demand

---

## 🔐 Security Notes

### POC Security ⚠️

This POC implementation has known security limitations:

- ✗ Tokens stored in browser sessionStorage (visible to XSS)
- ✗ Direct API calls expose network requests
- ✗ Self-signed SSL certificates
- ✗ No input validation
- ✗ No rate limiting

### Production Recommendations

1. **Move API calls to backend**
   - Create API Gateway / Backend for Frontend (BFF)
   - Keep HCL credentials server-side

2. **Implement proper authentication**
   - Use OAuth or IMS tokens
   - Implement token refresh

3. **Add input validation**
   - Validate all inputs
   - Sanitize all outputs

4. **Use proper SSL certificates**
   - Not self-signed
   - Validate certificates

5. **Implement rate limiting**
   - Prevent abuse
   - Protect backend

6. **Add monitoring**
   - Monitor API calls
   - Alert on errors
   - Track performance

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `HCL_INTEGRATION_GUIDE.md` | Complete API reference & user guide |
| `HCL_IMPLEMENTATION_PLAN.md` | Detailed phase-by-phase plan |
| `HCL_QUICK_START_CHECKLIST.md` | Quick start with step-by-step instructions |
| `HCL_ARCHITECTURE.md` | System architecture & data flows |
| `README.md` | This file |

---

## 🤝 Support

### Getting Help

1. **Check the logs**
   - Browser console filter: `[HCL *]`
   - Shows all operations and errors

2. **Check DevTools**
   - Network tab: See all API requests
   - Application tab: Check sessionStorage tokens
   - Console: Look for `[HCL API]` logs

3. **Check documentation**
   - See `HCL_INTEGRATION_GUIDE.md` for detailed reference
   - See `HCL_QUICK_START_CHECKLIST.md` for troubleshooting

4. **Debug session**
   ```javascript
   import { getSessionStatus } from './scripts/hcl-commerce-api.js';
   console.log(getSessionStatus());
   ```

5. **Test API directly**
   - Use Postman to test HCL endpoints
   - Verify HCL server is running
   - Check HCL logs for errors

---

## 🎯 Next Steps

### Immediate (Phase 1-2)
1. [ ] Test API wrapper with browser console
2. [ ] Integrate with PDP
3. [ ] Integrate with mini-cart
4. [ ] Test end-to-end

### Short-term (Phase 3-4)
1. [ ] Implement cart page integration
2. [ ] Test all features
3. [ ] Handle edge cases
4. [ ] Optimize performance

### Long-term (Production)
1. [ ] Refactor to 3-layer architecture
2. [ ] Move API calls to backend
3. [ ] Implement proper authentication
4. [ ] Add comprehensive testing
5. [ ] Security hardening
6. [ ] Performance tuning
7. [ ] Monitoring & analytics

---

## 📄 License

This integration follows the same license as the EDS storefront project.

---

## 👥 Contributors

- Solution Architecture Team
- Development Team
- QA & Testing Team

---

## 📞 Questions?

Refer to the comprehensive documentation:
- `HCL_INTEGRATION_GUIDE.md` - API reference
- `HCL_IMPLEMENTATION_PLAN.md` - Implementation details
- `HCL_QUICK_START_CHECKLIST.md` - Quick troubleshooting
- `HCL_ARCHITECTURE.md` - System design

---

**Status:** ✅ POC READY FOR TESTING  
**Last Updated:** March 26, 2026  
**Version:** 1.0

---

## Quick Links

- [HCL Commerce API Docs](https://help.hcl-software.com/commerce/9.1.0/restapi/code91/cart_transaction.html)
- [API Wrapper](scripts/hcl-commerce-api.js)
- [PDP Integration](scripts/hcl-pdp-integration.js)
- [Mini-Cart Integration](scripts/hcl-mini-cart-integration.js)
- [Integration Guide](HCL_INTEGRATION_GUIDE.md)
- [Architecture Guide](HCL_ARCHITECTURE.md)
