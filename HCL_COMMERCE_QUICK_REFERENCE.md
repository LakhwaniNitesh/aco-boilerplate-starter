# HCL Commerce Integration - Quick Reference Guide

**Status**: ✅ APPROVED FOR DEVELOPMENT  
**Phase**: POC Phase 1 (2-3 weeks)  
**Date**: April 5, 2026  

---

## 📚 Documentation Files

| Document | Purpose | Key Sections |
|----------|---------|--------------|
| **HCL_COMMERCE_INTEGRATION_PLAN.md** | Complete technical specification | Architecture, features, data mapping, security, testing, risks |
| **HCL_COMMERCE_POC_SUMMARY.md** | Executive summary for stakeholders | Decisions made, scope, timeline, success criteria |
| **HCL_COMMERCE_IMPLEMENTATION_ROADMAP.md** | Day-by-day development plan | Tasks, timeline, code samples, definition of done |
| **HCL_COMMERCE_QUICK_REFERENCE.md** | This file | Quick lookup, API endpoints, code snippets |

**All documents in**: `aco-boilerplate-starter/` (root directory)

---

## 🔑 Key Decisions At-a-Glance

### Authentication
```
POST https://20.40.52.251/wcs/resources/store/715842834/loginidentity?responseFormat=json
{
  "logonId": "auroraadobetest",
  "logonPassword": "passw0rd"
}
→ Response: { WCToken, WCTrustedToken }
```

### Product Mapping
```
ACO: product.sku = "CLA022_220601"
  ↓
HCL: partNumber = "CLA022_220601"
```

### Architecture
```
EDS Storefront → Backend Proxy (/api/hcl/*) → HCL Commerce API
```

### Pricing
```
Use ACO Pricing for POC
(Not HCL pricing)
```

### Checkout
```
OUT OF SCOPE - Phase 1
Placeholder button only
```

---

## 🛠️ HCL Commerce API Endpoints

### 1. Authentication
```
POST https://20.40.52.251/wcs/resources/store/715842834/loginidentity?responseFormat=json
Headers: none needed
Body: {
  "logonId": "auroraadobetest",
  "logonPassword": "passw0rd"
}
Response: {
  "WCToken": "...",
  "WCTrustedToken": "...",
  ...
}
```

### 2. Add to Cart
```
POST https://20.40.52.251/wcs/resources/store/715842834/cart?langId=1
Headers:
  WCToken: {{WCToken}}
  WCTrustedToken: {{WCTrustedToken}}
Body: {
  "orderId": ".",
  "x_calculateOrder": "0",
  "x_inventoryValidation": true,
  "orderItem": [
    {
      "quantity": "1",
      "partNumber": "CLA022_220601"
    }
  ]
}
Response: {
  "orderId": "764426",
  "orderItem": [
    {
      "orderItemId": "6560045",
      "comment": ""
    }
  ]
}
```

### 3. Get Cart
```
GET https://20.40.52.251/wcs/resources/store/715842834/cart/@self
Headers:
  WCToken: {{WCToken}}
  WCTrustedToken: {{WCTrustedToken}}
Response: {
  "orderId": "764426",
  "totalProductPrice": "85.00000",
  "totalShippingCharge": "0.00000",
  "totalSalesTax": "0.00000",
  "grandTotal": "85.00000",
  "orderItem": [
    {
      "orderItemId": "6545024",
      "partNumber": "CLA022_220601",
      "quantity": "1.0",
      "unitPrice": "45.00000",
      "orderItemPrice": "45.00000",
      ...
    }
  ]
}
```

### 4. Update Order Item (Phase 2)
```
PUT https://20.40.52.251/wcs/resources/store/715842834/cart/@self/update_order_item
Headers:
  WCToken: {{WCToken}}
  WCTrustedToken: {{WCTrustedToken}}
Body: {
  "x_isCheckout": "true",
  "x_calculateOrder": "1",
  "x_calculationUsage": "-1,-2,-3,-4,-5,-6,-7",
  "orderId": ".",
  "orderItem": [
    { "orderItemId": "6545024" }
  ]
}
```

---

## 💻 Code Structure

### Backend Proxy (Node.js)

```
api/
├── hcl-proxy.js          ← Main proxy middleware
├── hcl-auth-controller.js ← Login endpoint
└── hcl-cart-controller.js ← Cart endpoints
```

