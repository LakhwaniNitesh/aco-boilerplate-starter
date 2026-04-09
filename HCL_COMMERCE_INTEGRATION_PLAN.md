# HCL Commerce Integration Technical Development Plan

**Project**: EDS Storefront + ACO Catalog + HCL Commerce Integration  
**Date**: April 5, 2026  
**Status**: Planning & Approval  
**Owner**: Development Team

---

## 1. Executive Summary

This document outlines the technical architecture and development plan for integrating an **Edge Delivery Services (EDS) Storefront** with **HCL Commerce** as the commerce engine. The storefront will use **ACO (Adobe Commerce on Cloud)** for catalog/product data and **HCL Commerce** for cart, order, and checkout operations.

### Key Objectives

- ✅ Enable "Add to Cart" functionality from EDS Storefront → HCL Commerce
- ✅ Create guest sessions in HCL Commerce for unauthenticated users
- ✅ Validate product availability and inventory in HCL Commerce
- ✅ Synchronize cart state between EDS Storefront and HCL Commerce
- ✅ Display mini-cart and full cart information from HCL Commerce
- ✅ Support checkout flow integration with HCL Commerce

### Technology Stack

- **Frontend**: EDS (Edge Delivery Services) Storefront
- **Catalog Backend**: ACO (Adobe Commerce on Cloud) - Catalog Service
- **Commerce Backend**: HCL Commerce (v9.1+)
- **Integration Pattern**: Direct API integration (POC approach)

---

## 2. Architecture Overview

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    EDS STOREFRONT (Frontend)                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │  Product List    │  │  Product Detail  │  │   Mini Cart      │
│  │      Page        │  │      Page        │  │     Header       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│              │                  │                      │
│              └──────────────────┼──────────────────────┘
│                         │
│         ┌───────────────┴───────────────┐
│         ▼                               ▼
│  ┌──────────────────────────┐  ┌──────────────────────────┐
│  │  Cart Manager Service    │  │  HCL Commerce API Client │
│  │  (ClientJS Module)       │  │  (Service Layer)         │
│  └──────────────────────────┘  └──────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────────┐  ┌──────────────────────────────────┐
│   ACO Catalog Service   │  │  HCL Commerce API Gateway        │
│   (Product Data)        │  │  (Cart, Order, Inventory Mgmt)   │
│   - Product Details     │  │  - POST: Add to Cart             │
│   - Images              │  │  - GET: Cart Info                │
│   - Pricing (Catalog)   │  │  - PUT: Update Order Item        │
│   - Inventory Status    │  │  - Authentication (Session)      │
└─────────────────────────┘  └──────────────────────────────────┘
```

### 2.2 Data Flow - Add to Cart

```
User clicks "Add to Cart"
        │
        ▼
EDS Storefront
  - Get product details (from ACO/local state)
  - Call HCL Commerce Add to Cart API
        │
        ├─ Create/use guest session (WCToken, WCTrustedToken)
        │
        ├─ POST /wcs/resources/store/{storeId}/cart
        │  Body: { orderId: ".", productId/partNumber, quantity }
        │
        ▼
HCL Commerce Backend
  - Validate product exists
  - Check inventory (x_inventoryValidation: true)
  - Create/add to guest cart (orderId)
  - Return: { orderId, orderItem[].orderItemId }
        │
        ▼
EDS Storefront
  - Update mini-cart in header
  - Show confirmation message
  - Store cart state (sessionStorage/Redux)
  - Optionally update cart page (if open)
```

---

## 3. Detailed Feature Requirements

### 3.1 Feature 1: Add to Cart (PLP/PDP)

**Requirement**: Users can add products to cart from Product Listing Page or Product Details Page

**Technical Requirements**:

1. **Product Selection**
   - Product comes from ACO Catalog Service
   - Quantity selection (default: 1)
   - SKU/ProductId available from ACO product data

2. **HCL Commerce API Call**
   - **Endpoint**: `POST https://{aurora-host}/wcs/resources/store/{adobe-storeId}/cart?langId=1`
   - **Headers**:
     - `WCToken`: Retrieved from session/guest login
     - `WCTrustedToken`: Retrieved from session/guest login
     - `Content-Type: application/json`
     - `Accept: application/json`
   - **Body**:
     ```json
     {
       "orderId": ".",
       "x_calculateOrder": "0",
       "x_inventoryValidation": true,
       "orderItem": [
         {
           "quantity": "1",
           "productId": "3074457345619160265" // OR partNumber
         }
       ]
     }
     ```

3. **Response Handling**
   - Success: `orderId` and `orderItem[0].orderItemId` returned
   - Store: `cartState = { orderId, orderItems[productId] = orderItemId }`
   - Error Scenarios:
     - Product not found → Display "Product unavailable"
     - Out of stock → Display "Out of stock"
     - Invalid quantity → Display "Invalid quantity"
     - API error (timeout, 500, etc.) → Display "Unable to add to cart, try again"

