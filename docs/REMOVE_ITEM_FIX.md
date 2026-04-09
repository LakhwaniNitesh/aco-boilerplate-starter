# Remove Item Fix - Critical API Endpoint Correction

## Problem Identified

The remove item functionality was returning **404** because we were using the **wrong HTTP method and endpoint**.

### What We Were Doing (❌ Wrong)

```
DELETE /wcs/resources/store/715842834/cart/@self/cart_item/6560076?responseFormat=json
```

### What HCL Requires (✅ Correct)

```
PUT /wcs/resources/store/715842834/cart/@self/delete_order_item
```

## Key Differences

| Aspect                 | Wrong                        | Correct                            |
| ---------------------- | ---------------------------- | ---------------------------------- |
| **HTTP Method**        | DELETE                       | **PUT** ⚠️                         |
| **Endpoint Path**      | `/cart/@self/cart_item/{id}` | `/cart/@self/delete_order_item` ⚠️ |
| **Request Body**       | Null (no body)               | **JSON object required** ⚠️        |
| **Endpoint Parameter** | Item ID in URL path          | Item ID in request body ⚠️         |

## The Fix (Applied)

**File**: `api/utils/hcl-client.js`

**Method**: `removeFromCart()` (lines 449-489)

### Before:

```javascript
const removeUrl = `${this.baseUrl}/cart/@self/cart_item/${itemId}?responseFormat=json`;
const response = await this.request(
  "DELETE",
  removeUrl,
  null, // No body!
  accessToken,
  trustedToken,
);
```

### After:

```javascript
const deleteUrl = `${this.baseUrl}/cart/@self/delete_order_item`;

const requestBody = {
  calculateOrder: "1",
  calculationUsage: "-1,-2,-5,-6,-7",
  catalogId: "3074457345616692369",
  check: "*n",
  langId: "-1",
  orderId: ".", // Dot = current/active cart
  orderItemId: itemId,
  storeId: this.storeId,
};

const response = await this.request(
  "PUT", // Changed from DELETE
  deleteUrl,
  requestBody, // Now includes body
  accessToken,
  trustedToken,
);
```

## Request Body Explanation

| Field              | Value                 | Purpose                            |
| ------------------ | --------------------- | ---------------------------------- |
| `orderItemId`      | The item ID to remove | **Which item to delete**           |
| `orderId`          | "."                   | Current/active cart (dot notation) |
| `storeId`          | From env (715842834)  | **Which store**                    |
| `calculateOrder`   | "1"                   | Recalculate totals after removal   |
| `calculationUsage` | "-1,-2,-5,-6,-7"      | What to recalculate                |
| `catalogId`        | "3074457345616692369" | Standard catalog ID                |
| `check`            | "\*n"                 | Validation check parameter         |
| `langId`           | "-1"                  | Default language                   |

## Source

This fix is based on the **Postman CLI example** you provided, which shows the correct endpoint and body structure HCL Commerce expects:

```bash
PUT 'https://20.40.52.251/wcs/resources/store/715842834/cart/@self/delete_order_item'
```

## Next Steps

1. **Hard refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Restart backend server** (`npm run dev:backend`)
3. **Try removing an item again** - it should now work!
4. **Check backend console** for logs like:
   ```
   [HCL-CLIENT] Removing item 6560076 from cart 764613
   [HCL-CLIENT] PUT URL: https://20.40.52.251/wcs/resources/store/715842834/cart/@self/delete_order_item
   [HCL-CLIENT] Request body: {
     "calculateOrder": "1",
     "calculationUsage": "-1,-2,-5,-6,-7",
     ...
   }
   [HCL-CLIENT] ✓ Item removed successfully
   ```

## Why This Works

HCL Commerce's REST API design expects:

- **DELETE operations with item ID in URL** = Direct item deletion (not available)
- **PUT to `/delete_order_item`** = Proper cart modification endpoint that recalculates order

The PUT method is used because it's modifying the cart state (removing an item and recalculating totals), not just deleting a resource.

## Files Changed

- ✅ `api/utils/hcl-client.js` - `removeFromCart()` method updated

## Status

🟢 **READY FOR TESTING**

The code fix is complete and in place. The remove item functionality should now work correctly with HCL Commerce.
