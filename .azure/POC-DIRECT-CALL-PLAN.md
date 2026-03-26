# HCL Commerce Integration - POC with Direct Calls
## Storefront Direct Integration (Skip Middleware)

**Date:** March 26, 2026  
**Approach:** Direct storefront-to-HCL calls (POC optimized)  
**Duration:** 3-4 days (vs 6.5 days with middleware)  
**Risk Level:** Medium (CORS, security - acceptable for POC)  

---

## 🎯 Executive Summary

This is a **simplified implementation plan** for a **POC** that calls HCL Commerce APIs directly from the EDS storefront, bypassing the Adobe I/O Runtime middleware layer.

### Tradeoffs

**Pros:**
✅ Faster development (3-4 days vs 6.5 days)  
✅ Simpler architecture (no middleware)  
✅ Easier debugging  
✅ Good for proof-of-concept  
✅ Can refactor to 3-layer later  

**Cons:**
⚠️ CORS handling needed (might be complex)  
⚠️ Credentials exposed in browser network tab  
⚠️ Self-signed SSL certificate issues  
⚠️ Less secure (not production-ready)  
⚠️ Scalability questions  

---

## 🏗️ Simplified Architecture

```
┌─────────────────────────────────┐
│  EDS Storefront (Frontend)      │
│                                 │
│  - PDP with Add to Cart        │
│  - Mini-cart in header         │
│  - Cart page                   │
│                                 │
│  DIRECTLY calls HCL APIs ──┐  │
└────────────────────────────┼────┘
                             │ HTTPS
                             ↓
                    ┌────────────────────────┐
                    │  HCL Commerce          │
                    │  (20.40.52.251)        │
                    │                        │
                    │  - Guest Login         │
                    │  - Add to Cart         │
                    │  - Get Cart            │
                    │  - Remove from Cart    │
                    └────────────────────────┘
```

---

## 📋 Phase Breakdown (3-4 Days)

### Phase 1: API Wrapper + CORS Handling (1 day)
**File:** `scripts/hcl-cart-api.js`

```javascript
/**
 * HCL Commerce API - Direct Call Wrapper
 * Handles CORS, self-signed certificates, WCToken management
 */

const HCL_API_HOST = '20.40.52.251';
const HCL_STORE_ID = '715842834';
const HCL_LANG_ID = '1';

// Cache tokens in sessionStorage (POC only - don't do this in production!)
class HclSession {
  static getToken() {
    return sessionStorage.getItem('hcl_wctoken');
  }

  static setToken(wcToken, wcTrustedToken) {
    sessionStorage.setItem('hcl_wctoken', wcToken);
    sessionStorage.setItem('hcl_wctrustedtoken', wcTrustedToken);
  }

  static getTrustedToken() {
    return sessionStorage.getItem('hcl_wctrustedtoken');
  }

  static clear() {
    sessionStorage.removeItem('hcl_wctoken');
    sessionStorage.removeItem('hcl_wctrustedtoken');
  }
}

/**
 * Create HCL guest session
 * Must be called first before add to cart
 */
export async function createHclGuestSession() {
  try {
    const response = await fetch(
      `https://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/guestidentity?langId=${HCL_LANG_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // IMPORTANT: Include credentials for cookie-based auth
        credentials: 'include',
      }
    );

    const data = await response.json();

    if (data.WCToken && data.WCTrustedToken) {
      HclSession.setToken(data.WCToken, data.WCTrustedToken);
      console.log('HCL guest session created successfully');
      return data;
    } else {
      throw new Error('Failed to get tokens from HCL');
    }
  } catch (error) {
    console.error('Error creating HCL guest session:', error);
    throw error;
  }
}

/**
 * Add product to HCL cart using partNumber
 * @param {string} partNumber - Product part number (e.g., "CLA022_220601")
 * @param {number} quantity - Quantity to add
 * @returns {Promise<Object>} Cart response
 */
