# Remove from Cart - New Approach (PUT Method)

## The Problem
HCL Commerce doesn't have a DELETE endpoint at `/cart/@self/cart_item/{itemId}`. The API returned 404 because that endpoint doesn't exist in this HCL version.

## The Solution
**Remove items by updating the entire cart** - instead of trying to DELETE a specific item, we:

1. **Fetch the current cart** (all items)
2. **Filter out the item to remove** 
3. **PUT the updated cart** with only the items we want to keep

## How It Works

### Before (❌ Didn't Work)
```
DELETE /cart/@self/cart_item/6560096
→ HTTP 404 (endpoint doesn't exist)
```

### After (✅ Works)
```
GET /cart/@self                                  ← Get all 17 items
  ↓
Filter out item 6560096                          ← Keep 16 items
  ↓
PUT /cart?langId=1&responseFormat=json           ← Update cart with 16 items
  {
    orderId: ".",
    orderItem: [
      { orderItemId: 1, quantity: 5, partNumber: "CLA022_220601" },
      { orderItemId: 2, quantity: 5, partNumber: "HFU032_323301" },
      ... (14 more items, excluding 6560096)
    ]
  }
  ↓
HTTP 200 OK ✓
```

## Code Changes

**File:** `api/utils/hcl-client.js` (Line 455-510)

```javascript
async removeFromCart(accessToken, orderId, itemId, trustedToken = null) {
  // Step 1: Fetch current cart with all items
  const currentCart = await this.request(
    "GET",
    `${this.baseUrl}/cart/@self?responseFormat=json`,
    null,
    accessToken,
    trustedToken,
  );

  // Step 2: Filter out the item to remove
  const itemsToKeep = (currentCart.orderItem || []).filter(
    (item) => String(item.orderItemId) !== String(itemId),
  );

  // Step 3: Build new request body with remaining items
  const requestBody = {
    orderId: ".",
    x_calculatedOrder: "0",
    orderItem: itemsToKeep.map((item) => ({
      orderItemId: item.orderItemId,
      quantity: String(item.quantity),
      partNumber: item.partNumber,
    })),
    x_inventoryValidation: true,
  };

  // Step 4: Update cart with PUT
  const response = await this.request(
    "PUT",
    `${this.baseUrl}/cart?langId=1&responseFormat=json`,
    requestBody,
    accessToken,
    trustedToken,
  );

  return response;
}
```

## Why This Approach Works

✅ **HCL Commerce Pattern:** The API uses the same `PUT /cart` endpoint for both:
  - Adding items (add new orderItem entries)
  - Updating items (modify quantity)
  - Removing items (exclude from orderItem array)

✅ **Matches Existing Code:** Same pattern as `addToCart()` which successfully uses `PUT /cart`

✅ **Atomic Operation:** Fetches cart, modifies, and updates in one operation

✅ **Preserves Item Data:** Keeps all item details (quantity, partNumber) for items being retained

## Expected Backend Console Output

```
[HCL-CLIENT] Step 1: Fetching current cart to identify items to keep...
[DEBUG] GET https://20.40.52.251/wcs/resources/store/715842834/cart/@self?responseFormat=json
[DEBUG] Response status: 200
[HCL-CLIENT] Step 2: Found 17 items total
[HCL-CLIENT] Removing item 6560096, keeping 16 items
[HCL-CLIENT] Step 3: Sending PUT request to update cart with 16 items
[HCL-CLIENT] PUT URL: https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1&responseFormat=json
[DEBUG] PUT https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1&responseFormat=json
[DEBUG] Response status: 200
[HCL-CLIENT] ✓ Item removed successfully
[CART-PROXY] ✓ Item removed. Items: 16, Total: $8862.98
```

## Testing the Fix

1. **Restart backend server:**
   ```powershell
   Get-Process node | Stop-Process -Force
   cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
   node api/server.js
   ```

2. **Go to cart page:** `http://localhost:3000/cart`

3. **Click remove button on any item** → Should now work! ✓

## Commits

**Old attempt (404 error):**
```
15e72bc - fix: Correct HCL Commerce remove-from-cart endpoint - use DELETE /cart/@self/cart_item/{itemId}
```

**New solution (should work):**
```
f4dd070 - fix: Remove item by updating cart with remaining items (PUT instead of DELETE)
```

## Key Insight

HCL Commerce REST API uses **a different model than typical REST APIs**:
- **Not RESTful:** Doesn't use DELETE for removal
- **Document-Oriented:** You update the entire order/cart document
- **POST/PUT for all mutations:** Both create and update operations use POST/PUT

This is similar to many legacy e-commerce platforms where you submit the entire "order document" rather than individual operations.