**UI Changes**:

- ✅ "Add to Cart" button on PLP products
- ✅ "Add to Cart" button on PDP with quantity selector
- ✅ Loading state (spinner) during API call
- ✅ Success toast notification
- ✅ Error toast notification
- ✅ Mini-cart badge updates (item count)

**Data Mapping**:
| ACO Field | HCL Field | Notes |
|-----------|-----------|-------|
| `product.sku` | `productId` or `partNumber` | Use productId if available, fallback to partNumber |
| `product.id` | `productId` | Adobe Commerce product ID |
| User input | `quantity` | Min 1, max based on inventory |
| Auto-generate | `orderId` | "." for guest/new cart |

---

### 3.2 Feature 2: Inventory & Product Validation

**Requirement**: Verify product exists in HCL Commerce and can be purchased before confirming cart addition

**Technical Implementation**:

1. **Pre-flight Validation** (Optional, POC v1 can skip)
   - Could call product detail API from HCL to verify stock
   - For MVP: Rely on `x_inventoryValidation: true` in Add to Cart call

2. **Response Validation** (Mandatory)
   - If `orderItem.comment` contains error message → Display error
   - If API returns 400/404 → Product not found in HCL
   - If API returns 409 → Inventory conflict
   - Success = HTTP 201 + valid orderId response

3. **Inventory Sync** (Future Enhancement)
   - ACO shows product availability (from Catalog Service)
   - HCL Commerce provides actual stock levels
   - Consider showing both "ACO availability" and "HCL stock status"

---

### 3.3 Feature 3: Authentication & Token Management

**Requirement**: Authenticate with HCL Commerce using provided credentials and maintain session tokens

**Technical Implementation**:

1. **Initial Authentication** (On page load or explicit login)
   - **Endpoint**: `POST https://{aurora-host}/wcs/resources/store/{adobe-storeId}/loginidentity?responseFormat=json`
   - **Credentials** (POC):
     ```json
     {
       "logonId": "auroraadobetest",
       "logonPassword": "passw0rd"
     }
     ```
   - **Response**: `{ WCToken, WCTrustedToken, ... }`
   - Store in: `sessionStorage['hcl_wc_token']`, `sessionStorage['hcl_wc_trusted_token']`
   - TTL: Depends on HCL configuration (typically 30-60 min)

2. **Token Refresh Strategy**
   - Check token age before API calls
   - If expired (> 25 min): Re-authenticate with credentials
   - Handle 401 response from HCL → Refresh tokens → Retry original request
   - Cache tokens for session duration to minimize login calls

3. **Token Storage Security** (POC Approach)
   - ✅ Store in `sessionStorage` (cleared on browser close)
   - ✅ Store credentials encrypted in sessionStorage for re-auth (POC only)
   - ⚠️ **NOTE**: For production, move credentials to backend proxy (never expose in client)
   - ❌ Do NOT store credentials in localStorage (persistent = security risk)
   - ❌ Do NOT log tokens in console (even in dev)

4. **Backend Proxy Setup** (Future - Required for Production)
   - Create backend endpoint: `POST /api/hcl-auth`
   - Backend calls HCL `/loginidentity` with credentials
   - Backend returns tokens to client
   - **Benefit**: Credentials never exposed to client
   - **Timeline**: Implement in Phase 2 before production

**Error Handling**:

```javascript
// Token expired or invalid
if (response.status === 401 || response.status === 403) {
  // Attempt to refresh tokens
  const tokens = await refreshHCLSession();
  if (tokens) {
    // Retry add to cart with new tokens
    return retryAddToCart();
  } else {
    // Auth failed, show login prompt
    showAuthError("Session expired. Please refresh page.");
  }
}
```

---

### 3.4 Feature 4: Mini-Cart Display (Header)

**Requirement**: Show cart summary in header with product count, subtotal, and quick view

**Technical Implementation**:

1. **Data to Display**
   - Item count: `response.orderItem.length`
   - Subtotal: `response.totalProductPrice`
   - Currency: `response.totalProductPriceCurrency`
   - Quick item list: First 3 items with image/name/price

2. **Data Fetching**
   - After successful "Add to Cart" → Update mini-cart immediately with response
   - On page refresh → Call `GET /wcs/resources/store/{storeId}/cart/@self`
   - On cart page view → Refresh from HCL before displaying

3. **UI Display**

   ```
   Header Mini-Cart
   ┌──────────────────────────┐
   │  🛒 Cart (3 items)       │
   │  ├─ Product 1  $45.00    │
   │  ├─ Product 2  $40.00    │
   │  ├─ Product 3  $30.00    │
   │  │  ...                  │
   │  ├─ Subtotal: $115.00    │
   │  └─ [View Cart] [Checkout]
   └──────────────────────────┘
   ```

