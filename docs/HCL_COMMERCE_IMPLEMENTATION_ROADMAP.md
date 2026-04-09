# HCL Commerce Integration - Implementation Roadmap

**Phase**: POC Phase 1  
**Duration**: 2-3 weeks  
**Status**: ✅ Ready to Start

---

## 📋 High-Level Implementation Plan

### Layer 1: Backend Proxy (Parallel with Frontend)

**Objective**: Create secure proxy for HCL Commerce API calls

#### Tasks:

1. **Setup Express.js Backend** (Day 1-2)
   - Create `/api` directory with middleware
   - Configure environment variables for HCL credentials
   - Setup error handling & logging
   - Configure CORS for storefront domain

2. **Authentication Endpoint** (Day 2-3)
   - `POST /api/hcl/login`
   - Call HCL `/loginidentity` endpoint
   - Store tokens in server session
   - Return tokens to client (or use httpOnly cookies)
   - Implement token refresh logic

3. **Cart Proxy Endpoints** (Day 3-5)
   - `POST /api/hcl/cart/add` → HCL POST /cart
   - `GET /api/hcl/cart` → HCL GET /cart/@self
   - `PUT /api/hcl/cart/item/:id` → HCL PUT /cart/@self (future)
   - `DELETE /api/hcl/cart/item/:id` → HCL cart remove (future)
   - Add error handling, request validation, logging

4. **Testing & Debugging** (Day 5-6)
   - Unit tests for proxy endpoints
   - Integration tests with HCL staging
   - Postman collection for manual testing
   - Load testing (rate limiting)

**Deliverable**: Production-ready backend proxy

---

### Layer 2: Frontend - Core Services (Days 1-10)

**Objective**: Create foundational services for HCL integration

#### A. HCL Authentication Service (`hcl-commerce-auth.js`)

```javascript
// Key responsibilities:
export const HCLAuthService = {
  // Initialize authentication on page load
  async initialize() {
    const cached = sessionStorage.getItem("hcl_tokens");
    if (cached) {
      this.tokens = JSON.parse(cached);
      // Validate token age
      if (this.isTokenExpired()) {
        await this.refreshTokens();
      }
    } else {
      await this.login();
    }
  },

  // Authenticate with HCL
  async login() {
    const response = await fetch("/api/hcl/login", { method: "POST" });
    this.tokens = await response.json();
    sessionStorage.setItem("hcl_tokens", JSON.stringify(this.tokens));
    return this.tokens;
  },

  // Get current tokens
  getTokens() {
    return this.tokens;
  },

  // Check if token needs refresh
  isTokenExpired() {
    const age = Date.now() - this.tokens.loginTime;
    return age > 25 * 60 * 1000; // 25 min
  },

  // Refresh expired tokens
  async refreshTokens() {
    return this.login();
  },

  // Handle 401 responses
  async handleUnauthorized() {
    await this.refreshTokens();
    return true;
  },
};
```

**Timeline**: Days 1-2

#### B. HCL Commerce API Client (`hcl-commerce-api.js`)

```javascript
// Key responsibilities:
export const HCLCommerceAPI = {
  // Add product to cart
  async addToCart(partNumber, quantity) {
    return this.post("/api/hcl/cart/add", {
      partNumber,
      quantity,
    });
  },

  // Get current cart
  async getCart() {
    return this.get("/api/hcl/cart");
  },

  // Remove item from cart (Phase 2)
  async removeFromCart(orderItemId) {
    return this.delete(`/api/hcl/cart/item/${orderItemId}`);
  },

  // Helper: Make authenticated requests
  async get(endpoint) {
    return this._fetch(endpoint, "GET");
  },

  async post(endpoint, body) {
    return this._fetch(endpoint, "POST", body);
  },

  async put(endpoint, body) {
    return this._fetch(endpoint, "PUT", body);
  },

  async delete(endpoint) {
    return this._fetch(endpoint, "DELETE");
  },

  // Core fetch with error handling & retry
  async _fetch(endpoint, method, body = null) {
    const auth = HCLAuthService;

    // Ensure tokens are valid
    if (auth.isTokenExpired()) {
      await auth.refreshTokens();
    }

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) options.body = JSON.stringify(body);

    let response = await fetch(endpoint, options);

    // Handle 401 (token expired)
    if (response.status === 401) {
      await auth.handleUnauthorized();
      response = await fetch(endpoint, options);
    }

    if (!response.ok) {
      throw new HCLAPIError(response.status, await response.text());
    }

    return response.json();
  },
};
```

