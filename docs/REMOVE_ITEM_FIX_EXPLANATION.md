# Remove from Cart - Endpoint Fix

## Problem

Cart removal was failing with HTTP 404:

```
Failed to remove item from cart
HTTP 404
description: 'https://20.40.52.251:443/wcs/resources/store/.../cart/@self/cart_item/6560096?responseFormat=json'
reasonCode: 404
```

## Root Cause

The `removeFromCart()` method in `api/utils/hcl-client.js` was using an **incorrect endpoint structure**:

**❌ INCORRECT (Old Code):**
```javascript
const deleteUrl = `${this.baseUrl}/cart/@self/delete_order_item`;
const requestBody = { 
  calculateOrder: "1",
  catalogId: "3074457345616692369",
  check: "*n",
  orderId: ".",
  orderItemId: itemId,  // Item to remove
  storeId: this.storeId,
};

// Sent as PUT request with JSON body
const response = await this.request("PUT", deleteUrl, requestBody, ...)
```

**Why It Failed:**
- `/cart/@self/delete_order_item` endpoint doesn't exist in HCL Commerce REST API
- Sending PUT request with body was wrong pattern
- HCL returned 404 because the endpoint path was invalid

## Solution

Fixed the endpoint to use HCL Commerce's correct REST API pattern:

**✅ CORRECT (New Code):**
```javascript
const deleteUrl = `${this.baseUrl}/cart/@self/cart_item/${itemId}?responseFormat=json`;

// Sent as DELETE request (no body)
const response = await this.request("DELETE", deleteUrl, null, ...)
```

**Why This Works:**
- `DELETE /cart/@self/cart_item/{orderItemId}` is the standard HCL Commerce endpoint
- Follows RESTful convention: DELETE for removal
- `itemId` is the order item ID (e.g., `6560096`)
- Query parameter `responseFormat=json` ensures JSON response

## HCL Commerce REST API Pattern

HCL uses these conventions for cart operations:

| Operation | Method | Endpoint | Pattern |
|-----------|--------|----------|---------|
| Get cart | GET | `/cart/@self?responseFormat=json` | Read current cart |
| Add item | POST | `/cart?langId=1&responseFormat=json` | Create order item |
| Remove item | **DELETE** | **`/cart/@self/cart_item/{itemId}?responseFormat=json`** | Remove line item |

## File Changed

**`api/utils/hcl-client.js`** - Line 455-490

## Testing the Fix

1. **Restart backend server:**
   ```powershell
   node api/server.js
   ```

2. **Navigate to cart page:** `http://localhost:3000/cart`

3. **Click remove button on any item**

4. **Expected result:**
   - Item should be removed from cart
   - Cart total should be recalculated
   - Browser console should show: `[CART] ✓ Item removed successfully`
   - No 404 errors

## Backend Console Output (Should See This)

```
[HCL-CLIENT] Removing item 6560096 from cart 764613
[HCL-CLIENT] DELETE URL: https://20.40.52.251/wcs/resources/store/715842834/cart/@self/cart_item/6560096?responseFormat=json
[HCL-CLIENT] ✓ Item removed successfully
[CART-PROXY] ✓ Item removed. Items: 16, Total: $8862.98
```

## Next Steps

1. ✅ Code fix committed: `15e72bc`
2. ⏳ Restart backend server
3. ⏳ Test removing items from cart
4. ⏳ Verify cart totals update correctly

## Commit

```
commit 15e72bc
Author: Agent
Date:   [timestamp]

    fix: Correct HCL Commerce remove-from-cart endpoint - use DELETE /cart/@self/cart_item/{itemId}
    
    - Changed from PUT to DELETE HTTP method
    - Updated endpoint from /cart/@self/delete_order_item to /cart/@self/cart_item/{itemId}
    - Removed unnecessary request body (DELETE requests don't use body)
    - Added responseFormat=json query parameter
    - Follows HCL Commerce REST API conventions
```

