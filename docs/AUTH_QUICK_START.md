# HCL Commerce Authentication - Quick Start

## 🚀 Get Started with Real HCL Authentication

This guide will help you test the real HCL Commerce REST API authentication with your credentials.

---

## Option A: Test with Real HCL Commerce (Recommended)

### Prerequisites

- ✅ VPN access to HCL Commerce VM
- ✅ HCL_HOST is reachable (https://20.40.52.251)
- ✅ Test credentials: `auroraadobetest` / `passw0rd`

### Step 1: Start the Backend Server

```bash
# Terminal 1: Navigate to project
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

# Make sure USE_REAL_HCL_AUTH is set to true in .env file
cat .env | grep USE_REAL_HCL_AUTH

# Start the server
npm run start:proxy
```

**Expected Output:**

```
╔════════════════════════════════════════════════════════╗
║  🛒 HCL Commerce Proxy Server                          ║
║  Status: ✅ RUNNING                                    ║
║  Port: 3001                                            ║
║  Environment: development                              ║
╚════════════════════════════════════════════════════════╝
```

### Step 2: Test Login with Real Credentials

**Option A1: Using PowerShell**

```powershell
# Test login with real HCL
$body = @{
    username = "auroraadobetest"
    password = "passw0rd"
} | ConvertTo-Json

$response = Invoke-WebRequest `
    -Uri "http://localhost:3001/api/hcl/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -SkipHttpErrorCheck

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**Option A2: Using curl**

```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "auroraadobetest",
    "password": "passw0rd"
  }' | jq
```

**Option A3: Using Node.js**

```javascript
// test-auth.mjs
const response = await fetch("http://localhost:3001/api/hcl/login", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    username: "auroraadobetest",
    password: "passw0rd",
  }),
});

const data = await response.json();
console.log(data);
```

```bash
node test-auth.mjs
```

### Step 3: Expected Response

**Success (200):**

```json
{
  "success": true,
  "wcToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "1001",
  "email": "aurora@example.com",
  "displayName": "Aurora Test User",
  "firstName": "Aurora",
  "lastName": "Test",
  "expiresIn": 3600
}
```

**Failure (401):**

```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

### Step 4: Use wcToken in Cart Operations

Once you have the wcToken, use it in subsequent requests:

```bash
# Store the token from login response
wcToken="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Add to cart with wcToken
curl -X POST http://localhost:3001/api/hcl/cart/add \
  -H "Content-Type: application/json" \
  -H "X-WC-Token: $wcToken" \
  -d '{
    "partNumber": "ABC123",
    "quantity": 1,
    "price": 99.99,
    "productName": "Test Product"
  }'
```

---

## Option B: Test with Mock Authentication (No VPN Required)

### Setup

```bash
# Edit .env file to use mock auth
echo "USE_REAL_HCL_AUTH=false" > .env

# Or modify the file directly
# Set: USE_REAL_HCL_AUTH=false
```

### Start Server

```bash
npm run start:proxy
```

### Test Login with Mock Credentials

**Available Test Users:**

- `auroraadobetest` / `passw0rd`
- `adobetest1` / `passw0rd`
- `adobetest2` / `passw0rd`

```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "auroraadobetest",
    "password": "passw0rd"
  }'
```

**Note:** Mock tokens are NOT valid for real HCL API calls. Use only for UI/UX testing.

---

## Testing All Authentication Endpoints

### 1. Test Login

```bash
# Valid credentials
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{"username":"auroraadobetest","password":"passw0rd"}'

# Invalid credentials
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{"username":"auroraadobetest","password":"wrong"}'
```

### 2. Test Validate Token

```bash
# Replace TOKEN with actual wcToken from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl "http://localhost:3001/api/hcl/auth/validate?wcToken=$TOKEN"
```

### 3. Test Logout

```bash
curl -X POST http://localhost:3001/api/hcl/logout \
  -H "Content-Type: application/json" \
  -d '{"wcToken":"'"$TOKEN"'"}'