4. **State Management**
   - Store cart state in Redux/Context: `{ orderId, orderItems[], totals }`
   - Update on: Add to Cart, Remove Item, Update Quantity
   - Persist: `sessionStorage['hcl_cart_state']` (survive page refresh)

---

### 3.5 Feature 5: Cart Page Display

**Requirement**: Full cart page showing all items with ability to modify quantities and checkout

**Technical Implementation**:

1. **Cart Data Retrieval**

   ```
   GET /wcs/resources/store/{storeId}/cart/@self
   Headers: WCToken, WCTrustedToken
   Response: Full cart object with orderItem[], totals, shipping, tax
   ```

2. **Display Elements**
   - Product list with:
     - Image (from ACO or HCL response)
     - Name (from HCL `partNumber` or product name)
     - Unit price: `orderItem.unitPrice`
     - Quantity: `orderItem.quantity` (editable)
     - Total: `orderItem.orderItemPrice`
     - Remove button
   - Cart summary:
     - Subtotal: `totalProductPrice`
     - Shipping: `totalShippingCharge`
     - Tax: `totalSalesTax`
     - Grand Total: `grandTotal`
   - Checkout button → Calls `PUT /update_order_item` (Feature 6)

3. **Item Quantity Updates** (Future Enhancement)
   - UI change → Calculate new total locally
   - Backend: PUT request to HCL to confirm
   - Revert if API fails

---

### 3.6 Feature 6: Checkout Flow Integration (REMOVED FROM POC SCOPE)

**Note**: Checkout is **NOT included in POC Phase 1**. Focus is on:

- ✅ Add to Cart (PLP/PDP)
- ✅ Mini-Cart Display
- ✅ Cart Page Display
- ❌ Checkout Flow (deferred to Phase 2)

The cart page will have a "Proceed to Checkout" button that is a placeholder. Phase 2 will implement full checkout with the `PUT /update_order_item` endpoint.

---

## 4. Development Phases

### Phase 1: Core Cart Integration (MVP) - POC SCOPE

**Timeline**: 2-3 weeks  
**Deliverables**: Add to Cart, Mini-Cart, Cart Page Display (NO Checkout)

#### Phase 1 Tasks:

1. **Setup HCL Commerce Authentication**
   - Create `hcl-commerce-auth.js` utility module
   - Implement login flow using `/loginidentity` endpoint
   - Handle token storage (sessionStorage)
   - Implement token refresh logic (check age before API calls)
   - Error handling for auth failures

2. **Create HCL Commerce API Client**
   - Create `hcl-commerce-api.js` utility module
   - Handle authenticated HTTP calls to HCL APIs
   - Implement retry logic for failed requests
   - Parse and validate API responses
   - Handle common error scenarios

3. **Create Cart Manager Service**
   - Manage cart state (Redux/Context)
   - Handle Add to Cart workflow
   - Persist cart in sessionStorage
   - Synchronize with HCL cart state

4. **Update Product Pages (PLP/PDP)**
   - Add "Add to Cart" button to PLP products
   - Add "Add to Cart" with quantity selector to PDP
   - Integrate with HCL Add to Cart API
   - Show loading/error states
   - Update mini-cart in header on success
   - Use ACO product data (catalog) + HCL cart (commerce)

5. **Build Mini-Cart Component (Header)**
   - Display item count and subtotal
   - Show quick preview of 2-3 items
   - Link to full cart page
   - Real-time updates after add to cart

6. **Build Cart Page**
   - Fetch cart data from HCL via GET `/cart/@self`
   - Display all items with:
     - Product image (from ACO or response)
     - Product name (from HCL response)
     - Unit price and quantity
     - Line total
   - Show cart summary:
     - Subtotal: `totalProductPrice`
     - Shipping: `totalShippingCharge` (if applicable)
     - Tax: `totalSalesTax` (if applicable)
     - Grand Total: `grandTotal`
   - Handle empty cart state
   - "Proceed to Checkout" button (placeholder for Phase 2)

7. **Testing & QA**
   - Unit tests: API client, auth, state management
   - Integration tests: Add to cart flow with HCL staging
   - E2E tests: Full user workflow (PLP → Add → Mini-cart → Cart page)
   - Error scenario testing (inventory, auth, network)
   - Browser testing (Chrome, Firefox, Safari, mobile)

**Deliverables**:

- ✅ Authentication service
- ✅ API client with retry logic
- ✅ Cart manager/state management
- ✅ Updated PLP/PDP with Add to Cart
- ✅ Mini-cart component
- ✅ Cart page component
- ✅ Unit + E2E tests (80%+ coverage)

---

### Phase 2: Advanced Features (Future Sprints)

**Timeline**: 2-3 weeks each  
**Deliverables**: Checkout Flow, Account Integration, Order Management

#### Phase 2 Tasks:

