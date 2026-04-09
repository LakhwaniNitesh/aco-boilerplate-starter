# Cart Migration - Testing Plan

## Overview

This document outlines the complete testing strategy for the cart migration from file-based storage to HCL Commerce REST APIs.

**Status:** Ready for Phase 1 (Basic Connectivity Testing)

---

## Phase 1: Basic Connectivity & Server Health ✅

### Prerequisites

- Node.js running with server started: `npm run start:proxy`
- Backend accessible at `http://localhost:3001`
- No authentication required for initial tests

### 1.1 Health Check

```bash
curl http://localhost:3001/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2026-04-06T...",
  "environment": "development"
}
```

**What This Tests:**

- ✅ Server is running
- ✅ Express app initialized
- ✅ Basic HTTP connectivity

---

## Phase 2: Authentication Flow Testing

### 2.1 Login Endpoint

```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{"username":"auroraadobetest","password":"passw0rd"}'
```

**Expected Response (Success):**

```json
{
  "success": true,
  "accessToken": "...",
  "user": {
    "username": "auroraadobetest",
    "email": "..."
  }
}
```

**Expected Response (Failure - Invalid Credentials):**

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Expected Response (Failure - Server Unreachable):**

```json
{
  "success": false,
  "error": "Cannot connect to HCL Commerce"
}
```

**What This Tests:**

- ✅ Authentication endpoint accessible
- ✅ Token generation works
- ✅ Error handling for invalid credentials
- ✅ Fallback when HCL is unreachable

### 2.2 Token Storage (Browser)

After successful login:

1. Open DevTools Console
2. Check if token stored: `sessionStorage.getItem('hcl-access-token')`
3. Verify token is returned from login response

**Expected:**

```javascript
"eyJhbGc..."; // Long JWT token
```

---

## Phase 3: Cart Operations Testing

### 3.1 Add Product to Cart

```bash
# Without authentication (test mode)
curl -X POST http://localhost:3001/api/hcl/cart/add \
  -H "Content-Type: application/json" \
  -d '{
    "partNumber": "SKU-123",
    "quantity": 1,
    "name": "Test Product",
    "price": 100
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "cart": {
    "cartId": "12345",
    "items": [
      {
        "partNumber": "SKU-123",
        "quantity": 1,
        "name": "Test Product",
        "price": 100,
        "total": 100
      }
    ],
    "total": 100
  }
}
```

**What This Tests:**

- ✅ Cart add endpoint works
- ✅ Response format is correct
- ✅ Item data is normalized properly
- ✅ Cart totals calculated correctly

### 3.2 Get Current Cart

```bash
curl http://localhost:3001/api/hcl/cart?accessToken=test
```

**Expected Response:**

```json
{
  "success": true,
  "cart": {
    "cartId": "12345",
    "items": [
      {
        "partNumber": "SKU-123",
        "quantity": 1,
        "name": "Test Product",
        "price": 100,
        "total": 100
      }
    ],
    "total": 100
  }
}
```

**What This Tests:**

- ✅ Get cart endpoint returns current state
- ✅ Items persist from previous add operation
- ✅ Response format matches expected structure

### 3.3 Clear Cart

```bash
curl -X DELETE http://localhost:3001/api/hcl/cart/clear
```

**Expected Response:**

```json
{
  "success": true,
  "cart": {
    "cartId": null,
    "items": [],
    "total": 0
  }
}
```

**What This Tests:**

- ✅ Clear cart endpoint works
- ✅ Cart is completely emptied
- ✅ Items array is empty
- ✅ Total is zero

---

## Phase 4: Frontend Component Testing

### 4.1 Mini-Cart Block

**Location:** `/blocks/commerce-mini-cart/`

**Steps:**

1. Start local dev server: `npm run start:local`
2. Navigate to any product page
3. Check mini-cart in header

**Expected Behavior:**

- ✅ Mini-cart displays (or "empty" message)
- ✅ Shows item count when items added
- ✅ Shows total price
- ✅ Updates automatically when item added

**Test Sequence:**

1. Initial load → Mini-cart should be empty
2. Add product → Count updates to 1
3. Add same product → Count updates to 2, total updates
4. Clear cart button → Count resets to 0

**Browser Console Checks:**

```javascript
// Should show cart state
window.__cartState;

// Should have no errors
// Check console for [CART] prefix logs
```

### 4.2 Product Details Page

**Location:** `/blocks/product-details/`

**Steps:**

1. Navigate to product page (PDP)
2. Verify product data loads
3. Add to cart button visible
4. Click add to cart

**Expected Behavior:**

- ✅ Product name, price, SKU displayed
- ✅ Add to cart button responsive
- ✅ Click triggers add-to-cart flow
- ✅ Mini-cart updates after add
- ✅ Success message or feedback shown