```

---

## Frontend Integration (Adobe EDS Storefront)

### Step 1: Create Login Block

The login block should be added at `blocks/commerce-login/`:

```javascript
// blocks/commerce-login/commerce-login.js
export default async function decorate(block) {
  const wcToken = sessionStorage.getItem("hcl_wcToken");

  if (wcToken) {
    // Show logout button
    block.innerHTML = `
      <p>Welcome back! <button onclick="logout()">Logout</button></p>
    `;
  } else {
    // Show login form
    block.innerHTML = `
      <form onsubmit="handleLogin(event)">
        <input type="text" id="username" placeholder="Username" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
    `;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("/api/hcl/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();
  if (data.success) {
    sessionStorage.setItem("hcl_wcToken", data.wcToken);
    location.reload();
  }
}

function logout() {
  sessionStorage.removeItem("hcl_wcToken");
  location.reload();
}
```

### Step 2: Use wcToken in Cart Operations

In any block that needs authentication (product-details, mini-cart, etc.):

```javascript
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
      "X-WC-Token": wcToken,
    },
    body: JSON.stringify(productData),
  });

  const data = await response.json();
  if (data.success) {
    console.log("Item added to cart");
  } else if (response.status === 401) {
    alert("Session expired. Please login again.");
    sessionStorage.removeItem("hcl_wcToken");
  }
}
```

---

## Troubleshooting

### Error: "Cannot POST /api/hcl/login"

**Solution:** Make sure the server is running on port 3001

```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# If in use, kill the process
taskkill /PID <PID> /F
```

### Error: "Connection refused" to HCL_HOST

**Solutions:**

1. Check VPN connection is active
2. Verify HCL_HOST in .env: `https://20.40.52.251`
3. Check firewall allows HTTPS to that host
4. Switch to mock auth for now: `USE_REAL_HCL_AUTH=false`

### Error: "Invalid username or password"

**Solutions:**

1. Double-check credentials: `auroraadobetest` / `passw0rd`
2. Verify username is correct (case-sensitive)
3. Try alternative test users: `adobetest1` / `passw0rd`
4. Check HCL Commerce is running on VM

### Error: "No wcToken in response"

**Solution:** The HCL Commerce API returned unexpected response format. Check:

1. HCL version is 9.0 (as per documentation)
2. Endpoint is correct: `/identity/v1/customers/login`
3. Check console logs on backend for detailed error

### Server won't start with "Cannot find module"

**Solution:**

```bash
# Reinstall dependencies
npm install

# Or update dependencies
npm update

# Then try again
npm run start:proxy
```

---

## Development Workflow

### 1. Start Server (Terminal 1)

```bash
npm run start:proxy
```

### 2. Test Backend Endpoints (Terminal 2)

```bash
# Login test
curl -X POST http://localhost:3001/api/hcl/login ...

# Cart operations test
curl -X POST http://localhost:3001/api/hcl/cart/add ...
```

### 3. Frontend Development (Terminal 3 - Optional)

```bash
# If you're using EDS local development
npm run dev
```

### 4. Test in Browser

1. Navigate to storefront (http://localhost:3000 or local EDS)
2. See login component
3. Enter credentials: `auroraadobetest` / `passw0rd`
4. Click "Login"
5. See wcToken stored in sessionStorage

### 5. Test Cart Operations

1. Try adding product to cart
2. Should work with authenticated wcToken
3. Check console for any errors

---

## Files Created/Modified

**New Files:**

- `api/utils/hcl-rest-auth.js` - Real HCL REST API integration
- `HCL_AUTHENTICATION_GUIDE.md` - Detailed authentication documentation
- `PHASE_1_TESTING_COMPLETE.md` - Testing phase summary

**Modified Files:**

- `api/controllers/hcl-auth-controller.js` - Added logout, validate endpoints
- `api/server.js` - Added new authentication endpoints
- `api/utils/mock-hcl-auth.js` - Added test credentials
- `.env` - Added USE_REAL_HCL_AUTH flag

---

## What's Next

1. ✅ Backend authentication system implemented
2. ⏳ **Create login/logout UI block** (Next Step)
3. ⏳ **Use wcToken in cart operations** (After UI)
4. ⏳ **Test full end-to-end flow** (Final)
5. ⏳ **Deploy to production** (When ready)

---

## Need Help?

- Check `HCL_AUTHENTICATION_GUIDE.md` for detailed documentation
- Review server logs: `npm run start:proxy` shows all requests
- Test endpoints with curl before building UI
- Verify .env file has correct HCL_HOST and authentication mode

---

## Key Credentials for Testing

```
Username: auroraadobetest
Password: passw0rd

Username: adobetest1
Password: passw0rd

Username: adobetest2
Password: passw0rd
```

All passwords are: `passw0rd`

---

**Status: ✅ Authentication System Ready for Frontend Integration**
