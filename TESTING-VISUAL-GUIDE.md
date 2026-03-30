# HCL Integration Testing - Visual Flow Guide

## Overall Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AEM Boilerplate Storefront                   │
│                  (Running on localhost:3000)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │     PDP      │    │     PLP      │    │   Mini-Cart  │      │
│  │   (Product   │    │   (Product   │    │   (Display   │      │
│  │   Details)   │    │   Listing)   │    │    Cart)     │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         │ Click "Add to     │ Click "Add to    │ Listen to     │
│         │ Cart" Button      │ Cart" Button     │ hcl:itemAdded │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                    │
│        ┌────────────────────▼────────────────────┐              │
│        │  hcl-commerce-api.js (Core Module)     │              │
│        │  ✓ Session Management                  │              │
│        │  ✓ Add to Cart Logic                   │              │
│        │  ✓ Get Cart Logic                      │              │
│        │  ✓ Event System                        │              │
│        └────────────────────┬────────────────────┘              │
│                             │                                    │
│                             │ HTTP Requests                      │
│                             │ (with WCToken headers)            │
│                             │                                    │
└─────────────────────────────┼──────────────────────────────────┘
                              │
                              │ 🌐 INTERNET
                              │
                              ▼
                    ┌──────────────────────┐
                    │  HCL Commerce API    │
                    │  20.40.52.251        │
                    ├──────────────────────┤
                    │ POST /guestidentity  │
                    │ POST /cart           │
                    │ GET /cart/@self      │
                    │ DELETE /cart/item    │
                    │ PUT /cart/item       │
                    └──────────────────────┘
```

---

## Phase 2: Session Management Testing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Browser Console                               │
└─────────────────────────────────────────────────────────────────┘

Step 1: Import Module
─────────────────────
  import { createHclGuestSession } from '/scripts/hcl-commerce-api.js'
         │
         ▼
         Module loads successfully (no import errors)

Step 2: Check if Session Exists
─────────────────────────────────
  HclSession.hasValidSession()
         │
         ▼
         Returns: false (no session yet)

Step 3: Create Guest Session
──────────────────────────────
  await createHclGuestSession()
         │
         ├─► Sends POST to https://20.40.52.251/wcs/resources/store/715842834/guestidentity
         │
         ▼
  ✓ Receives WCToken & WCTrustedToken
         │
         ├─► Stores in sessionStorage (browser local storage)
         │
         ├─► Emits 'hcl:sessionCreated' event
         │
         ▼
  Console Output:
  "[HCL] Creating guest session..."
  "[HCL] Guest session created successfully"

Step 4: Verify Session is Stored
──────────────────────────────────
  HclSession.hasValidSession()
         │
         ▼
         Returns: true ✅

  HclSession.getToken()
         │
         ▼
         Returns: "AAC2345...xxx" (long token string)

  HclSession.isGuest()
         │
         ▼
         Returns: true ✅
```

---

## Phase 3: Add to Cart Testing Flow

```
┌──────────────────────────────────────────────────────────────┐
│              Console or PDP Button Click                      │
└──────────────────────────────────────────────────────────────┘

await addToHclCart('CLA022_220601', 1)
         │
         ▼
    ┌─────────────────────────────────┐
    │  Check if session exists?       │
    └─────────────────────────────────┘
         │
         ├─► Yes → Go to Step 2
         │
         └─► No → Create guest session first
              │
              ▼
              await createHclGuestSession()
              │
              ▼ (continues to Step 2)

Step 2: Prepare Request
─────────────────────────
  POST https://20.40.52.251/wcs/resources/store/715842834/cart
  Headers:
    Content-Type: application/json
    WCToken: [stored token]
    WCTrustedToken: [stored token]
  Body:
    {
      "orderId": ".",
      "orderItem": [{
        "quantity": "1",
        "partNumber": "CLA022_220601"
      }],
      "x_inventoryValidation": true
    }

Step 3: Send Request
─────────────────────
  Fetch API sends request → HCL Server processes
         │
         ▼
         ┌─────────────────┬─────────────────┐
         │                 │                 │
      200 OK          403 Forbidden      4xx/5xx
         │                 │                 │
         ▼                 ▼                 ▼
    Product added   Token expired      Invalid request
    to cart!        → Auto-refresh     → Show error
         │          → Retry
         ▼
    ✅ Success Response:
    {
      "orderId": "12345",
      "orderItem": [{
        "orderItemId": "1",
        "partNumber": "CLA022_220601",
        "quantity": 1,
        "unitPrice": 99.99
      }]
    }

Step 4: Store Order ID
───────────────────────
  HclSession.setOrderId("12345")
         │
         ▼
    Stored in sessionStorage for future cart operations

Step 5: Emit Event
──────────────────
  CustomEvent: 'hcl:itemAdded'
  Detail: { orderId, orderItemId, partNumber, quantity, ... }
         │
         ▼
    Mini-cart listens for this event
    Mini-cart updates display automatically

Step 6: Return Result
──────────────────────
  {
    success: true,
    orderId: "12345",
    orderItemId: "1",
    message: "Product added to cart successfully"
  }

Console Output:
"[HCL] Product added to cart successfully"
"[HCL Event] itemAdded: {...details...}"
```

---

## Phase 4: Get Cart Testing Flow

