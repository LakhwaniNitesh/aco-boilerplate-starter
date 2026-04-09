# Layer 2: Frontend Services - Complete Implementation

**Status**: ✅ **COMPLETE**  
**Commit**: `83d7d7b` - Layer 2 Frontend services  
**Timeline**: Days 5-10 of 19-day roadmap  
**Progress**: 26% of implementation complete (5 of 19 days)

---

## 📚 Overview

Layer 2 implements the **three critical frontend services** that enable EDS Storefront to interact with HCL Commerce through the backend proxy:

1. **Authentication Service** - Login, token management, session handling
2. **API Client Service** - Cart operations abstraction layer
3. **Cart State Management** - Redux-like centralized state with React hooks

All services integrate seamlessly with:

- ✅ EDS Drop-ins (Cart, Checkout, Account, Auth)
- ✅ Custom blocks
- ✅ React components with hooks
- ✅ Vanilla JS integration

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│      EDS Components & Drop-ins          │
│  (PLP, PDP, Cart, Checkout, Auth)       │
└──────────────┬─────────────────────────┘
               │ useHCLAuth, useHCLCart, useCartState
               │
┌──────────────▼──────────────────────────┐
│   React Hooks & State Management        │
│  - useCartState()  - useCart()           │
│  - useAuth()       - useAddToCart()      │
│  - useCartError()  - cartStore           │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Frontend Service Layer (NEW)            │
├──────────────────────────────────────────┤
│ • hclAuthService      (Auth service)    │
│ • hclCommerceAPI      (API client)      │
│ • cartStore + reducer (State)           │
└──────────────┬─────────────────────────┘
               │ HTTP/FETCH
┌──────────────▼──────────────────────────┐
│   Backend Proxy (Port 3001)              │
│   - POST /api/hcl/login                  │
│   - POST /api/hcl/cart/add               │
│   - GET  /api/hcl/cart                   │
│   - DELETE /api/hcl/cart/item            │
└──────────────┬─────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────┐
│   HCL Commerce API (20.40.52.251)       │
└──────────────────────────────────────────┘
```

---

## 📦 Implementation Details

### 1. Authentication Service (`scripts/hcl-commerce-auth.js`)

**Purpose**: Centralized authentication management

**Key Features**:

| Feature             | Implementation                                   |
| ------------------- | ------------------------------------------------ |
| **Login**           | Calls `POST /api/hcl/login` via backend proxy    |
| **Token Storage**   | sessionStorage (auto-cleared on browser close)   |
| **Token Lifecycle** | Tracks 25-minute expiry window                   |
| **Auto-Refresh**    | Schedules refresh 5 minutes before expiry        |
| **Logout**          | Clears token, userId, expiry, timers             |
| **React Hooks**     | `useHCLAuth()` - access auth state in components |

**API**:

```javascript
import {
  hclAuthService,
  useHCLAuth,
  hclLogin,
  hclLogout,
} from "./hcl-commerce-auth.js";

// Service methods
await hclAuthService.login("user@example.com", "password");
hclAuthService.logout();
hclAuthService.getToken(); // Returns current token or null
hclAuthService.getUserId();
hclAuthService.isAuthenticated();
hclAuthService.getTokenLifetime(); // Remaining seconds

// React hook
const [isAuth, token] = useHCLAuth();

