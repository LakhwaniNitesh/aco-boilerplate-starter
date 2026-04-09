# Exact Code Change - Add-to-Cart Fix

## File: `api/utils/hcl-client.js`

### Method: `addToCart()`

**Location:** Lines 155-180

---

## ❌ BEFORE (Causing 500 Error)

```javascript
async addToCart(accessToken, partNumber, quantity = 1) {
  try {
    const catalogId = process.env.HCL_CATALOG_ID || '10001';

    console.log(`[DEBUG] Adding to cart: partNumber=${partNumber}, qty=${quantity}, catalogId=${catalogId}, storeId=${this.storeId}`);

    return await this.request(
      'POST',
      `${this.baseUrl}/cart?langId=1&responseFormat=json`,
      {
        body: [
          {
            catalogId,                    // ← REMOVED (not needed)
            partNumber,
            quantity,
            storeId: this.storeId,        // ← REMOVED (not needed)
          },
        ],
      },
      accessToken
    );
  } catch (error) {
    console.error('❌ Add to cart failed:', error);
    throw {
      status: error.statusCode || 500,
      message: 'Failed to add product to cart',
      details: error,
    };
  }
}
```

---

## ✅ AFTER (Fixed)

```javascript
async addToCart(accessToken, partNumber, quantity = 1) {
  try {
    console.log(`[DEBUG] Adding to cart: partNumber=${partNumber}, qty=${quantity}`);

    // HCL Commerce API expects this exact structure for add to cart
    const requestBody = {
      body: [
        {
          partNumber,                   // ← ONLY these two fields
          quantity,                     // ← ONLY these two fields
        },
      ],
    };

    console.log(`[DEBUG] Cart request body: ${JSON.stringify(requestBody)}`);

    return await this.request(
      'POST',
      `${this.baseUrl}/cart?langId=1&responseFormat=json`,
      requestBody,
      accessToken
    );
  } catch (error) {
    console.error('❌ Add to cart failed:', error);
    throw {
      status: error.statusCode || 500,
      message: 'Failed to add product to cart',
      details: error,
    };
  }
}
```

---

## Changes Made

| Aspect                | Before                    | After                      |
| --------------------- | ------------------------- | -------------------------- |
| **catalogId field**   | Included in body          | Removed                    |
| **storeId field**     | Included in body          | Removed                    |
| **partNumber field**  | Included                  | Kept ✅                    |
| **quantity field**    | Included                  | Kept ✅                    |
| **Logging**           | Shows all fields          | Shows relevant fields only |
| **Response from HCL** | 500 Internal Server Error | 201 Created (Success!)     |

---

## Why These Fields Were Removed

### `catalogId`

- **Not needed** in request body - it's implied by the store's configuration
- **HCL doesn't require** it as an explicit field in POST body
- **Extra fields** cause HCL to reject the request with generic 500 error

### `storeId`

- **Already in URL path** → `/store/715842834/cart`
- **Redundant** to send it again in the body
- **Causes validation failure** when included in body

### What's Still Used

- `partNumber` - **Required** to identify which product to add
- `quantity` - **Required** to specify how many units to add
- `accessToken` - **Required** for authentication (passed as separate parameter, sent in Cookie header)

---

## Test Results

### Backend Logs - Before Fix

```
[DEBUG] Adding to cart: partNumber=CLA022_220101, qty=1, catalogId=10001, storeId=715842834
[DEBUG] POST https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1&responseFormat=json
[DEBUG] Auth: Cookie header with WCToken set
[DEBUG] Request body: {"body":[{"catalogId":"10001","partNumber":"CLA022_220101","quantity":1,"storeId":"715842834"}]}
[DEBUG] Response status: 500
[ERROR] HCL API returned 500: {"errors":[{"errorKey":"ERR_INTERNAL_SERVER_ERROR","errorMessage":"CWXFR0230E: Internal server error..."}]}
```

### Backend Logs - After Fix

```
[DEBUG] Adding to cart: partNumber=CLA022_220101, qty=1
[DEBUG] Cart request body: {"body":[{"partNumber":"CLA022_220101","quantity":1}]}
[DEBUG] POST https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1&responseFormat=json
[DEBUG] Auth: Cookie header with WCToken set
[DEBUG] Response status: 201
[CART-PROXY] ✓ Added to HCL cart. Items: 1, Total: $999.99
```

---

## Validation

✅ **Minimal Change** - Only removed unnecessary fields  
✅ **No Frontend Changes** - Backend handles internally  
✅ **Backward Compatible** - Existing code still works  
✅ **Tested** - Works with frontend and Postman  
✅ **Documented** - Clear logging of request body

---

## Commit Information

- **Commit Hash:** `f305855`
- **Date:** April 8, 2026
- **Files Modified:** 1 file
- **Lines Changed:** 16 insertions, 12 deletions
- **Message:** "fix: Simplify add-to-cart request body to match HCL Commerce expectations"

---

## Related Documentation

- `CART_500_ERROR_FINAL_FIX.md` - Full technical analysis
- `CART_500_FIXED.md` - Quick summary
- `CART_500_ERROR_QUICK_FIX.md` - Quick reference guide

---

**Status:** ✅ **COMPLETE AND TESTED**

Your add-to-cart functionality is now working correctly! 🛒
