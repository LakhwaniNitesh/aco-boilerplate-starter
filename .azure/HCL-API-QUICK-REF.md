# HCL Commerce Integration - Quick Reference

## Getting Started

### 1. Initialize HCL Cart (in scripts.js)

```javascript
import { initializeHclCart } from './initializers/hcl-cart.js';

// Call after all blocks are decorated
initializeHclCart();
```

### 2. API Functions

#### Create Guest Session
```javascript
import { createHclGuestSession } from './hcl-commerce-api.js';

await createHclGuestSession();
// Auto-stores tokens in sessionStorage
```

#### Add Product to Cart
```javascript
import { addToHclCart } from './hcl-commerce-api.js';

const result = await addToHclCart('PART_NUMBER', quantity);
// Returns: { success: true, orderId, orderItemId }
```

#### Get Cart Data
```javascript
import { getHclCart } from './hcl-commerce-api.js';

const cart = await getHclCart();
// Returns: { items: [], cartTotals: {} }
```

#### Remove Item
```javascript
import { removeFromHclCart } from './hcl-commerce-api.js';

await removeFromHclCart('ORDER_ITEM_ID');
```

#### Update Quantity
```javascript
import { updateHclCartItemQuantity } from './hcl-commerce-api.js';

await updateHclCartItemQuantity('ORDER_ITEM_ID', 5);
```

### 3. Event System

#### Listen for Events
```javascript
import { onCartEvent } from './hcl-commerce-api.js';

const unsubscribe = onCartEvent('itemAdded', (detail) => {
  console.log('Item added:', detail);
});

// Clean up when done
unsubscribe();
```

#### Emit Events
```javascript
import { emitCartEvent } from './hcl-commerce-api.js';

emitCartEvent('itemAdded', { partNumber: 'ABC123', quantity: 1 });
```

#### Available Events
- `itemAdded` - Product added to cart
- `itemRemoved` - Product removed from cart
- `itemUpdated` - Item quantity changed
- `cartUpdated` - General cart refresh
- `error` - Error occurred

### 4. Session Management

#### Check Session Status
```javascript
import { HclSession } from './hcl-commerce-api.js';

HclSession.hasValidSession()   // true/false
HclSession.isLoggedIn()        // true/false
HclSession.isGuest()           // true/false
HclSession.getToken()          // WC token
HclSession.getTrustedToken()   // Trusted token
```

#### Set Authenticated Session (after user login)
```javascript
import { setAuthenticatedSession } from './hcl-commerce-api.js';

// Call after user logs in with their tokens
setAuthenticatedSession(wcToken, wcTrustedToken, userId);
```

#### Clear Session
```javascript
import { HclSession } from './hcl-commerce-api.js';

HclSession.clear(); // Logout
```

### 5. Formatting

#### Format Price
```javascript
import { formatPrice } from './hcl-commerce-api.js';

const formatted = formatPrice('45.00');  // "$45.00"
```

## Common Patterns

### Pattern 1: Auto-create Session on First Add

```javascript
async function addToCart(partNumber) {
  if (!HclSession.hasValidSession()) {
    await createHclGuestSession();
  }
  return addToHclCart(partNumber, 1);
}
```

### Pattern 2: Update Mini-Cart on Changes

```javascript
onCartEvent('itemAdded', updateMiniCart);
onCartEvent('itemRemoved', updateMiniCart);
onCartEvent('itemUpdated', updateMiniCart);

async function updateMiniCart() {
  const cart = await getHclCart();
  document.querySelector('.badge').textContent = cart.cartTotals.itemCount;
}
```

### Pattern 3: Error Handling

```javascript
try {
  await addToHclCart(partNumber, qty);
} catch (error) {
  if (error.message.includes('403')) {
    // Session expired
    HclSession.clear();
    await createHclGuestSession();
    // Retry
  } else if (error.message.includes('inventory')) {
    // Out of stock
    showError('Product out of stock');
  } else {
    showError(error.message);
  }
}
```

### Pattern 4: Guest & Authenticated Both

```javascript
// Auto-detect user type
if (isUserLoggedIn()) {
  // Tokens already set by setAuthenticatedSession()
  await addToHclCart(partNumber, 1);
} else {
  // Guest checkout
  await createHclGuestSession();
  await addToHclCart(partNumber, 1);
}
```

## Constants

```javascript
// In hcl-commerce-api.js
const HCL_API_HOST = '20.40.52.251';
const HCL_STORE_ID = '715842834';
const HCL_LANG_ID = '1';
const HCL_PROTOCOL = 'https';
```

## Debugging

### View Current Cart
```javascript
const cart = await getHclCart();
console.table(cart.items);
console.log('Total:', cart.cartTotals.grandTotal);
```

### Check Session
```javascript
HclSession.getToken();
HclSession.getTrustedToken();
HclSession.isLoggedIn();
```

### Monitor Events
```javascript
onAnyCartEvent((eventName, detail) => {
  console.log(`[Event] ${eventName}:`, detail);
});
```

### Browser Network Tab
- POST `/guestidentity` - Create session
- POST `/cart` - Add item
- GET `/cart/@self` - Get cart
- DELETE `/cart/@self/orderitem/{id}` - Remove item

## Troubleshooting

### "No valid session"
```javascript
// Create new session
await createHclGuestSession();
```

### "403 Forbidden"
```javascript
// Session expired, clear and recreate
HclSession.clear();
await createHclGuestSession();
```

### "CORS error"
```javascript
// Contact HCL team - domain not whitelisted
// Temporarily use proxy in dev
```

### "Product not found"
```javascript
// Verify SKU/part number
// Check: addToHclCart('CORRECT_SKU', 1);
```

---

See `HCL-INTEGRATION-GUIDE.md` for full documentation.
