# HCL Integration - Quick Console Commands

## Copy-Paste Ready Testing Commands

Open browser console (F12 → Console tab) and paste these commands:

---

## 1️⃣ Test: Session Management

### Create a new guest session
```javascript
import { createHclGuestSession } from '/scripts/hcl-commerce-api.js';
await createHclGuestSession();
```

**Expected:** See `[HCL] Guest session created successfully` in console

---

### Check if session exists
```javascript
import { HclSession } from '/scripts/hcl-commerce-api.js';
HclSession.hasValidSession();
```

**Expected:** Returns `true`

---

### View your current token
```javascript
import { HclSession } from '/scripts/hcl-commerce-api.js';
HclSession.getToken();
```

**Expected:** Shows a long string starting with `AAC` or similar

---

### Check user type
```javascript
import { HclSession } from '/scripts/hcl-commerce-api.js';
HclSession.isGuest();  // true for guest, false for authenticated
HclSession.isLoggedIn();  // opposite of above
```

---

### Clear session (start fresh)
```javascript
import { HclSession } from '/scripts/hcl-commerce-api.js';
HclSession.clear();
console.log('Session cleared');
```

---

## 2️⃣ Test: Add to Cart

### Add single product
```javascript
import { addToHclCart } from '/scripts/hcl-commerce-api.js';

// Replace 'CLA022_220601' with actual product part number
const result = await addToHclCart('CLA022_220601', 1);
console.log('Add to cart result:', result);
```

**Expected:**
```
Add to cart result: {
  success: true,
  orderId: "12345",
  orderItemId: "1",
  message: "Product added to cart successfully"
}
```

---

### Add multiple products (one by one)
```javascript
import { addToHclCart } from '/scripts/hcl-commerce-api.js';

await addToHclCart('CLA022_220601', 1);
console.log('✓ Product 1 added');

await addToHclCart('PROD_SKU_2', 2);
console.log('✓ Product 2 added (qty: 2)');

await addToHclCart('PROD_SKU_3', 1);
console.log('✓ Product 3 added');
```

---

## 3️⃣ Test: Get Cart

### Fetch your current cart
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';

const cart = await getHclCart();
console.log('Current cart:', cart);
```

**Expected:**
```
Current cart: {
  orderId: "12345",
  items: [
    {orderItemId: "1", partNumber: "CLA022_220601", quantity: 1, unitPrice: 99.99, ...}
  ],
  cartTotals: {subtotal: 99.99, shipping: 0, tax: 0, total: 99.99, currency: "USD"}
}
```

---

### Quick summary of cart
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';

const cart = await getHclCart();
console.log(`Cart has ${cart.items.length} items`);
console.log(`Total: $${cart.cartTotals.total}`);
cart.items.forEach((item, i) => {
  console.log(`  ${i+1}. ${item.partNumber} - qty: ${item.quantity} @ $${item.unitPrice}`);
});
```

---

### Check cart is not empty
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';

const cart = await getHclCart();
if (cart.items.length > 0) {
  console.log('✓ Cart has items');
} else {
  console.log('✗ Cart is empty');
}
```

---

## 4️⃣ Test: Remove from Cart

### Get first item's ID
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';

const cart = await getHclCart();
console.log('First item ID:', cart.items[0].orderItemId);
```

---

### Remove an item
```javascript
import { removeFromHclCart, getHclCart } from '/scripts/hcl-commerce-api.js';

// Get current cart first
let cart = await getHclCart();
const itemToRemove = cart.items[0];

// Remove it
const result = await removeFromHclCart(itemToRemove.orderItemId);
console.log('Remove result:', result);

// Verify it's gone
cart = await getHclCart();
console.log(`Cart now has ${cart.items.length} items`);
```

---

## 5️⃣ Test: Event Listening

### Listen for all HCL cart events
```javascript
const events = ['itemAdded', 'itemRemoved', 'itemUpdated', 'cartCleared', 'error'];

events.forEach(eventName => {
  document.addEventListener(`hcl:${eventName}`, (e) => {
    console.log(`🔔 [${eventName}]`, e.detail);
  });
});

console.log('Listening for: ' + events.join(', '));
console.log('Try adding/removing items to see events!');
```

---

### Listen for item added only
```javascript
document.addEventListener('hcl:itemAdded', (e) => {
  console.log('✅ Item added to cart:', {
    orderId: e.detail.orderId,
    itemId: e.detail.orderItemId,
    partNumber: e.detail.partNumber,
    quantity: e.detail.quantity
  });
});

console.log('Now add a product and watch this console!');
```

---

## 6️⃣ Test: Complete Workflow

### Full guest checkout flow
```javascript
import { 
  HclSession, 
  createHclGuestSession, 
  addToHclCart, 
  getHclCart,
  removeFromHclCart 
} from '/scripts/hcl-commerce-api.js';

console.log('=== HCL Checkout Flow Test ===\n');

// Step 1: Clear old session
HclSession.clear();
console.log('1️⃣ Cleared old session');

// Step 2: Create guest session
await createHclGuestSession();
console.log('2️⃣ Guest session created');
console.log(`   Token: ${HclSession.getToken().substring(0, 20)}...`);

// Step 3: Add products
console.log('\n3️⃣ Adding products...');
await addToHclCart('CLA022_220601', 1);
console.log('   ✓ Product 1 added');
await addToHclCart('CLA022_220601', 2);
console.log('   ✓ Product 2 added (qty 2)');

// Step 4: View cart
console.log('\n4️⃣ View cart:');
let cart = await getHclCart();
console.log(`   Order ID: ${cart.orderId}`);
console.log(`   Items: ${cart.items.length}`);
console.log(`   Total: $${cart.cartTotals.total}`);

// Step 5: Remove one item
if (cart.items.length > 0) {
  console.log('\n5️⃣ Removing first item...');
  await removeFromHclCart(cart.items[0].orderItemId);
  console.log('   ✓ Item removed');
}

// Step 6: Final cart
console.log('\n6️⃣ Final cart:');
cart = await getHclCart();
console.log(`   Items remaining: ${cart.items.length}`);
console.log(`   New total: $${cart.cartTotals.total}`);

console.log('\n✅ Test completed successfully!');
```

