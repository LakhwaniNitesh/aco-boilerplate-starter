# HCL Commerce Integration - POC Executive Summary

**Date**: April 5, 2026  
**Status**: ✅ **APPROVED FOR DEVELOPMENT**  
**Timeline**: 2-3 weeks (Phase 1)  

---

## 🎯 Project Overview

Integrate an **EDS (Edge Delivery Services) Storefront** with **HCL Commerce** as the commerce backend engine, while maintaining **ACO (Adobe Commerce on Cloud)** for catalog/product data.

**Use Case**: 
- Users browse products from ACO catalog on EDS Storefront
- Users add products to cart in HCL Commerce
- Cart state synchronized and displayed on EDS Storefront
- POC scope: Add to Cart, Mini-Cart, Cart Display (NO Checkout in Phase 1)

---

## ✅ Key Decisions Made

### 1. Authentication Strategy
```
POST https://20.40.52.251/wcs/resources/store/715842834/loginidentity?responseFormat=json
{
  "logonId": "auroraadobetest",
  "logonPassword": "passw0rd"
}
```
- Guest sessions NOT available in HCL Commerce
- Using provided test credentials for POC
- ⚠️ **Production**: Move credentials to backend proxy (security requirement)

### 2. Product Mapping
**ACO SKU → HCL partNumber**
```
Example: 
  ACO: product.sku = "CLA022_220601"
  HCL: partNumber = "CLA022_220601"
```
- Primary mapping: `product.sku` → `partNumber`
- Fallback: `product.id` → `productId` (not recommended)

### 3. Architecture Pattern
**Backend Proxy + Direct Client Calls**

```
┌─────────────────────────────────────┐
│    EDS Storefront (Frontend)        │
│  ├─ Cart Manager                    │
│  ├─ HCL Auth Service                │
│  └─ HCL API Client                  │
└─────────────────────────────────────┘
           │                │
           ▼                ▼
    ┌──────────────┐  ┌──────────────┐
    │ Backend      │  │   HCL        │
    │ Proxy        │◄─┤  Commerce    │
    │ (Node.js)    │  │   API        │
    └──────────────┘  └──────────────┘
```

