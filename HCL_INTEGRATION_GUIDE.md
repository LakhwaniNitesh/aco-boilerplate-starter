# HCL Commerce Integration - Implementation Guide

## Overview

This guide walks you through implementing the HCL Commerce integration with the EDS Storefront. The integration allows direct communication between the EDS storefront and HCL Commerce for cart management.

---

## Architecture

```
EDS Storefront (Frontend)
├── PDP (Product Details Page)
├── PLP (Product List Page)
├── Mini-Cart (Header)
└── Cart Page

↓ (HTTPS Direct Calls)

HCL Commerce Backend
├── Guest Session Management
├── Cart Management
└── Product Availability
```

---

## Phase 1: API Wrapper Layer

**File:** `scripts/hcl-commerce-api.js`

**Status:** ✅ CREATED

This module provides:
- Guest session creation
- Add to cart (by part number or product ID)
- Get cart
- Update order items
- Remove from cart
- Product availability checks
- Session management
- Custom event emission for cart updates

**Key Functions:**
```javascript
createHclGuestSession()           // Create guest session
addToHclCart(partNumber, qty)    // Add product to cart
getHclCart()                      // Get current cart
updateHclOrderItem(itemId)       // Update order item
removeFromHclCart(itemId)        // Remove item from cart
onCartEvent(eventName, callback) // Listen for events
```

---

## Phase 2: PDP Integration

**File:** `scripts/hcl-pdp-integration.js`

**Status:** ⏳ Created but needs testing

**Functions:**
```javascript
initializeHclPdpIntegration(block, product)  // Setup PDP integration
injectHclStyles()                             // Add styling
```

**How to use in product-details.js:**
```javascript
import { initializeHclPdpIntegration, injectHclStyles } from '../../scripts/hcl-pdp-integration.js';

export default async function decorate(block) {
  // ... existing PDP code ...
  
  // After rendering the PDP
  injectHclStyles();
  await initializeHclPdpIntegration(block, product);
}
```

---

## Phase 3: Mini-Cart Integration

**File:** `scripts/hcl-mini-cart-integration.js`

**Status:** ⏳ Created but needs testing

**Functions:**
```javascript
initializeHclMiniCart(block)      // Setup mini-cart with HCL data
injectHclMiniCartStyles()         // Add styling
```

**How to use in commerce-mini-cart.js:**
```javascript
import { initializeHclMiniCart, injectHclMiniCartStyles } from '../../scripts/hcl-mini-cart-integration.js';

export default async function decorate(block) {
  // ... existing mini-cart code ...
  
  // Initialize HCL integration
  injectHclMiniCartStyles();
  await initializeHclMiniCart(block);
}
```

---

## Phase 4: Cart Page Integration

**File:** `scripts/hcl-cart-page-integration.js` (To be created)

**Functions needed:**
```javascript
initializeHclCartPage(block)  // Full cart page with HCL data
```

**Features:**
- Display all cart items
- Show item details (price, quantity, status)
- Update quantities
- Remove items
- Display cart totals
- Proceed to checkout button

---

## Configuration

### HCL API Endpoints

Located in `scripts/hcl-commerce-api.js`:

```javascript
const HCL_API_HOST = '20.40.52.251';
const HCL_STORE_ID = '715842834';
const HCL_LANG_ID = '1';
const HCL_PROTOCOL = 'https';
```

**Update these values based on your HCL environment:**
- `HCL_API_HOST`: HCL Commerce server hostname/IP
- `HCL_STORE_ID`: Store ID in HCL
- `HCL_LANG_ID`: Language ID (1 = English)
- `HCL_PROTOCOL`: HTTP or HTTPS

### Environment Variables

Create `.env` or update `.env.dist`:

```
# HCL Commerce Integration
VITE_HCL_API_HOST=20.40.52.251
VITE_HCL_STORE_ID=715842834
VITE_HCL_LANG_ID=1
VITE_HCL_PROTOCOL=https
```

Then update `scripts/hcl-commerce-api.js` to read from environment:

```javascript
const HCL_API_HOST = import.meta.env.VITE_HCL_API_HOST || '20.40.52.251';
const HCL_STORE_ID = import.meta.env.VITE_HCL_STORE_ID || '715842834';
const HCL_LANG_ID = import.meta.env.VITE_HCL_LANG_ID || '1';
```

---

## Events System

### Available Events

The integration emits custom events that you can listen to:

```javascript
// Listen for events
import { onCartEvent } from '../../scripts/hcl-commerce-api.js';

// Item added to cart
onCartEvent('itemAdded', (detail) => {
  console.log('Item added:', detail.partNumber, detail.quantity);
  // Update UI, refresh cart, etc.
});

// Session created
onCartEvent('sessionCreated', (detail) => {
  console.log('Session created:', detail.orderId);
});

// Errors
onCartEvent('cartError', (detail) => {
  console.error('Cart error:', detail.error);
});
```

### Event Details

| Event | Detail Properties | Description |
|-------|------------------|-------------|
| `sessionCreated` | `orderId` | Guest session created |
| `itemAdded` | `partNumber`, `quantity`, `orderId` | Item added to cart |
| `itemRemoved` | `orderItemId` | Item removed from cart |
| `orderItemUpdated` | `orderItemId` | Order item updated |
| `cartUpdated` | (none) | Cart was updated |
| `sessionCleared` | (none) | Session cleared |
| `sessionError` | `error` | Session creation failed |
| `cartError` | `error`, `partNumber` | Cart operation failed |