```
const cart = await getHclCart()
         │
         ▼
    GET https://20.40.52.251/wcs/resources/store/715842834/cart/@self
    Headers: [WCToken, WCTrustedToken]
         │
         ▼
    HCL Server returns cart details
         │
         ▼
    Transform HCL Response → Standard Format
    ┌─────────────────────────────────────┐
    │  Parse orderItem[] array            │
    │  Extract prices and calculate total │
    │  Format currency                    │
    │  Calculate totals (subtotal, tax)   │
    └─────────────────────────────────────┘
         │
         ▼
    ✅ Return standardized cart object:
    {
      orderId: "12345",
      items: [
        {
          orderItemId: "1",
          partNumber: "CLA022_220601",
          description: "Product Name",
          quantity: 1,
          unitPrice: 99.99,
          totalPrice: 99.99
        }
      ],
      cartTotals: {
        subtotal: 99.99,
        shipping: 0,
        tax: 0,
        total: 99.99,
        currency: "USD"
      }
    }
```

---

## Phase 5: Mini-Cart Real-Time Update Flow

```
User adds product on PDP
         │
         ▼
    addToHclCart() emits 'hcl:itemAdded' event
         │
         ▼
    hcl-mini-cart-integration.js listens for event
         │
         ├─► Event listener triggered
         │
         ▼
    Calls getHclCart() to fetch latest cart
         │
         ▼
    Transforms data for display
         │
         ▼
    Updates DOM:
    - Item count badge (e.g., "3 items")
    - Item list (product names, qty, price)
    - Cart total
         │
         ▼
    ✅ Mini-cart displays updated cart in real-time
    (all without page refresh!)
```

---

## Network Tab Inspection

When you click "Add to Cart", you should see this in DevTools Network tab:

```
Request:
  Method: POST
  URL: https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1
  Status: 200 OK ✅
  
Headers (Request):
  Content-Type: application/json
  WCToken: AAC2345...xxx
  WCTrustedToken: AAEX...xxx
  
Body (Request):
  {
    "orderId": ".",
    "orderItem": [{"quantity": "1", "partNumber": "CLA022_220601"}],
    "x_inventoryValidation": true
  }

Response:
  Status: 200 OK ✅
  Content-Type: application/json
  
Body (Response):
  {
    "orderId": "12345",
    "orderItem": [
      {
        "orderItemId": "1",
        "partNumber": "CLA022_220601",
        "quantity": 1,
        "price": 99.99
      }
    ],
    "orderTotal": 99.99
  }
```

---

## Debugging Checklist

Use this to troubleshoot issues:

```
❌ Import fails?
   └─ Check file path is correct
   └─ Verify file exists in scripts/ folder
   └─ Check for typos in filename

❌ CORS error?
   └─ Check Network tab → see if request was blocked
   └─ Contact HCL team → whitelist your domain
   └─ For localhost: whitelist http://localhost:3000

❌ 403 Forbidden?
   └─ Session expired → Call createHclGuestSession() again
   └─ Invalid token → Clear sessionStorage and restart

❌ Product not found?
   └─ Verify part number is correct
   └─ Check with HCL team for valid SKUs
   └─ Example format: CLA022_220601

❌ Mini-cart not updating?
   └─ Check Console for 'hcl:itemAdded' event
   └─ Verify mini-cart block selector is correct
   └─ Check if JavaScript file was loaded

❌ No logs in Console?
   └─ Check if console.log() calls exist in code
   └─ Verify files are imported correctly
   └─ Check browser console level (not filtered)
```

---

## Expected Console Output Examples

### ✅ Successful Guest Session

```
[HCL] Creating guest session...
[HCL] Guest session created successfully
[HCL Event] sessionCreated: {WCToken: "AAC2345...", WCTrustedToken: "AAEX..."}
```

### ✅ Successful Add to Cart

```
[HCL] Adding to cart: CLA022_220601 (qty: 1)
[HCL] Product added to cart successfully
[HCL Event] itemAdded: {
  orderId: "12345",
  orderItemId: "1",
  partNumber: "CLA022_220601",
  quantity: 1,
  message: "Product added to cart successfully"
}
```

### ✅ Successful Get Cart

```
[HCL] Fetching cart: 12345
[HCL] Cart fetched successfully
Cart: {
  orderId: "12345",
  items: Array(1),
  cartTotals: {subtotal: 99.99, shipping: 0, tax: 0, total: 99.99}
}
```

### ❌ Error: CORS Not Allowed

```
Access to XMLHttpRequest at 'https://20.40.52.251/...' from origin
'http://localhost:3000' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
[HCL] Error: Failed to create guest session
```

### ❌ Error: Invalid Part Number

```
[HCL] Adding to cart: INVALID_SKU (qty: 1)
[HCL Error] Product not found or inventory not available
[HCL Event] error: {message: "Product not found or inventory not available", ...}
```

---

## Summary

1. **Start with Phase 2** - Session Management
   - Verify you can create a guest session
   - Check tokens are stored

2. **Then Phase 3** - Add to Cart
   - Add a product via console
   - Verify it appears in cart response

3. **Then Phase 4** - Get Cart
   - Fetch cart and verify all items

4. **Then Phase 5** - Mini-Cart
   - Add product on PDP
   - Watch mini-cart update automatically

5. **Final Check**
   - No CORS errors
   - No 403 errors
   - All console logs show [HCL] prefix
   - Cart data matches between add and get operations

Good luck! Report back with any errors you see! 🚀