**Timeline**: Days 2-3

#### C. Cart Manager Service (`cart-manager.js`)

**Purpose**: Redux-style state management for HCL cart

```javascript
// State shape:
const initialState = {
  cart: {
    orderId: null,
    items: [],
    totals: {
      subtotal: 0,
      shipping: 0,
      tax: 0,
      grandTotal: 0,
    },
  },
  loading: false,
  error: null,
  lastSync: null,
};

// Key actions:
export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case "CART_ADD_ITEM_START":
      return { ...state, loading: true };

    case "CART_ADD_ITEM_SUCCESS":
      return {
        ...state,
        loading: false,
        cart: {
          ...state.cart,
          orderId: action.payload.orderId,
          items: [...state.cart.items, action.payload.item],
        },
        lastSync: Date.now(),
      };

    case "CART_SYNC":
      return {
        ...state,
        cart: action.payload,
        lastSync: Date.now(),
      };

    case "CART_ERROR":
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
};

// Thunk actions:
export const addToCart = (partNumber, qty) => async (dispatch) => {
  dispatch({ type: "CART_ADD_ITEM_START" });
  try {
    const response = await HCLCommerceAPI.addToCart(partNumber, qty);
    dispatch({
      type: "CART_ADD_ITEM_SUCCESS",
      payload: {
        orderId: response.orderId,
        item: { ...response.orderItem[0] },
      },
    });
  } catch (error) {
    dispatch({
      type: "CART_ERROR",
      payload: error.message,
    });
  }
};

export const syncCart = () => async (dispatch) => {
  try {
    const cart = await HCLCommerceAPI.getCart();
    dispatch({
      type: "CART_SYNC",
      payload: cart,
    });
  } catch (error) {
    console.error("Cart sync error:", error);
  }
};
```

**Timeline**: Days 3-4

---

### Layer 3: Frontend - UI Components (Days 5-15)

**Objective**: Build Add to Cart, Mini-Cart, and Cart Page UI

#### A. Add to Cart Button (Days 5-7)

**Update**: `blocks/product-list-page/product-list-page.js`

```javascript
// Add button to product card
function ProductCard({ product }) {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleAddToCart = async () => {
    setLoading(true);
    try {
      await dispatch(addToCart(product.sku, 1));
      showToast("Product added to cart!", "success");
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return html`
    <div class="product-card">
      <img src=${product.image} alt=${product.name} />
      <h3>${product.name}</h3>
      <p class="price">${formatPrice(product.price)}</p>
      <button
        onClick=${handleAddToCart}
        disabled=${loading}
        class="add-to-cart"
      >
        ${loading ? "Adding..." : "Add to Cart"}
      </button>
    </div>
  `;
}
```

**Timeline**: Days 5-6

#### B. Mini-Cart Component (Days 7-10)

**New file**: `blocks/mini-cart/mini-cart.js`

```javascript
function MiniCart() {
  const cart = useSelector((state) => state.cart);
  const [isOpen, setIsOpen] = useState(false);

  return html`
    <div class="mini-cart">
      <button class="toggle" onClick=${() => setIsOpen(!isOpen)}>
        🛒 Cart (${cart.items.length})
      </button>

      ${isOpen &&
      html`
        <div class="dropdown">
          ${cart.items.length === 0
            ? html`<p>Your cart is empty</p>`
            : html`
                <ul>
                  ${cart.items.map(
                    (item) => html`
                      <li key=${item.orderItemId}>
                        <span>${item.partNumber}</span>
                        <span>${item.quantity}x</span>
                        <span>${formatPrice(item.unitPrice)}</span>
                      </li>
                    `,
                  )}
                </ul>
                <div class="summary">
                  <p>Subtotal: ${formatPrice(cart.totals.subtotal)}</p>
                  <a href="/cart">View Cart</a>
                </div>
              `}
        </div>
      `}
    </div>
  `;
}
```