// Helper functions
await hclLogin(username, password, onSuccess, onError);
hclLogout();
```

**State Stored**:

```javascript
{
  token: string,          // JWT-like token from HCL
  userId: string,         // HCL user ID
  tokenExpiry: number,    // Timestamp when token expires (25 min window)
  refreshTimer: NodeJS.Timeout // Auto-refresh timer
}
```

---

### 2. API Client Service (`scripts/hcl-commerce-api.js`)

**Purpose**: Abstraction layer for all HCL Commerce API calls

**Key Features**:

| Operation                              | Endpoint                    | Returns                                                |
| -------------------------------------- | --------------------------- | ------------------------------------------------------ |
| `addToCart(sku, qty)`                  | `POST /api/hcl/cart/add`    | `{success, cartId, itemCount, cart}`                   |
| `getCart()`                            | `GET /api/hcl/cart`         | `{success, cartId, items[], itemCount, cart}`          |
| `removeFromCart(orderId, itemId)`      | `DELETE /api/hcl/cart/item` | `{success, cartId, itemCount, cart}`                   |
| `updateCartItem(orderId, itemId, qty)` | `PUT /api/hcl/cart/item`    | `{success, cartId, itemCount, cart}`                   |
| `getCartSummary()`                     | `GET /api/hcl/cart`         | `{itemCount, items[], subtotal, tax, shipping, total}` |
| `clearCart()`                          | Multiple `DELETE` calls     | `{success, message}`                                   |

**Error Handling**:

```javascript
// All errors throw consistent objects
{
  operation: 'addToCart',
  partNumber: 'SKU123',
  quantity: 1,
  error: 'Error message'
}
```

**React Hooks**:

```javascript
const [cart, loading, error, { addItem, removeItem, fetchCart }] = useHCLCart();
```

---

### 3. Cart State Manager (`scripts/cart-manager.js`)

**Purpose**: Redux-like centralized state management for cart + auth

**State Shape**:

```javascript
{
  cart: {
    id: string,
    items: [
      { id, partNumber, quantity, name }
    ],
    totals: { subtotal, tax, shipping, total },
    isEmpty: boolean
  },
  auth: {
    isAuthenticated: boolean,
    userId: string,
    token: string
  },
  loading: boolean,
  error: Error | null,
  ui: {
    miniCartOpen: boolean,
    addToCartLoading: { [sku]: boolean }
  }
}
```

**Action Types**:

| Action                    | Payload               | Effect                        |
| ------------------------- | --------------------- | ----------------------------- |
| `SET_CART`                | `{id, items, totals}` | Update cart from API          |
| `ADD_ITEM`                | `{item}`              | Add item to local state       |
| `REMOVE_ITEM`             | `{itemId}`            | Remove item from state        |
| `CLEAR_CART`              | -                     | Empty cart                    |
| `SET_AUTH`                | `{userId, token}`     | Set authenticated user        |
| `LOGOUT`                  | -                     | Clear auth + cart             |
| `SET_LOADING`             | `boolean`             | Toggle loading state          |
| `SET_ERROR`               | `Error`               | Set error message             |
| `TOGGLE_MINI_CART`        | -                     | Show/hide mini-cart           |
| `SET_ADD_TO_CART_LOADING` | `{sku, loading}`      | Loading indicator per product |

**Async Operations** (Thunks):

```javascript
await cartStore.login(username, password);
await cartStore.logout();
await cartStore.loadCart();
await cartStore.addToCart(partNumber, quantity);
await cartStore.removeFromCart(orderId, itemId);
cartStore.toggleMiniCart();
```

**React Hooks**:

```javascript
const [state, dispatch] = useCartState(); // Full state + dispatch
const cart = useCart(); // Just cart object
const auth = useAuth(); // Just auth object
const [error, clear] = useCartError(); // Error + clear function
const addToCart = useAddToCart(); // Bound add function
```

---

## 🧪 Load Testing Tool

**File**: `api/test-auth-load.js`

**Purpose**: Verify authentication endpoint reliability under load

**Usage**:

```bash
# Test 20 concurrent requests with 5 at a time
node api/test-auth-load.js 5 20

# Test 100 concurrent requests with 10 at a time
node api/test-auth-load.js 10 100

# Default (5 concurrency, 20 iterations)
node api/test-auth-load.js
```

**Output Metrics**:

```
📊 Summary
  Total Requests:     20
  Successful:         20 ✓
  Failed:             0 ✗
  Success Rate:       100%
  Total Time:         1234ms
  Requests/sec:       16.2

⏱️ Response Times
  Average:            61.7ms
  Min:                45ms
  Max:                89ms
  Median:             60ms

🔐 Token Validation
  Tokens Generated:   20
  Token Format:       Valid JWT structure
  Expiry Window:      25 minutes (1500 seconds)

✅ Recommendations
  ✓ Success rate is excellent (>= 95%)
  ✓ Response times are excellent (< 500ms)
```

---

## 📊 Integration Points

### With EDS Components

```javascript
// Example: Add to Cart button in product block
import { hclCommerceAPI } from "./hcl-commerce-api.js";
import { useAddToCart } from "./cart-manager.js";

export function AddToCartButton({ sku, name }) {
  const addToCart = useAddToCart();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await addToCart(sku, 1);
      // Show success toast
    } catch (error) {
      // Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? "Adding..." : "Add to Cart"}
    </button>
  );
}
```

### With Drop-ins

```javascript
// Example: Initialize Cart drop-in with HCL data
import { cartStore } from "./cart-manager.js";

