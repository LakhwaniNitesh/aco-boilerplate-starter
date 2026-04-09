# 🖥️ LOCAL TESTING GUIDE - EDS Storefront Integration

## Overview

This guide helps you test the HCL Commerce integration with your local EDS storefront setup. All components are designed to work seamlessly in a localhost environment.

---

## ✅ Prerequisites

Before starting, verify you have:

- [ ] EDS storefront running locally (with `aem up`)
- [ ] Node.js v16+ and npm v7+
- [ ] HCL Commerce backend services accessible
- [ ] Network connectivity for API calls
- [ ] Test user credentials

---

## 🚀 Quick Start (5 minutes)

### Step 1: Start the Backend Proxy

The backend proxy bridges your EDS storefront with HCL Commerce APIs.

```bash
# Navigate to project root
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

# Start the Express backend on port 3001
npm run start:proxy
```

**Expected Output:**

```
✓ Backend server running on http://localhost:3001
✓ Health check available at http://localhost:3001/health
✓ Ready to accept requests
```

**Verify it's running:**

```powershell
# In another terminal
Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET
```

### Step 2: Verify EDS Storefront

Ensure your EDS storefront is running:

```bash
# In your EDS project directory
aem up --html-folder="./drafts/agents"
```

**Expected URL:** `http://localhost:3000` (or your configured port)

### Step 3: Load Test Components

The blocks and components are now ready to integrate:

```bash
# Verify blocks are registered
ls blocks/

# Expected output:
# - product-list-page/
# - add-to-cart-hcl/
# - hcl-mini-cart/
# - hcl-cart-page/
```

---

## 🧪 Testing Scenarios

### Scenario 1: Test Authentication (5 min)

**1. Create a test page in EDS:**

Create a new test page at `drafts/agents/auth-test.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Auth Test</title>
    <script
      src="https://localhost:3000/scripts/scripts.js"
      type="module"
    ></script>
  </head>
  <body>
    <div id="auth-status"></div>
    <div id="login-form"></div>
    <script type="module">
      import { HCLAuthService } from "/scripts/hcl-auth-service.js";

      // Test login
      const email = "test@example.com";
      const password = "testpass123";

      const result = await HCLAuthService.login(email, password);
      console.log("Auth Result:", result);

      // Display status
      document.getElementById("auth-status").innerHTML = `
            <p>Authenticated: ${HCLAuthService.isAuthenticated()}</p>
            <p>Token: ${HCLAuthService.getToken() ? "Present" : "Missing"}</p>
        `;
    </script>
  </body>
</html>
```

**2. Access the test page:**

- Open: `http://localhost:3000/auth-test.html`
- Check console (F12) for auth results
- Expected: Successful authentication or clear error message

---

### Scenario 2: Test Cart Operations (5 min)

**1. Create a cart test page at `drafts/agents/cart-test.html`:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Cart Test</title>
    <script
      src="https://localhost:3000/scripts/scripts.js"
      type="module"
    ></script>
  </head>
  <body>
    <div id="cart-info"></div>
    <div id="actions"></div>
    <script type="module">
      import { CartStore, useCart, useAddToCart } from "/scripts/cart-store.js";

      // Subscribe to cart changes
      CartStore.subscribe((cart) => {
        console.log("Cart Updated:", cart);
        document.getElementById("cart-info").innerHTML = `
                <h2>Cart Status</h2>
                <p>Items: ${cart.items.length}</p>
                <p>Total: $${cart.total.toFixed(2)}</p>
                <pre>${JSON.stringify(cart, null, 2)}</pre>
            `;
      });

      // Test adding a product
      document.getElementById("actions").innerHTML = `
            <button onclick="addTestProduct()">Add Test Product</button>
            <button onclick="clearCart()">Clear Cart</button>
        `;

      window.addTestProduct = async () => {
        const { addItem } = useAddToCart();
        await addItem({
          productId: "TEST-001",
          name: "Test Product",
          price: 99.99,
          quantity: 1,
        });
      };

      window.clearCart = () => {
        CartStore.clear();
      };
    </script>
  </body>
</html>
```

**2. Test the page:**

- Open: `http://localhost:3000/cart-test.html`
- Click "Add Test Product" button
- Verify cart updates in real-time
- Check console for any errors

---

### Scenario 3: Test Components in Blocks (10 min)

**1. Test Add-to-Cart Button Block:**