**Files**:

- `blocks/mini-cart/mini-cart.js` (NEW)
- `blocks/mini-cart/mini-cart.css` (NEW)

**Timeline**: Days 7-9

#### C. Cart Page (Days 10-15)

**New file**: `blocks/cart-page/cart-page.js`

```javascript
function CartPage() {
  const cart = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch cart on page load
    dispatch(syncCart()).finally(() => setLoading(false));
  }, []);

  if (loading) return html`<div class="loader">Loading cart...</div>`;

  if (cart.items.length === 0) {
    return html`
      <div class="empty-cart">
        <h1>Your cart is empty</h1>
        <a href="/products">Continue Shopping</a>
      </div>
    `;
  }

  return html`
    <div class="cart-page">
      <h1>Shopping Cart</h1>

      <table class="cart-items">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${cart.items.map(
            (item) => html`
              <tr key=${item.orderItemId}>
                <td>${item.partNumber}</td>
                <td>${formatPrice(item.unitPrice)}</td>
                <td>${item.quantity}</td>
                <td>${formatPrice(item.orderItemPrice)}</td>
                <td>
                  <button onclick=${() => removeItem(item.orderItemId)}>
                    Remove
                  </button>
                </td>
              </tr>
            `,
          )}
        </tbody>
      </table>

      <div class="cart-summary">
        <h3>Order Summary</h3>
        <p>Subtotal: ${formatPrice(cart.totals.subtotal)}</p>
        <p>Shipping: ${formatPrice(cart.totals.shipping)}</p>
        <p>Tax: ${formatPrice(cart.totals.tax)}</p>
        <h2>Total: ${formatPrice(cart.totals.grandTotal)}</h2>

        <button class="checkout-btn" disabled>
          Proceed to Checkout (Coming Soon)
        </button>
      </div>
    </div>
  `;
}
```

**Files**:

- `blocks/cart-page/cart-page.js` (NEW)
- `blocks/cart-page/cart-page.css` (NEW)
- Sub-components: `CartItemList.js`, `CartSummary.js` (optional)

**Timeline**: Days 10-14

---

### Layer 4: Testing & Optimization (Days 14-18)

#### A. Unit Tests (Days 14-15)

```javascript
// __tests__/hcl-commerce-api.test.js
describe("HCL Commerce API", () => {
  test("addToCart returns orderId", async () => {
    const result = await HCLCommerceAPI.addToCart("CLA022_220601", 1);
    expect(result.orderId).toBeDefined();
    expect(result.orderItem).toHaveLength(1);
  });

  test("getCart returns full cart", async () => {
    const result = await HCLCommerceAPI.getCart();
    expect(result.items).toBeDefined();
    expect(result.totals).toBeDefined();
  });
});

// __tests__/cart-manager.test.js
describe("Cart Manager", () => {
  test("ADD_ITEM action adds item to cart", () => {
    const state = cartReducer(initialState, {
      type: "CART_ADD_ITEM_SUCCESS",
      payload: { orderId: "123", item: { id: "1", qty: 1 } },
    });
    expect(state.cart.items).toHaveLength(1);
  });
});
```

**Coverage Target**: 80%+ (functions, lines)

#### B. Integration Tests (Days 15-16)

```javascript
// __tests__/integration/add-to-cart.integration.test.js
describe("Add to Cart Integration", () => {
  test("Full flow: Auth → Add → Sync", async () => {
    // 1. Login
    await HCLAuthService.login();

    // 2. Add to cart
    const result = await HCLCommerceAPI.addToCart("CLA022_220601", 1);
    expect(result.orderId).toBeDefined();

    // 3. Sync cart
    const cart = await HCLCommerceAPI.getCart();
    expect(cart.items.length).toBeGreaterThan(0);
  });
});
```

#### C. E2E Tests (Days 16-17)