**Endpoints**:
- `POST /api/hcl/login` → HCL /loginidentity
- `POST /api/hcl/cart/add` → HCL POST /cart
- `GET /api/hcl/cart` → HCL GET /cart/@self
- `PUT /api/hcl/cart/item/:id` → HCL PUT /cart (future)
- `DELETE /api/hcl/cart/item/:id` → HCL remove (future)

### Frontend Services

```
scripts/
├── hcl-commerce-auth.js    ← Token management
├── hcl-commerce-api.js     ← API client
└── cart-manager.js         ← Redux state management
```

### Frontend Blocks

```
blocks/
├── product-list-page/      ← Add to Cart button
├── product-details/        ← Add to Cart + qty (future)
├── mini-cart/              ← Header cart widget (NEW)
└── cart-page/              ← Full cart page (NEW)
```

---

## 📊 State Management (Redux)

```javascript
// Redux store shape
{
  cart: {
    orderId: "764426",
    items: [
      {
        orderItemId: "6545024",
        partNumber: "CLA022_220601",
        quantity: 1,
        unitPrice: 45.00,
        orderItemPrice: 45.00
      }
    ],
    totals: {
      subtotal: 85.00,
      shipping: 0.00,
      tax: 0.00,
      grandTotal: 85.00
    }
  },
  loading: false,
  error: null,
  lastSync: 1712282400000
}
```

---

## 🔐 Authentication Flow

```
1. Page Load
   ↓
2. Check sessionStorage for tokens
   ├─ Found & valid? → Use existing
   └─ Not found/expired? → Call /api/hcl/login
   ↓
3. Backend calls HCL /loginidentity
   ↓
4. Receive WCToken + WCTrustedToken
   ↓
5. Store in sessionStorage
   ↓
6. User can now add to cart
   ↓
7. Before any HCL API call:
   └─ Check token age
      ├─ Age < 25 min? → Use token
      └─ Age > 25 min? → Refresh tokens

8. On 401 Response:
   ├─ Call /api/hcl/login to refresh
   └─ Retry original request
```

---

## ✨ Add to Cart Flow (UI)

```
User on PLP/PDP
    ↓
Clicks "Add to Cart"
    ↓
Frontend:
├─ Show loading spinner
├─ Call dispatch(addToCart(sku, qty))
    ↓
Redux Thunk:
├─ Ensure tokens valid
├─ POST /api/hcl/cart/add { partNumber, qty }
    ↓
Backend Proxy:
├─ Receive request
├─ Use WCToken from session
├─ Forward to HCL POST /cart
├─ Receive { orderId, orderItem }
└─ Return to client
    ↓
Frontend:
├─ Dispatch CART_ADD_ITEM_SUCCESS
├─ Update Redux state
├─ Update mini-cart badge
├─ Show toast: "Added to cart!"
└─ Hide spinner
```

---

## 📋 Testing Checklist

### Unit Tests (80%+ coverage)
- [ ] HCL Auth service (login, token refresh)
- [ ] HCL API client (add, get, errors)
- [ ] Cart reducer (add, remove, sync)
- [ ] Cart thunks (async dispatch)

### Integration Tests (HCL Staging)
- [ ] Auth → add to cart → get cart (full flow)
- [ ] Token refresh on expiration
- [ ] Error handling (404, 500, timeout)
- [ ] Inventory validation

### E2E Tests (Cypress)
- [ ] Browse products → Add to cart → Check mini-cart
- [ ] View full cart page with all items
- [ ] Cart persists on page refresh
- [ ] Checkout button (placeholder)

### Manual Testing
- [ ] Chrome, Firefox, Safari, Edge
- [ ] Mobile (iOS, Android)
- [ ] 2-3 items in cart
- [ ] Network throttling (slow 3G)

---

## 🚀 Deployment Steps

### Staging (Pre-Production)
1. Deploy backend proxy to staging
2. Deploy frontend blocks to staging
3. Test against HCL staging environment
4. Load test: 100+ add-to-cart requests/sec
5. Performance: < 500ms response time
6. Security: Credential review passed

### Production
1. Verify all tests pass
2. Deploy backend proxy
3. Deploy frontend blocks
4. Monitor error logs 24 hrs
5. Collect user feedback
6. Rollback plan: Keep old code accessible

---

## ⚙️ Configuration

### Environment Variables