**Error Cases:**

- ✅ If not authenticated: Show "Not authenticated" error
- ✅ If server unreachable: Show connection error
- ✅ If product invalid: Show product error

### 4.3 Cart Page

**Location:** `/blocks/commerce-cart/`

**Steps:**

1. Add items to cart (via PDP)
2. Navigate to cart page (/cart)
3. Verify items displayed

**Expected Behavior:**

- ✅ All items from cart shown in table
- ✅ Item details: name, price, quantity, total
- ✅ Cart summary: subtotal, total
- ✅ Item quantities can be updated (if implemented)
- ✅ Remove item button works (if implemented)
- ✅ Clear cart button available

**Error Cases:**

- ✅ If cart empty: Show "Cart is empty" message
- ✅ If API fails: Show error message with retry option
- ✅ If data malformed: Handle gracefully

---

## Phase 5: Authentication Token Management Testing

### 5.1 Token Lifecycle

**Test Sequence:**

1. **Before Login:**

   ```javascript
   sessionStorage.getItem("hcl-access-token"); // Should be null
   ```

2. **After Login:**

   ```javascript
   sessionStorage.getItem("hcl-access-token"); // Should have token
   ```

3. **Cart Operations:**
   - Token automatically included in requests
   - Checked before API calls

4. **After Logout:**
   ```javascript
   sessionStorage.getItem("hcl-access-token"); // Should be null
   ```

### 5.2 Token Validation

**Test:**

1. Get valid token from login
2. Make cart request with token
3. Make cart request with invalid token
4. Make cart request with expired token (simulate)

**Expected:**

- ✅ Valid token: Request succeeds
- ✅ Invalid token: 401 error, redirect to login
- ✅ Expired token: 401 error, prompt to re-login
- ✅ No token: 401 error, disable cart operations

### 5.3 Token Expiration

**Test:**

1. Login and get token
2. Wait for expiration (or manually expire)
3. Try to use token in cart operation
4. Should prompt for re-login

**Expected:**

- ✅ Expired token detected
- ✅ User redirected to login
- ✅ Previous cart state cleared
- ✅ After re-login, can continue

---

## Phase 6: Error Handling Testing

### 6.1 Authentication Errors

**Scenario 1: Invalid Credentials**

- Input: Wrong username/password
- Expected: Error message "Invalid credentials"
- UI Response: Stays on login page

**Scenario 2: Network Unreachable**

- Input: Login while network down
- Expected: Error message "Cannot reach HCL Commerce"
- UI Response: Retry button, fallback info

**Scenario 3: Server Down**

- Input: Login while HCL server down
- Expected: Error message "Service temporarily unavailable"
- UI Response: Retry later message

### 6.2 Cart Operation Errors

**Scenario 1: Not Authenticated**

- Action: Add to cart without login
- Expected: Error "Not authenticated. Please log in first."
- UI Response: Show login prompt

**Scenario 2: Invalid Product**

- Action: Add non-existent product
- Expected: Error "Product not found"
- UI Response: Show product error

**Scenario 3: Network Timeout**

- Action: Add to cart with network latency
- Expected: After timeout, error "Request timed out"
- UI Response: Retry button

**Scenario 4: Cart Full**

- Action: Add item to full cart
- Expected: Error "Cart limit reached"
- UI Response: Show cart limit message

### 6.3 Data Validation Errors

**Scenario 1: Missing Required Fields**

- Request: Missing partNumber
- Expected: Error "Missing required field: partNumber"

**Scenario 2: Invalid Quantity**

- Request: Negative quantity
- Expected: Error "Quantity must be greater than 0"

**Scenario 3: Invalid Price**

- Request: Non-numeric price
- Expected: Error "Invalid price format"

---

## Phase 7: Integration Testing (End-to-End)

### 7.1 Complete User Journey

**Test Flow:**

```
1. User lands on storefront
   → Mini-cart empty

2. User navigates to product
   → Product details load with price/SKU

3. User logs in
   → Token stored in sessionStorage
   → Access to cart operations

4. User adds product to cart
   → Backend receives request
   → HCL updates cart
   → Mini-cart updates in real-time
   → Frontend state syncs

5. User adds another product
   → Mini-cart count increases
   → Total price updates

6. User navigates to cart page
   → Cart page loads
   → All items displayed with correct data
   → Cart totals calculated

7. User updates quantity
   → Backend calls HCL update API
   → Cart recalculates
   → Mini-cart reflects change

8. User removes item
   → Backend calls HCL remove API
   → Item removed from display
   → Totals recalculated

9. User clears cart
   → All items removed
   → Cart shows empty
   → Mini-cart shows 0

10. User logs out
    → Token cleared
    → Cart operations disabled
    → Mini-cart state cleared
```

