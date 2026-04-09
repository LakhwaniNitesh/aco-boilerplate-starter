# HCL Commerce Authentication Integration Guide

## Overview

This document explains how to integrate real HCL Commerce REST API authentication (wcToken) into the EDS Storefront. The implementation uses HCL's official REST API endpoints for login/logout and token management.

**Reference:** [HCL Commerce REST API - Authentication and Session Management](https://help.hcl-software.com/commerce/9.0.0/restapi/code/authentication_and_session_management.html)

---

## Architecture

```
┌─────────────────────────────────────┐
│   EDS Storefront (Frontend)         │
│  - Login/Logout UI Components       │
│  - Store wcToken in sessionStorage  │
│  - Pass wcToken in API calls        │
└────────────┬────────────────────────┘
             │ POST /api/hcl/login
             │ {username, password}
             ▼
┌─────────────────────────────────────┐
│  Express Backend Proxy (Node.js)    │
│  - Route requests to HCL            │
│  - Handle token exchange            │
│  - Return wcToken to frontend       │
└────────────┬────────────────────────┘
             │ POST /identity/v1/customers/login
             │ {logonId, password, storeId}
             ▼
┌─────────────────────────────────────┐
│  HCL Commerce REST API              │
│  - Authenticate user                │
│  - Return wcToken                   │
│  - Validate token on requests       │
└─────────────────────────────────────┘
```

---

## Available Test Credentials

Use these credentials to test the authentication flow:

```
Username: auroraadobetest
Password: passw0rd

Username: adobetest1
Password: passw0rd

Username: adobetest2
Password: passw0rd
```

---

## Authentication Modes

### Mode 1: Real HCL Commerce (Production)

When you have access to HCL Commerce VM via VPN:

```bash
# Set environment variable
export USE_REAL_HCL_AUTH=true

# Or in .env file:
USE_REAL_HCL_AUTH=true
HCL_HOST=https://20.40.52.251
HCL_STORE_ID=715842834
```

**Benefits:**

- ✅ Real authentication against HCL Commerce
- ✅ wcToken is valid for HCL API calls
- ✅ Full end-to-end integration testing
- ✅ Production-ready

**Requirements:**

- VPN access to HCL Commerce VM
- HCL_HOST environment variable set correctly
- HCL_STORE_ID configured

### Mode 2: Mock Authentication (Development)

For local development without HCL access:

```bash
# Unset or set to false
export USE_REAL_HCL_AUTH=false

# Or in .env file:
USE_REAL_HCL_AUTH=false
```

**Benefits:**

- ✅ No VPN required
- ✅ Fast development cycle
- ✅ No external dependencies
- ✅ Good for UI/UX testing

**Limitations:**

- ❌ wcToken not valid for HCL API calls
- ❌ Cart operations still need real HCL
- ❌ Can't test full integration flow

---

## Backend API Endpoints

### 1. Login Endpoint

```
POST /api/hcl/login
```

**Request:**

```json
{
  "username": "auroraadobetest",
  "password": "passw0rd"
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "wcToken": "eyJhbGc...",
  "accessToken": "eyJhbGc...",
  "userId": "1001",
  "email": "aurora@example.com",
  "displayName": "Aurora Test User",
  "firstName": "Aurora",
  "lastName": "Test",
  "expiresIn": 3600
}
```

**Response (Failure - 401):**

```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

---

### 2. Logout Endpoint

```
POST /api/hcl/logout
```

**Request:**

```json
{
  "wcToken": "eyJhbGc..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 3. Validate Token Endpoint

```
GET /api/hcl/auth/validate?wcToken=eyJhbGc...
```

**Response (Valid):**

```json
{
  "success": true,
  "valid": true
}
```

**Response (Invalid/Expired):**

```json
{
  "success": true,
  "valid": false
}
```

---

## Frontend Implementation (Adobe EDS Storefront)

### Step 1: Create Login Block

Create `blocks/commerce-login/commerce-login.js`:

```javascript
/**
 * Commerce Login Block
 * Adobe EDS Storefront - Block Decorator Pattern
 *
 * This block provides login/logout UI for HCL Commerce authentication
 * Uses sessionStorage to persist wcToken across page reloads
 */

export default async function decorate(block) {
  // Check if user is already logged in
  const wcToken = sessionStorage.getItem("hcl_wcToken");

  if (wcToken) {
    // User is logged in - show logout button
    renderLogoutUI(block);
  } else {
    // User is not logged in - show login form
    renderLoginUI(block);
  }
}

function renderLoginUI(block) {
  block.innerHTML = `
    <div class="login-container">
      <h2>Login</h2>
      <form id="login-form">
        <div class="form-group">
          <label for="username">Username:</label>
          <input 
            type="text" 
            id="username" 
            name="username" 
            required 
            placeholder="Enter your username"
          >
        </div>
        
        <div class="form-group">
          <label for="password">Password:</label>
          <input 
            type="password" 
            id="password" 
            name="password" 
            required 
            placeholder="Enter your password"
          >
        </div>
        
        <button type="submit" class="btn-primary">Login</button>
        <div id="error-message" class="error"></div>
      </form>
    </div>
  `;

  const form = document.getElementById("login-form");
  const errorDiv = document.getElementById("error-message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      errorDiv.innerHTML = "";

      // Call backend login endpoint
      const response = await fetch("/api/hcl/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!data.success) {
        errorDiv.innerHTML = `Error: ${data.error}`;
        return;
      }

      // Store wcToken in sessionStorage
      sessionStorage.setItem("hcl_wcToken", data.wcToken);
      sessionStorage.setItem("hcl_userId", data.userId);
      sessionStorage.setItem("hcl_displayName", data.displayName);
      sessionStorage.setItem(
        "hcl_tokenExpires",
        Date.now() + data.expiresIn * 1000,
      );

      // Refresh the UI
      renderLogoutUI(block);

      // Dispatch custom event for other components to listen
      window.dispatchEvent(
        new CustomEvent("hcl-user-logged-in", {
          detail: {
            userId: data.userId,
            displayName: data.displayName,
            wcToken: data.wcToken,
          },
        }),
      );
    } catch (error) {
      errorDiv.innerHTML = `Error: ${error.message}`;
    }
  });
}

function renderLogoutUI(block) {
  const displayName = sessionStorage.getItem("hcl_displayName") || "User";

  block.innerHTML = `
    <div class="logout-container">
      <p>Welcome, <strong>${displayName}</strong></p>
      <button id="logout-btn" class="btn-secondary">Logout</button>
    </div>
  `;

  const logoutBtn = document.getElementById("logout-btn");

  logoutBtn.addEventListener("click", async () => {
    const wcToken = sessionStorage.getItem("hcl_wcToken");

    try {
      // Call backend logout endpoint
      await fetch("/api/hcl/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wcToken }),
      });

      // Clear sessionStorage
      sessionStorage.removeItem("hcl_wcToken");
      sessionStorage.removeItem("hcl_userId");
      sessionStorage.removeItem("hcl_displayName");
      sessionStorage.removeItem("hcl_tokenExpires");

      // Refresh the UI
      renderLoginUI(block);

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent("hcl-user-logged-out"));
    } catch (error) {
      console.error("Logout error:", error);
    }
  });
}
```

### Step 2: Use wcToken in Cart Operations

In `blocks/product-details/product-details.js`:

```javascript
// When adding to cart, include wcToken in the request
async function addToCart(productData) {
  const wcToken = sessionStorage.getItem("hcl_wcToken");

  if (!wcToken) {
    alert("Please login first");
    return;
  }

  const response = await fetch("/api/hcl/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-WC-Token": wcToken, // Pass token in header
    },
    body: JSON.stringify({
      partNumber: productData.partNumber,
      quantity: productData.quantity,
      price: productData.price,
      productName: productData.name,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    // Handle error - might be token expired
    if (response.status === 401) {
      alert("Session expired. Please login again.");
      sessionStorage.removeItem("hcl_wcToken");
      window.dispatchEvent(new CustomEvent("hcl-user-logged-out"));
    }
    return;
  }

  // Success
  console.log("Item added to cart");
}
```

---

## Testing the Implementation

### Test 1: Login with Valid Credentials

```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "auroraadobetest",
    "password": "passw0rd"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "wcToken": "...",
  "userId": "...",
  "displayName": "Aurora Test User"
}
```

### Test 2: Login with Invalid Credentials

```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "auroraadobetest",
    "password": "wrong"
  }'
```

**Expected Response:**

```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

### Test 3: Logout

```bash
curl -X POST http://localhost:3001/api/hcl/logout \
  -H "Content-Type: application/json" \
  -d '{
    "wcToken": "eyJhbGc..."
  }'
```

### Test 4: Validate Token

```bash
curl "http://localhost:3001/api/hcl/auth/validate?wcToken=eyJhbGc..."
```

---

## Token Management Best Practices

### Frontend Token Storage

```javascript
// Store in sessionStorage (cleared when browser closes)
sessionStorage.setItem("hcl_wcToken", wcToken);
sessionStorage.setItem("hcl_tokenExpires", expiresAt);

// Retrieve when needed
const token = sessionStorage.getItem("hcl_wcToken");
const expiresAt = parseInt(sessionStorage.getItem("hcl_tokenExpires"));

// Check if token is expired
if (Date.now() > expiresAt) {
  // Token expired - prompt user to login again
  sessionStorage.removeItem("hcl_wcToken");
}

// Clear on logout
sessionStorage.removeItem("hcl_wcToken");
sessionStorage.removeItem("hcl_tokenExpires");
```

### Token in API Requests

Always include wcToken when making authenticated requests:

```javascript
const headers = {
  "Content-Type": "application/json",
  Cookie: `WCToken=${wcToken}`, // HCL expects token in cookie
};

// Or use header if supported
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${wcToken}`,
};
```

### Token Refresh/Expiry Handling

Monitor token expiry and prompt re-login:

```javascript
// Check token expiry periodically
function checkTokenExpiry() {
  const expiresAt = parseInt(sessionStorage.getItem("hcl_tokenExpires"));

  if (!expiresAt) return;

  // Warn user 5 minutes before expiry
  const warningTime = expiresAt - 5 * 60 * 1000;

  if (Date.now() > warningTime) {
    showWarning("Your session will expire soon. Please login again.");
  }

  if (Date.now() > expiresAt) {
    // Token expired
    sessionStorage.removeItem("hcl_wcToken");
    window.dispatchEvent(new CustomEvent("hcl-token-expired"));
  }
}

// Check every minute
setInterval(checkTokenExpiry, 60000);
```

---

## Troubleshooting

### Issue: Login returns 401 "Authentication failed"

**Possible Causes:**

1. HCL Commerce VM not accessible
2. Invalid username or password
3. Wrong HCL_HOST URL
4. Network/VPN issue

**Solution:**

```bash
# Test HCL connectivity
curl -v https://20.40.52.251/identity/v1/customers/login \
  -H "Content-Type: application/json" \
  -d '{
    "logonId": "auroraadobetest",
    "password": "passw0rd",
    "storeId": "715842834"
  }'
```

### Issue: Cart operations return 401

**Possible Causes:**

1. wcToken not included in request
2. Token has expired
3. Token format incorrect

**Solution:**

```javascript
// Always check token before API calls
const wcToken = sessionStorage.getItem("hcl_wcToken");
if (!wcToken) {
  alert("Please login first");
  return;
}

// Check expiry
const expiresAt = parseInt(sessionStorage.getItem("hcl_tokenExpires"));
if (Date.now() > expiresAt) {
  alert("Session expired. Please login again.");
  sessionStorage.removeItem("hcl_wcToken");
  return;
}

// Include token in request
const response = await fetch("/api/hcl/cart/add", {
  headers: {
    "X-WC-Token": wcToken,
  },
  // ... other options
});
```

### Issue: "USE_REAL_HCL_AUTH not set" warning

**Solution:**

```bash
# Set environment variable before starting server
export USE_REAL_HCL_AUTH=true
npm run start:proxy

# Or add to .env file
echo "USE_REAL_HCL_AUTH=true" >> .env
```

---

## Files Modified

### Backend Files

- `api/utils/hcl-rest-auth.js` (NEW) - HCL REST API authentication
- `api/controllers/hcl-auth-controller.js` (UPDATED) - Support both real and mock auth
- `api/server.js` (UPDATED) - Added logout and validate endpoints
- `.env` (UPDATED) - Added USE_REAL_HCL_AUTH flag

### Frontend Files (To Create)

- `blocks/commerce-login/commerce-login.js` (NEW) - Login/logout UI
- `blocks/commerce-login/commerce-login.css` (NEW) - Styling
- `blocks/product-details/product-details.js` (UPDATED) - Include wcToken in requests
- `blocks/commerce-cart/commerce-cart.js` (UPDATED) - Include wcToken in requests
- `scripts/initializers/auth.js` (NEW) - Token management and event handling

---

## Summary

The authentication system is now configured to:

✅ Support real HCL Commerce REST API authentication
✅ Use wcToken for all API calls
✅ Handle login/logout flows
✅ Store tokens securely in sessionStorage
✅ Validate token expiry
✅ Provide fallback to mock auth for development

**Next Steps:**

1. Update frontend components to use wcToken
2. Create login/logout UI block
3. Test with real HCL Commerce credentials
4. Implement token expiry handling
5. Add error messages for failed operations