```javascript
// cypress/e2e/add-to-cart.cy.js
describe("Add to Cart - E2E", () => {
  it("Should add product to cart and display in mini-cart", () => {
    cy.visit("http://localhost:3000/products");

    // Click add to cart
    cy.get('[data-testid="product-1"]').find(".add-to-cart").click();

    // Check mini-cart updates
    cy.get(".mini-cart").should("contain", "Cart (1)");

    // Navigate to cart page
    cy.get(".mini-cart a").click();
    cy.url().should("include", "/cart");

    // Verify item in cart
    cy.get(".cart-items").should("contain", "CLA022_220601");
  });
});
```

#### D. Performance & Optimization (Day 17-18)

- ✅ Memoize components to prevent unnecessary re-renders
- ✅ Lazy load cart page
- ✅ Cache cart in sessionStorage (survive page refresh)
- ✅ Optimize images (responsive srcset)
- ✅ Minify CSS/JS bundles
- ✅ Load test backend proxy (100+ requests/sec)

---

### Layer 5: Deployment & Go-Live (Days 18-19)

#### Pre-Deployment Checklist

- [ ] All unit tests passing (80%+ coverage)
- [ ] All E2E tests passing
- [ ] Linting: 0 errors
- [ ] Performance: API response < 500ms
- [ ] Security review passed
- [ ] Environment variables configured
- [ ] Error logging setup
- [ ] Monitoring/alerts configured

#### Staging Validation (Day 18)

- [ ] Test on HCL staging with real data
- [ ] User acceptance testing (QA team)
- [ ] Performance profiling
- [ ] Browser compatibility (Chrome, FF, Safari, Edge)
- [ ] Mobile testing (iOS/Android)

#### Production Deployment (Day 19)

- [ ] Deploy backend proxy
- [ ] Deploy frontend blocks
- [ ] Verify all integrations
- [ ] Monitor error logs (24 hrs)
- [ ] User feedback collection

---

## 📅 Day-by-Day Timeline

| Day   | Owner     | Task                     | Status |
| ----- | --------- | ------------------------ | ------ |
| 1-2   | Backend   | Express proxy setup      | ⏳     |
| 2-3   | Backend   | HCL auth endpoint        | ⏳     |
| 3-5   | Backend   | Cart proxy endpoints     | ⏳     |
| 1-2   | Frontend  | HCL Auth service         | ⏳     |
| 2-3   | Frontend  | HCL API client           | ⏳     |
| 3-4   | Frontend  | Cart manager (Redux)     | ⏳     |
| 5-6   | Frontend  | Add to Cart button       | ⏳     |
| 7-9   | Frontend  | Mini-cart component      | ⏳     |
| 10-14 | Frontend  | Cart page block          | ⏳     |
| 14-15 | QA        | Unit tests               | ⏳     |
| 15-16 | QA        | Integration tests        | ⏳     |
| 16-17 | QA        | E2E tests                | ⏳     |
| 17-18 | Frontend  | Performance optimization | ⏳     |
| 18    | QA/DevOps | Staging validation       | ⏳     |
| 19    | DevOps    | Production deployment    | ⏳     |

---

## ✅ Definition of Done

**Feature complete when:**

- ✅ All code written and reviewed
- ✅ Unit tests passing (80%+ coverage)
- ✅ E2E tests passing
- ✅ Staging validation passed
- ✅ Performance benchmarks met
- ✅ Security review passed
- ✅ Documentation updated
- ✅ Team trained on deployment

---

## 🎯 Success Metrics (Post-Launch)

| Metric                    | Target  | Tool              |
| ------------------------- | ------- | ----------------- |
| Add to cart latency (p95) | < 500ms | APM               |
| Cart page load (p95)      | < 1s    | Lighthouse        |
| API availability          | 99.5%+  | Uptime monitoring |
| Error rate                | < 0.1%  | Error tracking    |
| Browser support           | 95%+    | Sentry            |

---

## 🚀 Ready to Build!

**All planning complete. Development can start immediately.**

**Next Steps**:

1. Review this roadmap with team
2. Assign owners to backend/frontend
3. Setup repositories & CI/CD
4. Kickoff meeting with all stakeholders
5. Start Day 1 tasks

---

_Document Version: 1.0_  
_Created: April 5, 2026_  
_Status: Ready for Development_