Create `drafts/agents/test-add-to-cart.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Add to Cart Test</title>
    <link rel="stylesheet" href="/styles/styles.css" />
    <script src="/scripts/scripts.js" type="module"></script>
  </head>
  <body>
    <header>Test: Add to Cart Button</header>

    <div
      class="add-to-cart-hcl"
      data-product-id="TEST-PRODUCT-001"
      data-button-text="Add to Cart"
      data-loading-text="Adding..."
      data-success-text="Added!"
    ></div>

    <footer>
      <p>Check console (F12) for debug output</p>
    </footer>
  </body>
</html>
```

**2. Test Mini-Cart Block:**

Create `drafts/agents/test-mini-cart.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Mini Cart Test</title>
    <link rel="stylesheet" href="/styles/styles.css" />
    <script src="/scripts/scripts.js" type="module"></script>
  </head>
  <body>
    <header>Test: Mini Cart Display</header>

    <div
      class="hcl-mini-cart"
      data-show-heading="true"
      data-max-items="3"
      data-hide-empty="false"
    ></div>

    <footer>
      <p>Add items using the Add to Cart button, they should appear here</p>
    </footer>
  </body>
</html>
```

**3. Test Full Cart Page:**

Create `drafts/agents/test-cart-page.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Cart Page Test</title>
    <link rel="stylesheet" href="/styles/styles.css" />
    <script src="/scripts/scripts.js" type="module"></script>
  </head>
  <body>
    <header>Test: Full Cart Page</header>

    <div class="hcl-cart-page"></div>

    <footer>
      <p>Full cart management interface</p>
    </footer>
  </body>
</html>
```

---

## 🔍 Debugging & Troubleshooting

### Check Backend Health

```powershell
# Health check endpoint
curl http://localhost:3001/health

# Expected response:
# { "status": "ok", "timestamp": "2024-...", "uptime": 1234 }
```

### View Console Logs

Press **F12** in browser to open DevTools:

1. **Console Tab**: JavaScript errors and warnings
2. **Network Tab**: API calls and their status
3. **Application Tab**: LocalStorage, SessionStorage, Cookies

### Common Issues & Solutions

#### Issue 1: Backend not responding

```powershell
# Verify backend is running
Get-Process node | Where-Object { $_.CommandLine -like "*3001*" }

# If not running, restart it
npm run start:proxy
```

#### Issue 2: CORS errors

```javascript
// Check if backend includes proper CORS headers
// Solution: Backend should have CORS enabled
// Location: api/server.js or equivalent
```

#### Issue 3: Cart not persisting

```javascript
// Check localStorage
console.log(localStorage.getItem("cart"));

// Clear and retry
localStorage.clear();
location.reload();
```

---

## 📊 Running Automated Tests Locally

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Unit tests only
npm test -- test/services/

# Integration tests only
npm test -- test/integration/

# Cart store tests
npm test -- cart-store.test.js