```bash
# Backend
HCL_COMMERCE_HOST=https://20.40.52.251
HCL_STORE_ID=715842834
HCL_LOGIN_ID=auroraadobetest
HCL_PASSWORD=passw0rd  # Move to secrets in production
HCL_TIMEOUT=10000
HCL_RETRIES=2

# Frontend
HCL_API_BASE_URL=/api/hcl  # Relative to storefront
```

### Session Storage Keys

```javascript
sessionStorage.setItem('hcl_tokens', JSON.stringify({
  WCToken: '...',
  WCTrustedToken: '...',
  loginTime: 1712282400000
}));

sessionStorage.setItem('hcl_cart_state', JSON.stringify({
  orderId: '764426',
  items: [...],
  totals: {...}
}));
```

---

## 🐛 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Token expired | Auto-refresh in hcl-commerce-api.js |
| 404 Not Found | Product not in HCL | Show "Product unavailable" message |
| 409 Conflict | Inventory mismatch | Warn user on cart view, allow remove |
| CORS Error | Direct API call | Use backend proxy (/api/hcl/*) |
| Slow response | Network issue | Implement retry with exponential backoff |
| Cart empty on refresh | State not persisted | Use sessionStorage to cache cart |

---

## 📞 Team Contacts

| Role | Task | Owner |
|------|------|-------|
| Backend Lead | Proxy setup, HCL integration | TBD |
| Frontend Lead | UI components, state management | TBD |
| QA Lead | Testing strategy, E2E tests | TBD |
| DevOps | Deployment, monitoring | TBD |

---

## 📅 Timeline At-a-Glance

| Week | Deliverable | Status |
|------|-------------|--------|
| Week 1 | Backend proxy + auth | ⏳ Not started |
| Week 2 | Frontend services + UI | ⏳ Not started |
| Week 3 | Testing + deployment | ⏳ Not started |

**Target Launch**: End of Week 3

---

## ✅ Definition of Done (Feature Complete)

- [ ] Code written & reviewed
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests with HCL staging passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met (< 500ms)
- [ ] Security review passed
- [ ] Staging validation complete
- [ ] Production deployment successful
- [ ] Documentation updated
- [ ] Team trained on operation

---

## 🎯 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time (p95) | < 500ms | APM |
| Page Load Time | < 1s | Lighthouse |
| Availability | 99.5%+ | Monitoring |
| Error Rate | < 0.1% | Error tracking |
| Test Coverage | 80%+ | Jest/code coverage |

---

## 📚 Additional Resources

### HCL Commerce Documentation
- API Reference: https://20.40.52.251/docs (if available)
- Sample API calls: See "HCL Commerce API Endpoints" section above

### EDS/AEM Resources
- Preact + HTM: Review existing blocks in `blocks/`
- Design tokens: See `styles/`
- Redux pattern: Review existing cart implementations

### Testing Tools
- Jest: Unit tests
- Cypress: E2E tests
- Postman: API debugging
- Chrome DevTools: Performance profiling

---

## 🔗 Document Links

**Jump to specific sections**:
- [API Endpoints](#hcl-commerce-api-endpoints) - All HCL APIs
- [Code Structure](#code-structure) - File organization
- [Auth Flow](#authentication-flow) - Token management
- [Add to Cart Flow](#add-to-cart-flow-ui) - User interaction
- [Testing](#-testing-checklist) - QA approach
- [Deployment](#-deployment-steps) - Go-live plan

---

## ❓ FAQ

**Q: Do we need CORS setup on HCL?**  
A: No, we use backend proxy. HCL doesn't need to enable CORS.

**Q: What if token expires during checkout?**  
A: Auto-refresh logic handles this. User won't notice.

**Q: Can we switch to HCL pricing later?**  
A: Yes, Phase 2 enhancement. Currently using ACO pricing for simplicity.

**Q: What about guest users without HCL account?**  
A: We use provided credentials (auroraadobetest) for all users in POC. Not real guest checkout.

**Q: When is checkout implemented?**  
A: Phase 2 (not included in POC). Placeholder button in Phase 1.

**Q: How do we handle GDPR/PII?**  
A: Guest checkout doesn't require customer data. No PII stored.

---

## 🚀 Ready to Start!

All planning complete. Development can begin immediately.

**Next Step**: Kickoff meeting with dev team to assign owners and start Day 1 tasks.

---

*Last Updated: April 5, 2026*  
*Status: Ready for Development*