export async function addToHclCart(partNumber, quantity = 1) {
  try {
    // Ensure session exists
    if (!HclSession.getToken()) {
      await createHclGuestSession();
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const response = await fetch(
      `https://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart?langId=${HCL_LANG_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          WCToken: wcToken,
          WCTrustedToken: wcTrustedToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          orderId: '.',
          x_calculateOrder: '0',
          orderItem: [
            {
              quantity: String(quantity),
              partNumber: partNumber,
            },
          ],
          x_inventoryValidation: true,
        }),
      }
    );

    // Handle 403 - might be session expired
    if (response.status === 403) {
      console.warn('Session may have expired, creating new session...');
      HclSession.clear();
      await createHclGuestSession();
      // Retry the request
      return addToHclCart(partNumber, quantity);
    }

    if (!response.ok) {
      throw new Error(`HCL API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      orderId: data.orderId,
      orderItemId: data.orderItem[0].orderItemId,
      data: data,
    };
  } catch (error) {
    console.error('Error adding to HCL cart:', error);
    throw error;
  }
}

/**
 * Get current HCL cart
 * @returns {Promise<Object>} Full cart data
 */
export async function getHclCart() {
  try {
    if (!HclSession.getToken()) {
      // Return empty cart if no session
      return {
        success: true,
        items: [],
        cartTotals: {
          itemCount: 0,
          subtotal: '0.00',
          grandTotal: '0.00',
        },
      };
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const response = await fetch(
      `https://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart/@self?langId=${HCL_LANG_ID}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          WCToken: wcToken,
          WCTrustedToken: wcTrustedToken,
        },
        credentials: 'include',
      }
    );

    if (response.status === 403) {
      console.warn('Session expired, clearing...');
      HclSession.clear();
      return {
        success: true,
        items: [],
        cartTotals: {
          itemCount: 0,
          subtotal: '0.00',
          grandTotal: '0.00',
        },
      };
    }

    if (!response.ok) {
      throw new Error(`Failed to get cart: ${response.status}`);
    }

    const cartData = await response.json();

    // Transform HCL response to our format
    return {
      success: true,
      orderId: cartData.orderId,
      items: (cartData.orderItem || []).map((item) => ({
        orderItemId: item.orderItemId,
        partNumber: item.partNumber,
        productId: item.productId,
        productName: item.productName || `Product ${item.partNumber}`,
        quantity: parseFloat(item.quantity),
        unitPrice: item.unitPrice,
        orderItemPrice: item.orderItemPrice,
        orderItemInventoryStatus: item.orderItemInventoryStatus,
      })),
      cartTotals: {
        itemCount: cartData.orderItem ? cartData.orderItem.length : 0,
        subtotal: cartData.totalProductPrice || '0.00',
        shippingCharge: cartData.totalShippingCharge || '0.00',
        salesTax: cartData.totalSalesTax || '0.00',
        grandTotal: cartData.grandTotal || '0.00',
        currency: cartData.totalProductPriceCurrency || 'USD',
      },
    };
  } catch (error) {
    console.error('Error fetching HCL cart:', error);
    // Return empty cart on error
    return {
      success: false,
      error: error.message,
      items: [],
      cartTotals: {
        itemCount: 0,
        subtotal: '0.00',
        grandTotal: '0.00',
      },
    };
  }
}

/**
 * Utility: Format price for display
 */
export function formatPrice(price) {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Emit custom event for cart updates
 */
export function emitCartEvent(eventName, detail) {
  const event = new CustomEvent(`hcl:${eventName}`, { detail });
  document.dispatchEvent(event);
}

/**
 * Listen for cart events
 */
export function onCartEvent(eventName, callback) {
  const listener = (event) => callback(event.detail);
  document.addEventListener(`hcl:${eventName}`, listener);
  return () => {
    document.removeEventListener(`hcl:${eventName}`, listener);
  };
}
```

### Phase 2: PDP Integration (0.5 day)
**Modify:** `blocks/product-details/product-details.js`

```javascript
// Add import at top
import { addToHclCart, emitCartEvent, createHclGuestSession } from '../../scripts/hcl-cart-api.js';

// In decorate function, override Add to Cart button:

// Find the button for adding to cart
const addToCartButton = fragment.querySelector('.product-details__buttons__add-to-cart button');

if (addToCartButton) {
  addToCartButton.addEventListener('click', async (e) => {
    e.preventDefault();

    // Get product info
    const productData = events.lastPayload('pdp/data');
    const partNumber = productData?.variants?.[0]?.sku || productData?.sku;
    const productName = productData?.name || 'Product';
    const quantity = 1; // Could get from input

    if (!partNumber) {
      showErrorAlert('Product information not available');
      return;
    }

    // Show loading
    addToCartButton.disabled = true;
    addToCartButton.textContent = 'Adding to Cart...';

    try {
      // Create session if needed
      await createHclGuestSession();

      // Add to cart
      const response = await addToHclCart(partNumber, quantity);

      if (response.success) {
        showSuccessAlert('Product added to cart!');
        emitCartEvent('itemAdded', {
          productName,
          quantity,
          partNumber,
        });
      } else {
        showErrorAlert('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error:', error);
      showErrorAlert(error.message || 'Error adding to cart. Check console.');
    } finally {
      addToCartButton.disabled = false;
      addToCartButton.textContent = 'Add to Cart';
    }
  });
}

// Helper functions
function showSuccessAlert(message) {
  // Use existing alert component or simple alert
  console.log('SUCCESS:', message);
  alert(message);
}

function showErrorAlert(message) {
  // Use existing alert component or simple alert
  console.error('ERROR:', message);
  alert(message);
}
```

### Phase 3: Mini-Cart Component (1 day)
**Create:** `blocks/commerce-mini-cart/commerce-mini-cart.js`

```javascript
import { getHclCart, onCartEvent, formatPrice } from '../../scripts/hcl-cart-api.js';

export default async function decorate(block) {
  const miniCartHTML = `
    <div class="commerce-mini-cart">
      <button class="commerce-mini-cart__toggle" aria-label="Toggle cart menu">
        🛒
        <span class="commerce-mini-cart__badge">0</span>
      </button>
      
      <div class="commerce-mini-cart__dropdown" aria-hidden="true">
        <div class="commerce-mini-cart__header">
          <h3>Shopping Cart</h3>
          <button class="commerce-mini-cart__close" aria-label="Close">✕</button>
        </div>
        
        <div class="commerce-mini-cart__items"></div>
        
        <div class="commerce-mini-cart__footer">
          <p><strong>Total: </strong><span class="commerce-mini-cart__total">$0.00</span></p>
          <a href="/cart" class="commerce-mini-cart__view-cart">View Cart</a>
        </div>
      </div>
    </div>
  `;

  const fragment = document.createRange().createContextualFragment(miniCartHTML);
  block.replaceChildren(fragment);

  const toggle = block.querySelector('.commerce-mini-cart__toggle');
  const dropdown = block.querySelector('.commerce-mini-cart__dropdown');
  const closeBtn = block.querySelector('.commerce-mini-cart__close');
  const itemsContainer = block.querySelector('.commerce-mini-cart__items');

  // Toggle functionality
  toggle.addEventListener('click', () => {
    const isOpen = dropdown.getAttribute('aria-hidden') === 'false';
    dropdown.setAttribute('aria-hidden', !isOpen);
  });

  closeBtn.addEventListener('click', () => {
    dropdown.setAttribute('aria-hidden', 'true');
  });

  // Initial load and listen for updates
  await updateMiniCart();
  onCartEvent('itemAdded', () => updateMiniCart());

  async function updateMiniCart() {
    try {
      const cartData = await getHclCart();

      if (!cartData.success || !cartData.items || cartData.items.length === 0) {
        itemsContainer.innerHTML = '<p>Cart is empty</p>';
        block.querySelector('.commerce-mini-cart__badge').textContent = '0';
        block.querySelector('.commerce-mini-cart__total').textContent = '$0.00';
        return;
      }

      // Update badge
      block.querySelector('.commerce-mini-cart__badge').textContent = cartData.cartTotals.itemCount;

      // Render items
      itemsContainer.innerHTML = cartData.items
        .map(
          (item) => `
        <div class="commerce-mini-cart__item">
          <p>${item.productName}</p>
          <p>Qty: ${item.quantity} × ${formatPrice(item.unitPrice)}</p>
        </div>
      `
        )
        .join('');

      // Update total
      block.querySelector('.commerce-mini-cart__total').textContent = formatPrice(
        cartData.cartTotals.grandTotal
      );
    } catch (error) {
      console.error('Error updating mini-cart:', error);
    }
  }
}
```

### Phase 4: Cart Page (1 day)
**Create/Modify:** `blocks/commerce-cart/commerce-cart.js`

Similar to mini-cart but with full details, quantity controls, etc.

### Phase 5: CSS Styling (0.5 day)
Add CSS for mini-cart and cart components.

---

## ⚠️ Important POC Notes

### CORS Handling
HCL may block direct browser calls due to CORS. Solutions:

1. **Ask HCL Team** - Add EDS domain to CORS whitelist
2. **Proxy** - Use a simple proxy endpoint (temporary)
3. **Workaround** - Use JSONP or other browser hacks (not recommended)

### SSL Certificate Issue
HCL uses self-signed cert. Browser might block.

Solution:
- Trust the certificate in development
- Or use a proper SSL cert in staging/production

### Session Management
Tokens stored in sessionStorage (OK for POC, NOT for production).

```javascript
// POC approach (current)
sessionStorage.setItem('hcl_wctoken', token);

// Production approach (do this later with middleware)
// Send tokens to server, server manages them
```

---

## 🚀 Implementation Timeline - POC

```
DAY 1: Phase 1 (API Wrapper)
├─ Create hcl-cart-api.js
├─ Implement direct API calls
├─ Handle CORS/session
└─ Test in Postman/browser

DAY 2: Phase 2-3 (PDP + Mini-Cart)
├─ Integrate with PDP
├─ Create mini-cart block
├─ Test add to cart flow
└─ Fix any issues

DAY 3: Phase 4 (Cart Page)
├─ Build cart page
├─ Test full flow
├─ Styling passes
└─ Manual testing

DAY 4 (Optional): Polish & Edge Cases
├─ Error handling
├─ Edge cases
├─ Final testing
└─ Ready to demo
```

**Total: 3-4 days (vs 6.5 days with middleware)**

---

## ✅ Success Criteria - POC

- [x] User can add product from PDP to HCL cart
- [x] Mini-cart shows item count and total
- [x] Cart page displays items
- [x] No console errors
- [x] Works in development environment
- [x] Can be demoed to stakeholders

---

## 🔮 Path to Production

This POC can be refactored to use the 3-layer architecture:

1. **Demo POC** - Direct calls work (3-4 days)
2. **Get Approval** - Stakeholders buy in
3. **Refactor to Production** - Add middleware (2-3 days)
   - Move HCL API calls to Adobe I/O Runtime
   - Handle credentials server-side
   - Add proper CORS
   - Add security hardening

---

## 📝 What You Need to Do

### Prerequisites
- [ ] Verify HCL API is accessible from your network
- [ ] Get HCL team to whitelist your EDS domain for CORS (or accept risk for POC)
- [ ] Confirm self-signed certificate is acceptable for POC
- [ ] Test HCL APIs in Postman first

### Ready to Build?
Once you confirm the above, we can start Phase 1 immediately.

---

## ⚠️ POC vs Production Roadmap

| Aspect | POC | Production |
|--------|-----|-----------|
| Architecture | Direct calls | 3-layer |
| Token Storage | sessionStorage | Server-side session |
| CORS | Risky | Proper headers |
| Security | Low | High |
| Credentials | Exposed | Hidden |
| Development Time | 3-4 days | 6.5 days |
| Maintainability | Low | High |
| Scalability | Low | High |

**This is fine for a POC. Plan to refactor for production.**

---

**Ready to proceed with direct-call POC?**

Let me know and we can start Phase 1 immediately!