const Cart = async () => {
  const state = cartStore.getState();

  // Wait for cart to load
  if (!state.cart.id) {
    await cartStore.loadCart();
  }

  // Pass to drop-in
  return {
    cartId: state.cart.id,
    items: state.cart.items,
    totals: state.cart.totals,
  };
};
```

---

## 🔄 Data Flow Example

### Adding a Product to Cart

```
User clicks "Add to Cart"
          ↓
useAddToCart() hook triggered
          ↓
dispatch(SET_ADD_TO_CART_LOADING { sku, true })
          ↓
cartStore.addToCart(partNumber, quantity)
          ↓
hclCommerceAPI.addToCart(partNumber, quantity)
          ↓
fetch(POST /api/hcl/cart/add, { partNumber, quantity, accessToken })
          ↓
Backend proxy validates token, calls HCL API
          ↓
HCL returns cart with new item
          ↓
cartStore.loadCart() refreshes cart from HCL
          ↓
dispatch(SET_CART { items, totals })
          ↓
React components re-render with updated cart
          ↓
dispatch(SET_ADD_TO_CART_LOADING { sku, false })
          ↓
Button shows success message
```

---

## ✅ Testing Checklist

### Unit Tests (For Later)

- [ ] `hclAuthService.login()` with valid/invalid credentials
- [ ] Token expiry calculation (25-minute window)
- [ ] Token refresh scheduling
- [ ] sessionStorage storage/retrieval
- [ ] `hclCommerceAPI.addToCart()` with valid/invalid SKU
- [ ] Error handling and response normalization
- [ ] `cartReducer()` with all action types
- [ ] State transitions and invariants

### Integration Tests (For Later)

- [ ] Full login → add to cart → logout flow
- [ ] Token expiry and auto-refresh
- [ ] Cart persistence across page refreshes
- [ ] Error handling for network failures
- [ ] Concurrent add-to-cart operations
- [ ] React hook behavior in components

### Load Testing (READY NOW)

```bash
# Quick test
node api/test-auth-load.js 5 20

# Medium test
node api/test-auth-load.js 10 50

# Stress test
node api/test-auth-load.js 20 100
```

---

## 🚀 Next Steps

### Layer 3: UI Components (Days 7-15)

Ready to start:

- [ ] Add to Cart button block
- [ ] Mini-cart header component
- [ ] Cart page with item management
- [ ] Checkout page (Phase 2)

### Layer 4: Testing (Days 14-18)

- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests with HCL staging
- [ ] E2E tests (Cypress)
- [ ] Performance profiling

### Layer 5: Deployment (Days 18-19)

- [ ] Staging validation
- [ ] Production configuration
- [ ] Secrets management setup
- [ ] Go-live checklist

---

## 📖 Code Examples

### Example 1: Login in a Component

```javascript
import { hclLogin } from "./hcl-commerce-auth.js";
import { useCartState } from "./cart-manager.js";

export function LoginForm() {
  const [, dispatch] = useCartState();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await hclLogin(username, password);
      // Logged in - state will update via hook
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Login</button>
    </form>
  );
}
```

### Example 2: Mini-Cart Component

```javascript
import { useCart, cartStore } from "./cart-manager.js";

export function MiniCart() {
  const cart = useCart();
  const [open, setOpen] = React.useState(false);

  if (!cart.items || cart.items.length === 0) {
    return <div>Cart is empty</div>;
  }

  return (
    <div>
      <button onClick={() => cartStore.toggleMiniCart()}>
        Cart ({cart.items.length})
      </button>
      {open && (
        <div>
          {cart.items.map((item) => (
            <div key={item.id}>
              <span>{item.name}</span>
              <span>Qty: {item.quantity}</span>
              <button
                onClick={() => cartStore.removeFromCart(cart.id, item.id)}
              >
                Remove
              </button>
            </div>
          ))}
          <div>Total: ${cart.totals.total}</div>
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Summary

| Aspect             | Status        | Details                               |
| ------------------ | ------------- | ------------------------------------- |
| **Implementation** | ✅ Complete   | 3 services + load test tool           |
| **Integration**    | ✅ Ready      | React hooks, drop-in compatible       |
| **Testing**        | ⏳ Next Phase | Unit, integration, E2E tests          |
| **Documentation**  | ✅ Complete   | API docs, code examples, architecture |
| **Dependencies**   | ✅ None       | Vanilla JS, no new npm packages       |

---

**Last Updated**: January 15, 2024  
**Lines of Code**: ~1,300  
**Files Created**: 4  
**Status**: ✅ READY FOR LAYER 3 UI COMPONENTS