---

## Testing the Integration

### 1. Test API Wrapper

```javascript
// In browser console
import { createHclGuestSession, addToHclCart, getHclCart } from './scripts/hcl-commerce-api.js';

// Create session
await createHclGuestSession();

// Add item
const result = await addToHclCart('CLA022_220601', 1);
console.log(result);

// Get cart
const cart = await getHclCart();
console.log(cart);
```

### 2. Test PDP Integration

1. Navigate to a product details page
2. Click "Add to Cart"
3. Check browser console for HCL logs
4. Verify item appears in HCL cart

### 3. Test Mini-Cart

1. Navigate to storefront home
2. Add product to cart from PDP
3. Mini-cart should update automatically
4. Click mini-cart to open
5. Verify items are displayed

---

## Error Handling

The integration handles common errors:

```javascript
// Session expired - automatically refreshes
// 403 Errors - creates new session and retries
// Network errors - logs error and returns safe default
```

### Common Issues

#### CORS Errors
If you see CORS errors:
1. Ensure HCL team has whitelisted your EDS domain
2. Check browser DevTools Network tab for failed requests
3. Verify HCL_API_HOST is correct

#### SSL Certificate Errors
HCL uses self-signed certificate:
1. In development: Accept the certificate in browser
2. In production: Use proper SSL certificate

#### Session Timeouts
Sessions are stored in `sessionStorage`:
- Survives page refreshes
- Lost when browser is closed
- Integration automatically creates new session when needed

---

## Security Considerations

### POC Security Notes ⚠️

This is a **POC** implementation with known security limitations:

1. **Tokens stored in sessionStorage** - Visible in browser
2. **Direct API calls** - Credentials exposed in network requests
3. **No HTTPS validation** - Self-signed certs accepted

### Production Hardening

Before going to production, implement:

1. **Server-side Session Management**
   - Move HCL API calls to backend
   - Store tokens server-side
   - Use secure HTTP-only cookies

2. **API Gateway / BFF Pattern**
   - Create backend service layer
   - Proxy all HCL calls through your server
   - Implement proper CORS handling

3. **Authentication**
   - Implement proper user authentication
   - Use OAuth or IMS tokens
   - Validate all requests server-side

4. **SSL/TLS**
   - Use proper SSL certificates
   - Validate certificates in production

---

## Performance Optimization

### Caching

Cart data is cached in sessionStorage. To clear cache:

```javascript
import { clearHclSession } from '../../scripts/hcl-commerce-api.js';
clearHclSession();
```

### Refresh Intervals

Mini-cart refreshes automatically every 30 seconds. To adjust:

```javascript
// In scripts/hcl-mini-cart-integration.js
const refreshInterval = setInterval(async () => {
  await updateMiniCart();
}, 30000); // Change this value (in milliseconds)
```

---

## Debugging

### Enable Verbose Logging

All functions log to console with `[HCL *]` prefix:

```javascript
// Check browser console
[HCL API] POST /wcs/resources/store/715842834/cart?langId=1
[HCL API] Guest session created successfully
[HCL Event] itemAdded: { partNumber: "CLA022_220601", quantity: 1 }
```

### View Session Status

```javascript
import { getSessionStatus } from '../../scripts/hcl-commerce-api.js';
const status = getSessionStatus();
console.log(status);
// Output:
// {
//   isValid: true,
//   orderId: "764426",
//   hasToken: true,
//   hasTrustedToken: true
// }
```

### Monitor Network Requests

1. Open DevTools → Network tab
2. Filter by "XHR"
3. Watch for HCL API calls to `20.40.52.251`

---

## Implementation Checklist

- [ ] Phase 1: HCL Commerce API wrapper created
- [ ] Phase 2: PDP integration implemented
- [ ] Phase 3: Mini-cart integration implemented
- [ ] Phase 4: Cart page integration implemented
- [ ] Environment variables configured
- [ ] CORS handling tested
- [ ] SSL certificate issues resolved
- [ ] Add to cart flow tested end-to-end
- [ ] Mini-cart updates in real-time
- [ ] Cart page displays all items correctly
- [ ] Error handling tested
- [ ] Mobile responsive design verified
- [ ] Performance tested
- [ ] Security review completed
- [ ] Documentation updated

---

## Next Steps

1. **Review the created files** in `scripts/` folder
2. **Test the API wrapper** directly in browser console
3. **Integrate with PDP** by importing and calling `initializeHclPdpIntegration`
4. **Integrate with mini-cart** by importing and calling `initializeHclMiniCart`
5. **Create cart page integration** following the same pattern
6. **Test end-to-end flow**: PDP → Mini-cart → Cart page
7. **Optimize and refine** based on testing
8. **Plan production migration** to 3-layer architecture

---

## Support & Troubleshooting

### Logs
Check browser console for detailed logs with `[HCL *]` prefix.

### Common Errors

| Error | Solution |
|-------|----------|
| CORS error | Ask HCL team to whitelist domain |
| 403 Unauthorized | Session expired, auto-refreshes |
| Network timeout | Check HCL server is running |
| Invalid product | Verify part number is correct |

### Contact
For issues with the integration, check:
1. Browser console logs
2. Network tab (XHR requests)
3. HCL server status and logs
4. Configuration (API host, store ID, etc.)