### 7.2 Expected Outcomes

- ✅ No console errors
- ✅ No network failures
- ✅ Data consistent across pages
- ✅ Cart persists across page navigation
- ✅ Real-time updates work
- ✅ All error scenarios handled gracefully

---

## Test Data

### Valid Credentials

```
Username: auroraadobetest
Password: passw0rd
```

### Test Products

```
SKU: SKU-123
Name: Test Product
Price: 100.00

SKU: SKU-456
Name: Premium Product
Price: 299.99

SKU: SKU-789
Name: Budget Item
Price: 29.99
```

---

## Test Checklist

### Connectivity ✅

- [ ] Health endpoint responds
- [ ] CORS headers present
- [ ] Server starts without errors

### Authentication ✅

- [ ] Login succeeds with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Token returned in response
- [ ] Token stored in sessionStorage
- [ ] Token passed in cart requests

### Cart Operations ✅

- [ ] Add to cart succeeds
- [ ] Get cart returns current items
- [ ] Clear cart empties all items
- [ ] Remove item works
- [ ] Update quantity works

### Frontend Components ✅

- [ ] Mini-cart displays
- [ ] Mini-cart updates on add
- [ ] Product page loads
- [ ] Add-to-cart button works
- [ ] Cart page displays items
- [ ] Cart page shows totals

### Error Handling ✅

- [ ] Auth error shows friendly message
- [ ] Network error shows retry
- [ ] Validation error shows specific message
- [ ] Timeout error shows "request timed out"
- [ ] Cart operation without auth shows login prompt

### Data Integrity ✅

- [ ] Prices match source
- [ ] Quantities correct
- [ ] Totals calculated correctly
- [ ] SKUs match products
- [ ] Names displayed correctly

### State Management ✅

- [ ] Mini-cart syncs with cart page
- [ ] Cart persists on page refresh
- [ ] Cart clears on logout
- [ ] Real-time updates work
- [ ] No stale data issues

---

## Performance Testing

### Load Testing

```bash
node api/load-test.mjs 10 100
```

This runs:

- 10 concurrent requests
- 100 total login attempts
- Reports: success rate, response times, errors

**Expected Results:**

- Success rate: 95%+
- Avg response time: <500ms
- Max response time: <2000ms
- Error rate: <5%

### Individual Request Timing

Each cart operation should respond in:

- Add to cart: <500ms
- Get cart: <300ms
- Clear cart: <300ms
- Login: <1000ms (includes HCL communication)

---

## Server Logs to Monitor

### Success Log Pattern

```
[CART-PROXY] Adding product: SKU-123, Qty: 1
[CART-PROXY] ✓ Added to cart successfully
[CART-PROXY] Cart state: {cartId: "...", items: [...], total: 100}
```

### Error Log Pattern

```
[CART-PROXY] Error adding to cart: {error message}
[CART-PROXY] Response: {statusCode}, {message}
```

### Authentication Log Pattern

```
[AUTH] Login attempt: auroraadobetest
[AUTH] ✓ Login successful, token: {token_hash}
[AUTH] Token validation: valid, expires: {time}
```

---

## Environment Variables Required

For full testing, ensure these are set in `.env`:

```
# HCL Commerce
HCL_HOST=https://your-hcl-vm:port
HCL_USERNAME=hcl_admin
HCL_PASSWORD=hcl_password
HCL_STORE_ID=Aurora

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Optional: Authentication
TOKEN_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=86400
```

---

## Next Steps

1. **Start with Phase 1** - Verify server health
2. **Move to Phase 2** - Test authentication
3. **Complete Phase 3** - Test cart operations
4. **Progress to Phase 4** - Test frontend components
5. **Execute Phase 5** - Test token management
6. **Run Phase 6** - Test error scenarios
7. **Complete Phase 7** - Full end-to-end journey

---

## Known Limitations

- Test mode requires no authentication (localhost)
- HCL Commerce VM must be accessible via VPN
- Some API endpoints may differ from production
- Response formats may vary by HCL version

---

## Troubleshooting

### Server Won't Start

```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill process on port 3001
taskkill /PID <PID> /F

# Try again
npm run start:proxy
```

### Login Fails

```bash
# Check HCL_HOST environment variable
echo %HCL_HOST%

# Verify network connectivity
ping your-hcl-vm

# Check credentials in .env
```

### Cart Operations Timeout

```bash
# Check network latency
ping your-hcl-vm

# Increase timeout in api/server.js
// Set request timeout higher

# Check HCL Commerce logs
```

---

## Document Versioning

| Version | Date       | Changes                      |
| ------- | ---------- | ---------------------------- |
| 1.0     | 2026-04-06 | Initial testing plan created |