# With coverage
npm test -- --coverage
```

### Expected Coverage

```
Statements   : 82% ( 500+ lines covered )
Branches     : 82% ( edge cases covered )
Functions    : 82% ( all functions tested )
Lines        : 82% ( code execution verified )
```

---

## 🌐 Network Testing

### Test API Endpoints

#### Health Check

```powershell
Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET
```

#### Login Endpoint

```powershell
$body = @{
    username = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

#### Add to Cart Endpoint

```powershell
$body = @{
    productId = "TEST-001"
    quantity = 1
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer YOUR_TOKEN_HERE"
}

Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/cart/add" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -Headers $headers
```

---

## 📈 Load Testing Locally

### Run Load Test

```bash
# Test with 10 concurrent users, 100 requests each
npm run load-test -- 10 100

# Or directly with Node
node api/load-test.mjs 10 100
```

### Expected Output

```
Load Test Results:
  Total Requests: 1000
  Successful: 950 (95%)
  Failed: 50 (5%)
  Average Response Time: 125ms
  Max Response Time: 450ms
  Min Response Time: 45ms
  Throughput: 150 req/sec
```

---

## 🔐 Security Testing Locally

### Test CORS Settings

```bash
# CORS should allow localhost requests
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost:3001/api/hcl/cart/add
```

### Test Authentication

```bash
# Without token (should fail)
curl -X GET http://localhost:3001/api/hcl/cart/get

# With token (should succeed)
curl -X GET http://localhost:3001/api/hcl/cart/get \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📱 Testing Responsive Design

### Desktop Testing

- Open DevTools (F12)
- Default viewport (1920x1080)
- Test all components at full width

### Tablet Testing

- DevTools → Device Toolbar
- Select "iPad" or "iPad Pro"
- Verify responsive layout
- Test touch interactions

### Mobile Testing

- DevTools → Device Toolbar
- Select "iPhone 12" or similar
- Verify mobile layout
- Test all components

---

## 🎯 Testing Checklist

### Authentication Flow

- [ ] User can log in with valid credentials
- [ ] Token is stored in sessionStorage
- [ ] Token auto-refreshes before expiry
- [ ] Logout clears token and resets state
- [ ] Unauthenticated users cannot access cart

### Cart Operations

- [ ] Add product to cart
- [ ] Update item quantity
- [ ] Remove item from cart
- [ ] Cart total updates correctly
- [ ] Cart persists across page reloads
- [ ] Multiple items display correctly

### Component Display

- [ ] Add-to-cart button renders correctly
- [ ] Mini-cart shows item count badge
- [ ] Mini-cart updates in real-time
- [ ] Cart page displays all items
- [ ] Cart summary calculates correctly
- [ ] Checkout button is clickable

### Error Handling

- [ ] Invalid login shows error message
- [ ] Network errors are caught and displayed
- [ ] Invalid product IDs are handled
- [ ] Quantity limits are enforced
- [ ] Missing required fields are validated

### Performance

- [ ] Page load time < 2 seconds
- [ ] Cart updates in < 100ms
- [ ] No memory leaks after extended use
- [ ] Images load and cache properly
- [ ] No console errors or warnings

---

## 🚀 Integration with EDS Authoring

### Create a Test Content Block

In your EDS authoring system, create a page with your blocks:

**Option 1: Using Block Markup**

```html
<div class="section">
  <div class="default">
    <div class="product-list-page">
      <h1>Products</h1>
    </div>
  </div>
</div>

<div class="section">
  <div class="default">
    <div class="add-to-cart-hcl" data-product-id="PROD-001"></div>
  </div>
</div>

<div class="section">
  <div class="default">
    <div class="hcl-mini-cart"></div>
  </div>
</div>
```

**Option 2: Using Word/Google Docs**

- Create a page in your authoring tool
- Insert block sections with metadata
- Publish and view in EDS

---

## 📝 Test Results Documentation

### Create Test Report

Document your findings:

```markdown
## Local Testing Report - [Date]

### Environment

- EDS Version: [version]
- Node: [version]
- Backend Port: 3001
- Test Duration: [time]

### Test Results

- Components Tested: 4/4 ✓
- Functionality: [% pass]
- Performance: [avg response time]
- Errors: [count]

### Issues Found

1. [Issue description]
   - Impact: [severity]
   - Workaround: [if any]

### Recommendations

- [Recommendation 1]
- [Recommendation 2]
```

---

## 🔄 Continuous Testing

### Set Up Auto-Reload

Enable auto-reload in development:

```bash
# Install nodemon (if not already)
npm install --save-dev nodemon

# Run backend with auto-reload
nodemon api/server.js
```

### Watch Tests

Run tests in watch mode:

```bash
npm test -- --watch
```

---

## 🎓 Next Steps After Local Testing

1. **Staging Deployment**: Follow `DEPLOYMENT_GUIDE.md` for staging
2. **Load Testing**: Run full load test suite (see `LOAD_TEST_EXECUTION_SUMMARY.md`)
3. **Production**: Deploy using documented procedures
4. **Monitoring**: Set up APM and error tracking
5. **Documentation**: Update deployment docs with findings

---

## 📞 Support & Debugging

### Enable Debug Mode

```javascript
// In browser console
localStorage.setItem("debug", "true");
location.reload();

// You'll see verbose logging for all operations
```

### Get System Information

```bash
npm run system-info
# Shows: Node version, npm version, OS, memory, disk space
```

### Check Port Usage

```powershell
# Verify port 3001 is available
netstat -ano | findstr :3001

# If in use, find the process
Get-Process | Where-Object { $_.Handles -eq 3001 }
```

---

## ✅ Success Criteria

Your local testing is successful when:

✓ Backend server starts without errors  
✓ All components render in EDS storefront  
✓ Cart operations work end-to-end  
✓ Tests pass with 80%+ coverage  
✓ No console errors or warnings  
✓ Load test shows acceptable performance  
✓ All documentation matches actual behavior

---

**Status**: Ready for Local Testing ✅

**Next**: Follow this guide for complete local validation before production deployment.