**Why Backend Proxy?**
- ✅ Avoids CORS issues (HCL doesn't allow cross-origin)
- ✅ Centralizes authentication
- ✅ Protects credentials from exposure
- ✅ Enables rate limiting and logging
- ✅ Production-ready from day 1

### 4. Pricing Source
**Use ACO Pricing for POC**
- Catalog shows ACO prices
- Cart shows ACO prices
- HCL prices not displayed in Phase 1
- Can switch in Phase 2 if needed

### 5. Checkout Scope
**OUT of Phase 1 Scope**
- ✅ Phase 1: Add to Cart, Mini-Cart, Cart Display
- ❌ Phase 1: Checkout flow, shipping, payment
- ✅ Phase 2: Will implement full checkout with HCL

### 6. Testing Environment
**HCL Staging Available**
- Credentials: auroraadobetest / passw0rd ✅
- Host: https://20.40.52.251 ✅
- Store ID: 715842834 ✅
- Ready: Yes ✅

---

## 📋 Phase 1 Scope & Deliverables (2-3 weeks)

### Features Included
1. **Add to Cart** (PLP & PDP)
   - Browse products from ACO
   - Add to cart with qty selector
   - Real-time HCL inventory validation
   - Toast notifications (success/error)

2. **Mini-Cart in Header**
   - Item count badge
   - Subtotal display
   - Quick item preview
   - Link to full cart page

3. **Cart Page**
   - Display all items from HCL cart
   - Show pricing, quantity, line totals
   - Cart summary (subtotal, tax, shipping, grand total)
   - "Proceed to Checkout" placeholder button
   - Remove item capability (future)

4. **Authentication**
   - Automatic login with provided credentials
   - Token management & refresh
   - Session persistence across page reloads
   - Error recovery (auto re-auth on expiration)

### Features Excluded (Phase 2+)
- ❌ Checkout flow
- ❌ Customer login/registration
- ❌ Shipping address entry
- ❌ Payment processing
- ❌ Order confirmation
- ❌ Quantity updates
- ❌ Item removal
- ❌ Coupon codes
- ❌ Wishlist/saved items

---

## 🏗️ Technical Architecture

### Module Structure

```
aco-boilerplate-starter/
├── blocks/
│   ├── product-list-page/
│   │   └── product-list-page.js (Add to Cart button)
│   ├── product-details/
│   │   └── product-details.js (Add to Cart + quantity)
│   ├── mini-cart/ (NEW)
│   │   ├── mini-cart.js
│   │   └── mini-cart.css
│   └── cart-page/ (NEW)
│       ├── cart-page.js
│       ├── cart-page.css
│       ├── CartItemList.js
│       └── CartSummary.js
│
├── scripts/
│   ├── hcl-commerce-auth.js (NEW)
│   ├── hcl-commerce-api.js (NEW)
│   ├── cart-manager.js (NEW)
│   └── commerce.js (UPDATED)
│
├── api/
│   └── hcl-proxy.js (NEW - Backend proxy)
│
└── styles/
    └── hcl-cart.css (NEW)
```

### Core Services

| Service | Responsibility | Key Methods |
|---------|----------------|------------|
| **HCL Auth** | Login & token mgmt | `login()`, `refreshToken()`, `getTokens()` |
| **HCL API Client** | API calls to HCL | `addToCart()`, `getCart()`, `removeFromCart()` |
| **Cart Manager** | State management | `addItem()`, `removeItem()`, `updateQty()`, `sync()` |

### Data Flow

```
User clicks "Add to Cart"
    │
    ├─ Validate tokens (refresh if needed)
    ├─ Call POST /api/hcl/cart/add { partNumber, qty }
    │
    ├─ Backend proxy: Forward to HCL with WCToken
    ├─ HCL validates product, inventory, adds to cart
    ├─ Response: { orderId, orderItem.orderItemId }
    │
    ├─ Update cart state (Redux/Context)
    ├─ Update mini-cart badge & list
    └─ Show success notification
```

---

## 🛠️ Development Tasks (Prioritized)

### Week 1: Backend & Authentication
- [ ] Create Node.js backend proxy (`/api/hcl/*`)
- [ ] Implement HCL login endpoint (`/api/hcl/login`)
- [ ] Add cart endpoints (`/api/hcl/cart/add`, `/api/hcl/cart/get`, etc.)
- [ ] Error handling & retry logic
- [ ] Test against HCL staging

### Week 2: Frontend Core
- [ ] Create `hcl-commerce-auth.js` (client auth service)
- [ ] Create `hcl-commerce-api.js` (API client with proxy)
- [ ] Create `cart-manager.js` (state management)
- [ ] Update PLP/PDP with "Add to Cart" button
- [ ] Wire up Add to Cart flow
- [ ] Build mini-cart component
- [ ] Unit tests (70% coverage)

### Week 3: Cart Page & Polish
- [ ] Build cart page block
- [ ] Display HCL cart items, totals
- [ ] Integration tests with HCL staging
- [ ] E2E tests (full user workflows)
- [ ] Performance optimization
- [ ] Browser/mobile testing
- [ ] Documentation

---

## 📊 Success Criteria (Phase 1)

### Functional
- ✅ Users can add products to cart from PLP/PDP
- ✅ Cart displays in mini-cart (header)
- ✅ Full cart page shows all items from HCL
- ✅ Pricing and inventory validated
- ✅ No data loss on page refresh
- ✅ 0 hard errors in production (24 hrs)

### Performance
- ✅ Add to cart API response < 500ms (p95)
- ✅ Cart page load < 1 second (p95)
- ✅ Mini-cart update < 300ms
- ✅ 99.5%+ API availability

### Quality
- ✅ 80%+ test coverage (unit + E2E)
- ✅ 0 linting errors
- ✅ All error scenarios handled
- ✅ Mobile responsive & accessible

---

## 🔐 Security Considerations

### Current (POC)
- ✅ Credentials stored in environment variables
- ✅ Backend proxy handles HCL calls
- ✅ Tokens in sessionStorage (auto-cleared on browser close)
- ✅ HTTPS enforced for all API calls

### Production Readiness (Phase 2)
- ⚠️ Implement OAuth/SSO instead of hardcoded credentials
- ⚠️ Add rate limiting to prevent abuse
- ⚠️ Implement request signing/HMAC
- ⚠️ Audit logging for all cart operations
- ⚠️ Security testing (OWASP Top 10)

---

## 📅 Timeline & Milestones

| Week | Milestone | Status |
|------|-----------|--------|
| Week 1 | Backend proxy + auth ready | In Progress |
| Week 2 | Frontend integration complete | In Progress |
| Week 3 | Testing & deployment | In Progress |
| EOW3 | **Launch Phase 1** | Target |

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| HCL API changes | High | Use staging env, document API contracts, version control |
| CORS blocks requests | High | Backend proxy solves this |
| Token expiration | Medium | Auto-refresh logic, graceful retry |
| Inventory conflicts | Medium | Validate on add, warn on cart view |
| Performance issues | Medium | Cache cart, lazy load items, optimize queries |

---

## 📞 Contact & Governance

### Decision Authority
- **Requirements**: Product Manager
- **Architecture**: Lead Architect
- **Implementation**: Development Team
- **Deployment**: DevOps/Infrastructure

### Document Location
- **Technical Plan**: `HCL_COMMERCE_INTEGRATION_PLAN.md`
- **Executive Summary**: This document
- **Sprint Tasks**: Will be created in Jira/project management tool

### Questions?
Refer to the main **HCL_COMMERCE_INTEGRATION_PLAN.md** document for:
- Detailed feature requirements
- Complete architecture
- Data mapping & transformation
- Error handling strategies
- Testing approach
- Deployment procedures

---

## ✅ Sign-Off

**Status**: APPROVED FOR DEVELOPMENT

- [x] Product Manager: ✅ Approved
- [x] Architecture Lead: ✅ Validated
- [x] HCL Admin: ✅ Credentials provided
- [x] Dev Lead: ✅ Ready to start

**Ready to commence Phase 1 development immediately.**

---

*Last Updated: April 5, 2026*  
*Document Version: 1.0 (Approved)*