---

## 7️⃣ Test: Error Scenarios

### Test expired session recovery
```javascript
import { HclSession, addToHclCart } from '/scripts/hcl-commerce-api.js';

console.log('Testing session expiration...');

// Add product (creates session)
const result1 = await addToHclCart('CLA022_220601', 1);
console.log('First add: success =', result1.success);

// Manually expire the token
sessionStorage.removeItem('hcl_wctoken');
console.log('Manually expired token');

// Try to add another product (should auto-refresh)
console.log('Attempting add with expired token...');
const result2 = await addToHclCart('CLA022_220601', 1);
console.log('Second add: success =', result2.success);
console.log('(Should be true if auto-refresh worked)');
```

---

### Test invalid product
```javascript
import { addToHclCart } from '/scripts/hcl-commerce-api.js';

console.log('Testing invalid product...');
try {
  const result = await addToHclCart('INVALID_SKU_XXXXX', 1);
  console.log('Result:', result);
} catch (error) {
  console.log('Error caught:', error.message);
}
```

---

## 8️⃣ Debugging Commands

### See all stored session data
```javascript
console.table(sessionStorage);
```

**Shows:** All keys stored in browser session (tokens, order ID, etc.)

---

### Check Network requests in code
```javascript
// Add this before any HCL call
window.addEventListener('fetch', (e) => {
  if (e.request.url.includes('20.40.52.251')) {
    console.log('🌐 Fetch to HCL:', {
      method: e.request.method,
      url: e.request.url,
      headers: e.request.headers
    });
  }
});

// Now run your test
import { addToHclCart } from '/scripts/hcl-commerce-api.js';
await addToHclCart('CLA022_220601', 1);
```

---

### View recent Network requests
```javascript
// Open DevTools Network tab
// Filter by: https://20.40.52.251
// Click on each request to see:
// - Status code
// - Request headers (WCToken, etc.)
// - Response body (orderId, items, etc.)
```

---

### Export cart data to JSON
```javascript
import { getHclCart } from '/scripts/hcl-commerce-api.js';

const cart = await getHclCart();
const json = JSON.stringify(cart, null, 2);
console.log(json);

// Copy from console and paste into a file:
// Save as: cart-data.json
```

---

## 📋 Workflow Template

Save this as a bookmark and use it to test quickly:

```javascript
javascript:(async () => {
  const { createHclGuestSession, addToHclCart, getHclCart, HclSession } = 
    await import('/scripts/hcl-commerce-api.js');
  
  if (!HclSession.hasValidSession()) {
    await createHclGuestSession();
  }
  
  await addToHclCart('CLA022_220601', 1);
  const cart = await getHclCart();
  
  console.log('Cart:', cart);
  alert(`Cart has ${cart.items.length} items - Total: $${cart.cartTotals.total}`);
})();
```

**To use as bookmark:**
1. Right-click bookmark bar → "Add page"
2. Name: "HCL Quick Test"
3. URL: Paste the code above (keep `javascript:` prefix)
4. Click bookmark to run quick test

---

## 🎯 Testing Sequence (Recommended Order)

1. **First:** Session Management
   ```javascript
   import { createHclGuestSession } from '/scripts/hcl-commerce-api.js';
   await createHclGuestSession();
   ```

2. **Then:** Add to Cart
   ```javascript
   import { addToHclCart } from '/scripts/hcl-commerce-api.js';
   await addToHclCart('CLA022_220601', 1);
   ```

3. **Then:** Get Cart
   ```javascript
   import { getHclCart } from '/scripts/hcl-commerce-api.js';
   const cart = await getHclCart();
   console.log(cart);
   ```

4. **Then:** Test on Actual PDP
   - Navigate to a product page
   - Click "Add to Cart" button
   - Check console logs

5. **Finally:** Event Listening
   ```javascript
   document.addEventListener('hcl:itemAdded', (e) => {
     console.log('Item added!', e.detail);
   });
   ```

---

## ⚠️ Common Mistakes

❌ **Wrong import path:**
```javascript
// ❌ Wrong
import { addToHclCart } from 'hcl-commerce-api.js';

// ✅ Correct
import { addToHclCart } from '/scripts/hcl-commerce-api.js';
```

❌ **Missing `await` on async functions:**
```javascript
// ❌ Wrong (returns Promise)
const result = addToHclCart('SKU', 1);

// ✅ Correct
const result = await addToHclCart('SKU', 1);
```

❌ **Wrong part number format:**
```javascript
// ❌ Wrong
await addToHclCart('CLA022', 1);  // Incomplete SKU

// ✅ Correct
await addToHclCart('CLA022_220601', 1);  // Full part number
```

---

## ✅ Success Indicators

When testing, you should see:
- ✅ No red errors in console
- ✅ Logs starting with `[HCL]`
- ✅ Status 200 OK in Network tab
- ✅ Returned objects with `orderId`, `items`, `cartTotals`
- ✅ Tokens stored in sessionStorage
- ✅ Events emitted (`hcl:itemAdded`, etc.)

---

**Ready to test? Paste commands above and report back with results!** 🚀
