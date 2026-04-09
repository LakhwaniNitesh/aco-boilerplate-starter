# HCL Commerce Architecture & Why Three Servers

**Date:** April 9, 2026  
**Status:** Complete  
**Audience:** Technical team, architects, stakeholders

---

## Table of Contents

1. [System Architecture Diagram](#system-architecture-diagram)
2. [The Three-Server Model Explained](#the-three-server-model-explained)
3. [Why This Architecture](#why-this-architecture)
4. [Data Flow Examples](#data-flow-examples)
5. [Technology Stack](#technology-stack)

---

## System Architecture Diagram

### **Complete System Flow**

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  LAYER 1: PRESENTATION LAYER (Browser)                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  Browser @ http://localhost:3000                                 │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ HTML/CSS/JavaScript (EDS Blocks)                           │ │ │
│  │  ├─────────────────────────────────────────────────────────────┤ │ │
│  │  │ Components:                                                 │ │ │
│  │  │ • Header (navigation, user info)                          │ │ │
│  │  │ • Product Category (product grid)                         │ │ │
│  │  │ • Product Details (single product view)                  │ │ │
│  │  │ • Shopping Cart (items, totals)                          │ │ │
│  │  │ • Login Form (email/password)                            │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ sessionStorage (Client-side)                               │ │ │
│  │  │ • accessToken (WCToken)                                    │ │ │
│  │  │ • trustedToken (WCTrustedToken)                            │ │ │
│  │  │ • sessionCookies (JSESSIONID, WC_PERSISTENT)              │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                            ↓ HTTP/HTTPS ↓                              │
│                   (Same origin: localhost)                              │
│                                                                          │
│  LAYER 2: PROXY LAYER (API Gateway)                                    │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  Node.js/Express @ http://localhost:3001                         │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Express Routes:                                             │ │ │
│  │  │                                                             │ │ │
│  │  │ POST   /api/hcl/login                                      │ │ │
│  │  │   ├─ Receive: { email, password }                          │ │ │
│  │  │   ├─ Forward to HCL: /login                                │ │ │
│  │  │   └─ Return: { accessToken, trustedToken, cookies }        │ │ │
│  │  │                                                             │ │ │
│  │  │ GET    /api/hcl/cart                                       │ │ │
│  │  │   ├─ Receive: authorization header                         │ │ │
│  │  │   ├─ Forward to HCL: GET /cart/@self?responseFormat=json   │ │ │
│  │  │   ├─ Normalize response                                    │ │ │
│  │  │   └─ Return: { items: [...], total: 123.45 }              │ │ │
│  │  │                                                             │ │ │
│  │  │ DELETE /api/hcl/cart/remove                                │ │ │
│  │  │   ├─ Receive: { orderItemId }                              │ │ │
│  │  │   ├─ Forward to HCL: PUT /cart/@self/delete_order_item    │ │ │
│  │  │   ├─ Fetch updated cart: GET /cart/@self                   │ │ │
│  │  │   ├─ Normalize response                                    │ │ │
│  │  │   └─ Return: { items: [...], total: 100.00 }              │ │ │
│  │  │                                                             │ │ │
│  │  │ GET    /api/hcl/products                                   │ │ │
│  │  │   ├─ Optional: receive search query                        │ │ │
│  │  │   ├─ Forward to HCL: GET /products                         │ │ │
│  │  │   ├─ Normalize/filter response                             │ │ │
│  │  │   └─ Return: { products: [...] }                           │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ HCL Client (hcl-client.js)                                 │ │ │
│  │  │                                                             │ │ │
│  │  │ Responsibilities:                                           │ │ │
│  │  │ ✓ Format WCToken as URL-encoded header                    │ │ │
│  │  │ ✓ Format WCTrustedToken as URL-encoded header              │ │ │
│  │  │ ✓ Manage JSESSIONID & WC_PERSISTENT cookies               │ │ │
│  │  │ ✓ Handle redirects and retries                             │ │ │
│  │  │ ✓ Parse HCL responses                                      │ │ │
│  │  │ ✓ Error handling & logging                                 │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Response Normalization (Controllers)                        │ │ │
│  │  │                                                             │ │ │
│  │  │ HCL Response:          Normalized:                          │ │ │
│  │  │ {                      {                                    │ │ │
│  │  │   orderItem: [...],    items: [                            │ │ │
│  │  │   totalProductPrice,   {                                   │ │ │
│  │  │   ...40 other fields   partNumber, sku, quantity,          │ │ │
│  │  │ }                      price, name, orderItemId            │ │ │
│  │  │                        }                                    │ │ │
│  │  │                      ],                                     │ │ │
│  │  │                      total: 123.45                          │ │ │
│  │  │                    }                                        │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                            ↓ HTTPS ↓                                    │
│         WCToken: 1007002%2CtVXIh2OYL... (URL-encoded)                 │
│         WCTrustedToken: 1007002%2CtdCdQrS... (URL-encoded)            │
│         JSESSIONID=0000seUZ5q2FgWV... (from cookie jar)               │
│                                                                          │
│  LAYER 3: BACKEND LAYER (Business Logic)                              │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                                                                    │ │
│  │  HCL Commerce SaaS (Cloud-hosted)                                │ │
│  │  https://20.40.52.251/wcs/resources/store/715842834/             │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ REST API Endpoints:                                         │ │ │
│  │  │                                                             │ │ │
│  │  │ POST /login                                                │ │ │
│  │  │   └─ Returns: WCToken, WCTrustedToken, JSESSIONID         │ │ │
│  │  │                                                             │ │ │
│  │  │ GET /cart/@self?responseFormat=json                        │ │ │
│  │  │   └─ Returns: Complete cart with all items & metadata      │ │ │
│  │  │                                                             │ │ │
│  │  │ PUT /cart/@self/delete_order_item                          │ │ │
│  │  │   ├─ Body: { orderItemId: "6560190", ... }                │ │ │
│  │  │   └─ Returns: Updated cart (but incomplete)                │ │ │
│  │  │                                                             │ │ │
│  │  │ GET /products?responseFormat=json                          │ │ │
│  │  │   └─ Returns: All products with details                    │ │ │
│  │  │                                                             │ │ │
│  │  │ PUT /cart?langId=1&responseFormat=json                     │ │ │
│  │  │   ├─ Body: { orderItem: [...], storeId, ... }             │ │ │
│  │  │   └─ Returns: Updated cart                                 │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────┐ │ │
│  │  │ Database & Services:                                        │ │ │
│  │  │ ✓ User accounts & authentication                            │ │ │
│  │  │ ✓ Product catalog                                           │ │ │
│  │  │ ✓ Shopping carts                                            │ │ │
│  │  │ ✓ Order management                                          │ │ │
│  │  │ ✓ Inventory tracking                                        │ │ │
│  │  │ ✓ Session management                                        │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## The Three-Server Model Explained

### **Server 1: Frontend (Port 3000) - The User Interface**

**What It Is:**
- Static HTML, CSS, JavaScript
- Runs in user's browser
- Edge Delivery Services (EDS) blocks
- No server-side logic

**What It Does:**
```javascript
// User clicks "Add to Cart" button
user_clicks() → JavaScript event listener
  ↓
get_token_from_sessionStorage()
  ↓
fetch('/api/hcl/cart/add', {
  method: 'POST',
  body: { productId: 123, quantity: 1, accessToken: '...' }
})
  ↓
update_cart_display_in_browser()
```

**Why Separate Server:**
- Users see beautiful UI instantly
- EDS caches globally for speed
- Can be deployed anywhere (Netlify, Vercel, AEM)
- Doesn't need to talk directly to HCL (which is far away)

**Ports:**
- Local: `http://localhost:3000`
- Production: `https://yourdomain.com`

---

### **Server 2: Proxy (Port 3001) - The Traffic Controller**

**What It Is:**
- Node.js/Express application
- Runs on your infrastructure
- Acts as intermediary between frontend and HCL
- Handles all business logic

**What It Does:**
```javascript
// Receives request from frontend
app.post('/api/hcl/cart/add', (req, res) => {
  // 1. VALIDATE: Check token exists
  const { accessToken, trustedToken, productId } = req.body;
  if (!accessToken || !trustedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // 2. TRANSFORM: Format for HCL
  const requestBody = {
    orderItem: [{
      partNumber: productId,
      quantity: '1'
    }],
    orderId: '.'
  };
  
  // 3. CALL HCL: Make HTTPS request
  const response = await hclClient.addToCart(
    accessToken, 
    trustedToken, 
    requestBody
  );
  
  // 4. NORMALIZE: Transform response
  const normalizedCart = normalizeHCLCart(response);
  
  // 5. RESPOND: Send back to frontend
  res.json({
    success: true,
    cart: normalizedCart  // Clean data, no HCL implementation details
  });
});
```

**Why Separate Server:**
- Frontend can't call HCL directly (CORS blocks it)
- Tokens must be kept server-side (security)
- Can normalize messy HCL responses
- Can cache, log, monitor, rate-limit
- Can be scaled independently

**Ports:**
- Local: `http://localhost:3001`
- Production: `https://hcl-proxy-prod.azurewebsites.net` (or similar)

**Key Differences from Frontend:**
- Has direct HTTPS connection to HCL
- Can store tokens safely (not exposed to browser)
- Manages session cookies (JSESSIONID, WC_PERSISTENT)
- Transforms data before sending to browser
- Implements business rules and validation

---

### **Server 3: Backend (HCL Commerce) - The Source of Truth**

**What It Is:**
- Cloud SaaS (you don't run it)
- Managed by HCL Inc.
- Remote HTTPS API
- Holds all business data

**What It Does:**
```
HCL Commerce API Responsibilities:
├─ User Authentication
│  ├─ Validate email/password
│  ├─ Generate WCToken (short-lived)
│  ├─ Generate WCTrustedToken (longer-lived)
│  └─ Create JSESSIONID session
│
├─ Product Management
│  ├─ Store product catalog
│  ├─ Manage product details
│  ├─ Handle search queries
│  └─ Track inventory
│
├─ Shopping Cart
│  ├─ Create new carts
│  ├─ Add/remove items
│  ├─ Calculate totals (tax, shipping)
│  └─ Validate availability
│
├─ Orders
│  ├─ Process checkout
│  ├─ Create orders
│  └─ Track order history
│
└─ Security
   ├─ Validate tokens
   ├─ Manage sessions
   ├─ Enforce rate limiting
   └─ Audit logs
```

**Why Remote Server:**
- You don't need to host e-commerce infrastructure
- HCL handles uptime, scaling, backup, security
- Shared across multiple merchants (multi-tenant)
- Continuous updates without your involvement

**Endpoint:**
```
https://20.40.52.251/wcs/resources/store/715842834/
```

---

## Why This Architecture

### **1. Separation of Concerns**

```
Frontend:       What to display
Proxy:         How to get & transform data
Backend:       Where data lives
```

Each server has one job. Easier to maintain, test, and scale.

### **2. Security**

```
❌ BAD: Browser → CORS blocks
  Browser has token → Exposed to hackers
  
✅ GOOD: Browser → Proxy → HCL
  Token stays on proxy (safe)
  Frontend only sees normalized data
  Browser never sees raw credentials
```

### **3. CORS (Cross-Origin Resource Sharing)**

```
Browser @ localhost:3000
  └─ Tries to fetch from localhost:3001 ✓ Same origin (allowed)
  └─ Tries to fetch from 20.40.52.251 ✗ Different origin (blocked!)

Solution:
Browser @ localhost:3000
  └─ Calls Proxy @ localhost:3001 ✓ Allowed
  └─ Proxy calls HCL @ 20.40.52.251 ✓ Allowed (server-to-server)
```

### **4. Data Normalization**

```
HCL Response (40+ fields):
{
  "orderId": "764613",
  "orderItem": [
    {
      "orderItemId": "6560190",
      "productName": "CLA022_220601",
      "displayName": "Class A Material",
      "partNumber": "SKU-12345",
      "quantity": "5",
      "unitPrice": "123.45",
      "totalPrice": "617.25",
      ... 20 more fields ...
    }
  ],
  "totalProductPrice": "6862.98",
  ... 30 more fields ...
}

Normalized Response (clean & simple):
{
  "cartId": "764613",
  "items": [
    {
      "partNumber": "SKU-12345",
      "sku": "SKU-12345",
      "quantity": 5,
      "price": 123.45,
      "name": "Class A Material",
      "orderItemId": "6560190"
    }
  ],
  "total": 6862.98
}
```

### **5. Independent Scaling**

```
Black Friday (High Traffic):

Frontend Layer:
├─ EDS caches globally → handles millions of views
└─ No changes needed

Proxy Layer:
├─ Scale from 1 → 10 servers
├─ Add load balancer
├─ No code changes needed
└─ Handles API traffic spike

Backend Layer:
├─ HCL automatically scales
├─ You don't manage it
└─ Stays reliable regardless
```

### **6. Flexibility & Independence**

```
Want to switch from HCL to Shopify?
├─ Frontend: No changes (still same blocks)
├─ Proxy: Replace HCL controllers with Shopify controllers
└─ Backend: Now points to Shopify API

Want to add a mobile app?
├─ Frontend: Build React Native app
├─ Proxy: Same endpoints (data already normalized)
├─ Backend: No changes
```

---

## Data Flow Examples

### **Example 1: User Login**

```
┌──────────────┐
│ User clicks  │
│ "Login"      │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────┐
│ Browser → Proxy              │
│ POST /api/hcl/login          │
│ Body: {                       │
│   email: "user@example.com", │
│   password: "secret123"      │
│ }                            │
└──────┬───────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ Proxy → HCL Commerce              │
│ POST /login                        │
│ Same body                          │
│ (proxy just forwards request)      │
└──────┬─────────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ HCL Validates Credentials        │
│ Returns:                          │
│ {                                │
│   WCToken: "1007002%2CtVXIh...", │
│   WCTrustedToken: "1007002%2C...", │
│   JSESSIONID: "0000seUZ5..."     │
│ }                                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Proxy Stores Tokens              │
│ (keeps in memory for future API  │
│  calls with this session)        │
│                                  │
│ Also Returns to Browser:         │
│ {                                │
│   accessToken: "...",           │
│   trustedToken: "...",          │
│   sessionCookies: {...}         │
│ }                                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ Browser Stores Tokens            │
│ sessionStorage.setItem(...)      │
│                                  │
│ Redirects to /catalog            │
└──────────────────────────────────┘
```

### **Example 2: Remove from Cart**

```
┌──────────────────┐
│ User clicks X on │
│ cart item        │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ JavaScript event listener           │
│ Reads token from sessionStorage     │
│ POST /api/hcl/cart/remove           │
│ Body: {                             │
│   orderItemId: "6560190",          │
│   accessToken: "...",              │
│   trustedToken: "..."              │
│ }                                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Proxy Receives Request              │
│ Verifies token is valid            │
│ (checks if expired)                 │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Proxy → HCL:                        │
│ PUT /cart/@self/delete_order_item   │
│ Headers:                            │
│   WCToken: <URL-encoded>           │
│   WCTrustedToken: <URL-encoded>    │
│   Cookie: JSESSIONID=...           │
│ Body: {                             │
│   orderItemId: "6560190",          │
│   orderId: ".",                    │
│   ...                               │
│ }                                   │
└────────┬───────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ HCL Removes Item From Cart           │
│ Returns 200 OK (but incomplete      │
│ response)                            │
└────────┬───────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ CRITICAL: Proxy Fetches Updated Cart │
│ GET /cart/@self?responseFormat=json  │
│ (gets accurate item list & totals)  │
│                                      │
│ Returns Full Cart Data               │
└────────┬───────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Proxy Normalizes Response            │
│ {                                    │
│   items: [...15 remaining items...], │
│   total: 7862.98                    │
│ }                                    │
└────────┬───────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Browser Receives Response            │
│ Updates Cart Display                 │
│ Item Removed ✓                       │
│ Totals Correct ✓                     │
└──────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML/CSS/JavaScript | Render UI blocks |
| **Frontend** | sessionStorage API | Store tokens on client |
| **Frontend** | Fetch API | Make HTTP calls to proxy |
| **Proxy** | Node.js | JavaScript runtime |
| **Proxy** | Express.js | Web framework, routing |
| **Proxy** | axios/node-fetch | Make HTTPS calls to HCL |
| **Proxy** | dotenv | Load environment variables |
| **Backend** | HCL Commerce | E-commerce platform (SaaS) |
| **Backend** | PostgreSQL/Oracle | Database (inside HCL) |
| **Backend** | HTTPS/TLS | Encrypted communication |

---

## Summary

```
WHY THREE SERVERS?

Frontend (Port 3000):
  Role: Display → User clicks → Send HTTP to proxy
  Why: Users see pretty UI, can be cached globally

Proxy (Port 3001):
  Role: Translate → Validate → Transform → Handle auth
  Why: Talk to HCL securely, keep tokens server-side, normalize messy data

Backend (Remote HTTPS):
  Role: Store & Process → User data, products, carts, orders
  Why: SaaS service (you don't run it), single source of truth

Together: A scalable, secure, maintainable e-commerce storefront!
```

---

## Next Steps

1. ✅ **Local Development** - Run all three servers locally
2. ✅ **Testing** - Verify login, products, cart, checkout work
3. → **Deployment** - Deploy to production (see QUICK_DEPLOYMENT_GUIDE.md)
4. → **Monitoring** - Set up logging and alerts
5. → **Scale** - Add more proxy servers if needed