1. **Checkout Flow**
   - Update order item for checkout
   - Shipping address selection
   - Shipping method selection
   - Payment information (HCL's payment widgets)
   - Order placement

2. **Customer Accounts**
   - Login to HCL Commerce
   - Order history from HCL
   - Saved addresses
   - Account dashboard

3. **Advanced Cart Features**
   - Quantity updates
   - Item removal
   - Coupon/promotion code handling
   - Saved for later (wishlist)

---

## 5. Technical Architecture

### 5.1 Module Structure

```
aco-boilerplate-starter/
├── blocks/
│   ├── product-list-page/
│   │   └── product-list-page.js          (Add to Cart button)
│   ├── product-details-page/
│   │   └── product-details.js            (Add to Cart + Quantity)
│   ├── mini-cart/
│   │   ├── mini-cart.js                  (NEW)
│   │   ├── mini-cart.css                 (NEW)
│   │   └── CartDropdown.js               (NEW)
│   └── cart-page/
│       ├── cart-page.js                  (NEW)
│       ├── cart-page.css                 (NEW)
│       ├── CartItemList.js               (NEW)
│       └── CartSummary.js                (NEW)
│
├── scripts/
│   ├── hcl-commerce-api.js               (NEW - API Client)
│   ├── cart-manager.js                   (NEW - State Mgmt)
│   ├── commerce.js                       (UPDATED - Add HCL config)
│   └── configs.js                        (UPDATED - HCL endpoints)
│
├── styles/
│   └── hcl-cart.css                      (NEW - Shared styles)
│
└── utils/
    └── hcl-commerce-utils.js             (NEW - Helpers)
```

### 5.2 Key Modules & Responsibilities

#### A. HCL Commerce API Client (`hcl-commerce-api.js`)

**Responsibilities**:

- Make authenticated HTTP calls to HCL Commerce APIs
- Handle guest session tokens (WCToken, WCTrustedToken)
- Implement retry logic for failed requests
- Parse and validate API responses
- Handle common error scenarios

**Methods**:

```javascript
export const HCLCommerceAPI = {
  // Session Management
  getGuestSession(),           // Create/refresh guest session

  // Cart Operations
  addToCart(productId, qty),   // Add item to cart
  getCart(),                   // Get current cart
  updateCartItem(itemId, qty), // Update item quantity
  removeFromCart(itemId),      // Remove item from cart

  // Checkout
  prepareForCheckout(),        // Update order items for checkout

  // Error Handling
  handleError(error),          // Centralized error handling
};
```

#### B. Cart Manager Service (`cart-manager.js`)

**Responsibilities**:

- Manage cart state (Redux store or Context API)
- Coordinate between EDS Storefront and HCL Commerce
- Handle optimistic updates for better UX
- Persist cart state in sessionStorage

**State Shape**:

```javascript
cartState = {
  orderId: "764426",
  orderItems: [
    {
      orderItemId: "6545024",
      productId: "3074457345619160265",
      partNumber: "BCL022_220601",
      name: "Product Name",
      quantity: 1,
      unitPrice: 45.0,
      totalPrice: 45.0,
      image: "...", // from ACO
    },
  ],
  totals: {
    subtotal: 85.0,
    shipping: 0.0,
    tax: 0.0,
    grandTotal: 85.0,
  },
  lastUpdated: "2025-04-05T10:30:00Z",
};
```

#### C. Mini-Cart Component (`mini-cart.js`)

**Responsibilities**:

- Display cart summary in header
- Show item count and subtotal
- Quick preview of items
- Links to cart page and checkout

**Props**:

```javascript
<MiniCart
  itemCount={3}
  subtotal={85.0}
  currency="USD"
  items={orderItems}
  onCartClick={() => navigate("/cart")}
/>
```

#### D. Cart Page Block (`cart-page.js`)

**Responsibilities**:

- Full cart display
- Item management (update qty, remove)
- Cart summary with totals
- Checkout button

**Sub-components**:

- `CartItemList.js` - Product list
- `CartSummary.js` - Totals and checkout

---

### 5.3 Configuration & Environment Setup

**New config entries** (`scripts/configs.js`):

```javascript
export const HCL_COMMERCE_CONFIG = {
  // HCL Aurora Host
  apiHost: process.env.HCL_COMMERCE_HOST || "https://20.40.52.251",

  // Store ID
  storeId: process.env.HCL_STORE_ID || "715842834",

  // API Paths
  apiPaths: {
    cart: "/wcs/resources/store/{storeId}/cart",
    cartSelf: "/wcs/resources/store/{storeId}/cart/@self",
    updateOrderItem:
      "/wcs/resources/store/{storeId}/cart/@self/update_order_item",
    guestLogin: "/wcs/resources/login", // If available
  },

  // Request Config
  timeout: 10000, // 10 seconds
  retries: 2, // Retry failed requests

  // Feature Flags
  features: {
    guestCheckout: true,
    inventoryValidation: true,
    taxCalculation: true,
  },
};
```

**Environment Variables** (`.env` or `env.dist`):

```
HCL_COMMERCE_HOST=https://20.40.52.251
HCL_STORE_ID=715842834
HCL_COMMERCE_TIMEOUT=10000
HCL_COMMERCE_RETRIES=2
```

---

## 6. Data Mapping & Transformation

### 6.1 ACO → HCL Commerce Mapping

When adding product from ACO to HCL cart, use `partNumber` from ACO SKU:

| ACO Field     | HCL Field               | Mapping Logic                                        |
| ------------- | ----------------------- | ---------------------------------------------------- |
| `product.sku` | `partNumber`            | **PRIMARY MAPPING** - Use ACO SKU as partNumber      |
| `product.id`  | `productId`             | Fallback if partNumber unavailable (not recommended) |
| User input    | `quantity`              | Integer, min 1                                       |
| Auto          | `orderId`               | "." for new/guest                                    |
| Always        | `x_inventoryValidation` | true                                                 |
| Always        | `x_calculateOrder`      | "0" for add, "1" for checkout                        |

**Example**:

```json
{
  "orderId": ".",
  "x_calculateOrder": "0",
  "x_inventoryValidation": true,
  "orderItem": [
    {
      "quantity": "1",
      "partNumber": "CLA022_220601" // From ACO product.sku
    }
  ]
}
```

### 6.2 HCL Response → Storefront Mapping

From `GET /cart/@self` response:

| HCL Field                    | Storefront Use | Transform            |
| ---------------------------- | -------------- | -------------------- |
| `orderId`                    | Cart ID        | Store in state       |
| `orderItem[].orderItemId`    | Item ID        | Store per product    |
| `orderItem[].partNumber`     | Display name   | Show on cart         |
| `orderItem[].quantity`       | Item qty       | Display & allow edit |
| `orderItem[].unitPrice`      | Per-item price | Format currency      |
| `orderItem[].orderItemPrice` | Line total     | quantity × unitPrice |
| `totalProductPrice`          | Subtotal       | Sum of line totals   |
| `totalShippingCharge`        | Shipping       | Show if > 0          |
| `totalSalesTax`              | Tax            | Show if > 0          |
| `grandTotal`                 | Total          | Primary total        |
| `recordSetCount`             | Item count     | Update header badge  |

---

## 7. Error Handling & Edge Cases

### 7.1 Common Error Scenarios

| Scenario           | HTTP Status          | Handling                               |
| ------------------ | -------------------- | -------------------------------------- |
| Product not in HCL | 404                  | Show "Product unavailable in HCL"      |
| Out of stock       | 409 or error message | Show "Out of stock"                    |
| Invalid token      | 401/403              | Refresh session and retry              |
| Network timeout    | TIMEOUT              | Show "Connection error" + retry button |
| Server error       | 500+                 | Show "Server error" + retry button     |
| Malformed response | (error parsing)      | Log error + show generic message       |

### 7.2 Edge Case Handling

1. **Cart Abandoned**
   - User closes browser → Cart persists in HCL (server-side)
   - User returns → Fetch existing cart by guest session

2. **Inventory Changes**
   - Product goes out of stock after added
   - Detect on cart refresh: `orderItem.orderItemInventoryStatus !== "Available"`
   - Warn user and allow item removal

3. **Session Expiration**
   - Guest token expires (typically 30-60 min)
   - Detect on API 401 response
   - Refresh token automatically
   - Retry original request

4. **Multiple Tabs**
   - User adds item in Tab A, views cart in Tab B
   - Tab B won't see update until page refresh
   - Future enhancement: Use `sessionStorage` events for cross-tab sync

---

## 8. Security Considerations

### 8.1 Token Management

- ✅ Store tokens in `sessionStorage` (cleared on browser close)
- ✅ Validate token age before API calls
- ❌ Never log tokens in console (production)
- ❌ Never send tokens in URL parameters
- ✅ Use HTTPS only for all HCL API calls

### 8.2 API Security & CORS

**Current Limitation**: HCL Commerce CORS policy not yet confirmed

**Solutions**:

1. **Option A**: Backend Proxy (RECOMMENDED for POC)
   - Create Node.js proxy endpoint: `/api/hcl/*`
   - Proxy forwards requests to HCL Aurora
   - Client calls proxy, proxy calls HCL
   - **Benefit**: Avoids CORS issues, centralizes auth, secures credentials
   - **Implementation**: Express.js middleware, use `node-fetch` or `axios`

   ```javascript
   // Backend proxy endpoint
   POST /api/hcl/login
     → Forward to HCL /loginidentity
     → Store tokens in session
     → Return to client

   POST /api/hcl/cart/add
     → Use server-side tokens
     → Forward to HCL /cart
     → Return response to client
   ```

2. **Option B**: Direct CORS (IF HCL allows)
   - HCL configures CORS headers for EDS domain
   - Client makes direct calls to HCL
   - **Risk**: Credentials exposed to client (temporary for POC)

**Recommendation**: Implement **Option A (Backend Proxy)** from the start:

- More secure (credentials never on client)
- Enables production readiness
- Better error handling & logging
- Support for future enhancements (rate limiting, etc.)

**Timeline**: Backend proxy implementation can happen in parallel with frontend (no blocking dependency)

### 8.3 PII Handling

- Guest session doesn't require PII
- When displaying payment info → Redact sensitive fields
- When logging errors → Remove PII from logs

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test Coverage**: 80%+

```javascript
// hcl-commerce-api.test.js
- addToCart() success flow
- addToCart() error handling
- getCart() response parsing
- Token refresh on 401

// cart-manager.test.js
- Add item to state
- Update item quantity
- Remove item from state
- State persistence to sessionStorage
```

### 9.2 Integration Tests

**Test Environment**: HCL Commerce staging

```
- Full add to cart workflow (PLP → Cart)
- Cart display with real HCL data
- Checkout flow (update order item)
- Guest session lifecycle
- Error scenarios (inventory, timeout, etc.)
```

### 9.3 E2E Tests (Cypress/Playwright)

```
Scenario 1: Add to Cart (PLP)
  1. Open EDS Storefront
  2. Browse products
  3. Click "Add to Cart" on product
  4. Verify mini-cart updates
  5. Navigate to cart page
  6. Verify all items displayed

Scenario 2: Update Quantity
  1. Add product to cart
  2. View full cart
  3. Update quantity to 5
  4. Verify subtotal updates
  5. Verify order total recalculates

Scenario 3: Begin Checkout
  1. Add multiple products
  2. Click "Checkout" button
  3. Verify update_order_item call succeeds
  4. Verify shipping form appears (next phase)
```

---

## 10. Performance Considerations

### 10.1 API Call Optimization

**Reduce API calls**:

- Cache cart for 30 seconds (unless user modifies)
- Use sessionStorage to avoid refetching on page refresh
- Batch updates if multiple items modified

**Response Size**:

- HCL cart response can be large (includes shipping options, etc.)
- Parse response and store only necessary fields
- Lazy load detailed cart info on cart page view

### 10.2 UI Performance

- **Optimistic Updates**: Show item added immediately, confirm with API
- **Lazy Load**: Load mini-cart component only on header mount
- **Memoization**: Memoize CartItemList to prevent unnecessary re-renders
- **Image Optimization**: Use images from ACO (already optimized)

### 10.3 Network Strategy

```
Timeline (ms):
  0-100ms: Show loading spinner
  100-500ms: Typical API response
  500ms+: Show error after timeout (10s)
```

---

## 11. Dependencies & External Services

### 11.1 Required

- **HCL Commerce API** (v9.1+)
  - Endpoint: `https://20.40.52.251/wcs/resources/`
  - Authentication: WCToken + WCTrustedToken
  - Store ID: 715842834
  - Status: Confirmed availability ✅

- **ACO Catalog Service** (Already integrated)
  - Used for product data on PLP/PDP
  - No changes required

### 11.2 Optional (Future Phases)

- Payment gateway integration (Stripe, PayPal, etc.)
- Tax calculation service
- Shipping rate service
- CRM integration (customer data)

---

## 12. Risk Assessment

### 12.1 High Risk

| Risk                             | Mitigation                                                            |
| -------------------------------- | --------------------------------------------------------------------- |
| HCL API downtime                 | Implement fallback to guest cart (localStorage), show offline message |
| CORS issues                      | Configure CORS on HCL server, or use backend proxy                    |
| Token expiration during checkout | Implement automatic refresh with retry                                |

### 12.2 Medium Risk

| Risk                         | Mitigation                                               |
| ---------------------------- | -------------------------------------------------------- |
| Inventory sync issues        | Validate inventory on add to cart, warn on cart refresh  |
| Performance (large carts)    | Paginate items, lazy load details                        |
| Browser session storage full | Cleanup old cart data, use sessionStorage (auto-cleared) |

### 12.3 Low Risk

| Risk                               | Mitigation                                  |
| ---------------------------------- | ------------------------------------------- |
| UI inconsistency (dark mode, etc.) | Follow EDS storefront design system         |
| Mobile responsiveness              | Test on iOS/Android, touch-friendly targets |
| Accessibility                      | ARIA labels, keyboard navigation            |

---

## 13. Deployment Plan

### 13.1 Pre-Deployment Checklist

- [ ] HCL Commerce staging credentials obtained
- [ ] Network connectivity tested (aurora-host is accessible)
- [ ] CORS policy configured on HCL side
- [ ] Environment variables configured (.env, CI/CD secrets)
- [ ] API client unit tests passing (100% coverage)
- [ ] Integration tests passing on HCL staging
- [ ] Security review: Token handling, PII, HTTPS
- [ ] Performance: Load test cart with 100+ items
- [ ] Error handling: Test all failure scenarios
- [ ] Documentation: API calls, state flow, troubleshooting

### 13.2 Rollout Strategy

**Phase 1 (Week 1-2)**: Development & Testing

- Develop core modules
- Unit & integration tests
- Testing on HCL staging

**Phase 2 (Week 3)**: Internal Testing

- QA testing on staging
- Beta testing with internal users
- Performance validation

**Phase 3 (Week 4+)**: Production Deployment

- Deploy to production
- Monitor for errors
- Gradual rollout (50% → 100%)

---

## 14. Success Metrics

### 14.1 Functional Success

- ✅ Add to cart works on PLP and PDP
- ✅ Cart displays all items from HCL
- ✅ Mini-cart updates in real-time
- ✅ Checkout flow initiates correctly
- ✅ 0 API errors in production (24 hrs)

### 14.2 Performance Metrics

- ✅ Add to cart API response < 500ms (p95)
- ✅ Cart page loads < 1 second (p95)
- ✅ Mini-cart updates < 300ms (p95)
- ✅ 99.5%+ API availability

### 14.3 Business Metrics

- ✅ 0 cart abandonment due to technical issues
- ✅ Conversion rate maintained or improved
- ✅ User feedback: Easy checkout process
- ✅ Support tickets: < 5 cart-related issues/week

---

## 15. Future Enhancements (Phase 2+)

1. **Checkout Completion**
   - Full checkout flow with payment
   - Order confirmation and tracking

2. **Customer Accounts**
   - Login/register with HCL
   - Order history
   - Saved addresses and payment methods

3. **Advanced Cart Features**
   - Coupon/promotion code support
   - Wishlist/saved for later
   - Cart abandonment recovery email

4. **Multi-Currency Support**
   - Display prices in multiple currencies
   - Tax calculation per region
   - Localized checkout

5. **Real-time Inventory Sync**
   - Live stock updates
   - Low stock warnings
   - Pre-order functionality

6. **Analytics & Reporting**
   - Track add-to-cart events
   - Cart abandonment analysis
   - Conversion funnel tracking

---

## 16. Glossary

| Term                | Definition                                                 |
| ------------------- | ---------------------------------------------------------- |
| **EDS**             | Edge Delivery Services (Adobe's content delivery platform) |
| **ACO**             | Adobe Commerce on Cloud (SaaS offering)                    |
| **HCL Commerce**    | IBM HCL's e-commerce engine for back-office operations     |
| **WCToken**         | Authentication token from HCL Commerce                     |
| **WCTrustedToken**  | Secondary authentication token from HCL Commerce           |
| **OrderId**         | Cart/order ID in HCL Commerce                              |
| **OrderItemId**     | Individual line item ID in HCL cart                        |
| **Guest Session**   | Unauthenticated user session in HCL                        |
| **Storefront**      | Customer-facing shopping interface (EDS)                   |
| **Catalog Service** | ACO API providing product data                             |
| **POC**             | Proof of Concept (MVP/Phase 1)                             |

---

## 17. Approval Sign-Off

**Document prepared by**: Development Team  
**Date**: April 5, 2026  
**Status**: ⏳ Awaiting Approval

### Approvals Needed

- [ ] **Product Manager**: Confirm requirements & priorities
- [ ] **Architecture Lead**: Validate technical approach
- [ ] **Security Officer**: Review security considerations
- [ ] **HCL Commerce Admin**: Confirm API availability & credentials
- [ ] **Project Manager**: Approve timeline & resource allocation

---

## 18. Questions & Clarifications Needed

Before proceeding with development, please confirm:

1. **Authentication Model**
   - How should guest sessions be created? (Implicit via "." orderId or explicit login API?)
   - What is the token TTL (time-to-live)?
   - Should we support registered user login as well?

2. **Product Mapping**
   - Should we use `productId` or `partNumber` from ACO → HCL?
   - Are there cases where a product exists in ACO but not in HCL?
   - What should we display in cart: HCL product name or ACO product name?

3. **Inventory & Pricing**
   - Is `x_inventoryValidation: true` sufficient for stock checks?
   - Should we display ACO pricing or HCL pricing in the cart?
   - Who manages pricing rules (ACO or HCL)?

4. **Error Scenarios**
   - What API endpoints should we use for guest login/session creation?
   - How should we handle CORS if HCL doesn't allow cross-origin requests?
   - Should we build a proxy backend or use HCL's CORS settings?

5. **Checkout Integration**
   - After `update_order_item`, where does checkout continue?
   - Is checkout hosted on EDS or on HCL?
   - How is payment processed?

6. **Testing & Credentials**
   - Can we get staging environment credentials for HCL?
   - Test product IDs that we should use for testing?
   - Is SSL certificate for 20.40.52.251 valid (self-signed)?

## 18. Decisions Made & Approved

Based on stakeholder input, the following decisions have been finalized:

### **Decision 1: Authentication Method**

✅ **Approved**: Use HCL `/loginidentity` API with provided credentials

```
POST https://20.40.52.251/wcs/resources/store/715842834/loginidentity?responseFormat=json
Body: { "logonId": "auroraadobetest", "logonPassword": "passw0rd" }
Response: { WCToken, WCTrustedToken }
```

- Guest sessions are not available in HCL Commerce
- Credentials provided by HCL team for POC
- **Production**: Move credentials to backend proxy (never expose in client code)

### **Decision 2: Product Mapping (ACO → HCL)**

✅ **Approved**: Use `partNumber` as primary mapping
| Field | Value |
|-------|-------|
| ACO `product.sku` | Maps to HCL `partNumber` |
| Example | "CLA022_220601" |

- Rationale: HCL recognizes partNumber as unique product identifier
- Fallback: productId if partNumber unavailable (not recommended)

### **Decision 3: CORS & Proxy Strategy**

✅ **Approved**: Backend proxy required (CORS not yet configured on HCL)

- **Approach**: Implement Node.js backend proxy (`/api/hcl/*`)
- **Benefits**:
  - Avoids CORS issues on client
  - Centralizes HCL authentication
  - Protects credentials from exposure
  - Enables rate limiting, logging, caching
- **Timeline**: Implement in parallel with frontend development
- **Future**: Required for production security

### **Decision 4: Pricing Source (ACO vs HCL)**

✅ **Approved**: Use **ACO Pricing** for POC

- Catalog displays ACO pricing (consistent with product listing)
- Cart shows ACO pricing as well
- **Future**: Can switch to HCL pricing in Phase 2 if needed
- **Rationale**: Simpler for POC, ACO already integrated

### **Decision 5: Checkout Scope**

✅ **Approved**: **NO Checkout in POC** (Phase 1)

- Phase 1 Focus:
  - ✅ Add to Cart
  - ✅ Mini-Cart Display
  - ✅ Cart Page (view only)
  - ✅ Item removal capability (future)
- Phase 2 (Future):
  - ❌ Checkout flow (deferred)
  - ❌ Shipping address entry
  - ❌ Payment processing
  - ❌ Order confirmation
- **Placeholder**: "Proceed to Checkout" button on cart page → Navigate to external HCL checkout or placeholder page

### **Decision 6: Testing Environment**

✅ **Approved**: HCL Commerce Staging Access Available

- Credentials provided: auroraadobetest / passw0rd
- Host: https://20.40.52.251
- Store ID: 715842834
- Status: Ready for integration testing

---

## 19. Questions & Clarifications Already Addressed

The following questions have been **RESOLVED** based on stakeholder feedback:

- ✅ **Guest Sessions**: Not available; use `/loginidentity` with credentials
- ✅ **Product Mapping**: Use `partNumber` from ACO SKU
- ✅ **CORS Setup**: Uncertain; recommend backend proxy
- ✅ **Pricing Authority**: Use ACO pricing for POC
- ✅ **Checkout Integration**: Out of scope for Phase 1
- ✅ **Testing Access**: Confirmed staging access available

---

## 20. Revised Development Approach (POST-APPROVAL)

With the decisions above, the development approach is:

```
PHASE 1 (POC) - 2-3 Weeks:
├─ Backend Proxy Setup
│  ├─ Create `/api/hcl/login` endpoint
│  ├─ Create `/api/hcl/cart/*` endpoints
│  └─ Implement error handling & logging
├─ Frontend Integration
│  ├─ Build HCL Auth service (client-side)
│  ├─ Build HCL API client (client-side, uses proxy)
│  ├─ Build cart manager service
│  ├─ Add to Cart on PLP/PDP
│  ├─ Mini-cart in header
│  └─ Cart page (view only)
├─ Testing
│  ├─ Unit tests (auth, API, state)
│  ├─ Integration tests (proxy ↔ HCL)
│  ├─ E2E tests (full user flow)
│  └─ Performance testing
└─ Deployment
   ├─ Staging validation
   ├─ Production deployment
   └─ Monitoring & alerts

PHASE 2+ (Future):
├─ Checkout flow
├─ Customer login
├─ Order management
└─ Additional features
```

---

## Document Control

**Total Pages**: This document  
**Last Updated**: April 5, 2026 (Post-Approval)  
**Version**: 2.0 (Approved - Ready for Development)

### ✅ Approvals Completed

- [x] **Product Manager**: Requirements confirmed & POC scope defined
- [x] **Architecture Lead**: Technical approach validated
- [x] **HCL Commerce Admin**: Staging credentials & API endpoints verified
- [x] **Development Lead**: Ready to proceed with implementation

### Status: APPROVED FOR DEVELOPMENT ✅

**All critical decisions made. Ready to start Phase 1 development.**

**For questions**: Refer to Section 18-20 of this document for all decisions and rationales.
