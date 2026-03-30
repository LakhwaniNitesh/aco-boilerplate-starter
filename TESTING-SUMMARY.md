# HCL Commerce Integration - Testing Guide Summary

## 📊 Current Status Overview

| Component | Status | Location |
|-----------|--------|----------|
| **Core API Module** | ✅ Complete | `scripts/hcl-commerce-api.js` |
| **PDP Integration** | ✅ Complete | `scripts/hcl-pdp-integration.js` |
| **PLP Integration** | ✅ Complete | `scripts/hcl-plp-integration.js` |
| **Mini-Cart Integration** | ✅ Complete | `scripts/hcl-mini-cart-integration.js` |
| **Initializer** | ✅ Complete | `scripts/initializers/hcl-cart.js` |
| **Testing Guides** | ✅ Complete | `TESTING-GUIDE.md`, `TESTING-VISUAL-GUIDE.md`, `CONSOLE-COMMANDS.md` |
| **Documentation** | ✅ Complete | `HCL-INTEGRATION-GUIDE.md`, `HCL-API-QUICK-REF.md` |

---

## 🚀 Quick Start Testing (Next 30 Minutes)

### Your Current Setup
- ✅ Local dev server running: `npm start`
- ✅ Port: `localhost:3000` or `localhost:5173`
- ✅ Branch: `hcl-cart`
- ✅ All code files created and committed

### Three Testing Options (Pick One)

#### Option A: Fastest (Console Commands - 10 mins)
**Best for:** Quick validation that code works
1. Open browser → F12 → Console
2. Copy-paste commands from `CONSOLE-COMMANDS.md`
3. Watch for `[HCL]` prefixed log messages
4. See results in 10 minutes

**Start with:** [Copy-Paste from Section 1️⃣ Session Management](CONSOLE-COMMANDS.md#1️⃣-test-session-management)

---

#### Option B: Structured (Step-by-Step Guide - 30 mins)
**Best for:** Understanding the flow and catching issues
1. Follow `TESTING-GUIDE.md` phases in order
2. Phase 1: Session Management (5 mins)
3. Phase 2: Add to Cart (5 mins)
4. Phase 3: Get Cart (5 mins)
5. Phase 4: Real PDP Testing (10 mins)
6. Phase 5: Mini-Cart Testing (5 mins)

**Start with:** [Go to TESTING-GUIDE.md](TESTING-GUIDE.md)

---

#### Option C: Visual Understanding (Diagrams - 20 mins)
**Best for:** Understanding architecture before testing
1. Read `TESTING-VISUAL-GUIDE.md` diagrams
2. Understand the flow (2 mins per diagram)
3. Then follow Option B for hands-on testing

**Start with:** [Go to TESTING-VISUAL-GUIDE.md](TESTING-VISUAL-GUIDE.md)

---

## 📝 What You Need Before Testing

### Required Information
- [ ] **HCL API Endpoint:** `20.40.52.251` (confirm this is correct)
- [ ] **Store ID:** `715842834` (confirm this is correct)
- [ ] **Valid Product SKU:** Example: `CLA022_220601` (get from HCL team)
- [ ] **CORS Status:** Ask HCL team if they've whitelisted your domain yet

### Required Access
- [ ] Browser with DevTools (F12)
- [ ] Internet access to HCL endpoint
- [ ] Running local dev server (`npm start`)

### Optional But Helpful
- [ ] Postman (for API testing before browser testing)
- [ ] Screenshot tool (to capture errors)

---

## 🎯 Testing Roadmap

### Day 1: Console Testing (Today - 30 mins)
```
✅ Verify files exist
  ↓
✅ Test Session Management
  └─ Create guest session
  └─ Verify tokens stored
  ↓
✅ Test Add to Cart
  └─ Add product via console
  └─ Check response structure
  ↓
✅ Test Get Cart
  └─ Fetch cart data
  └─ Verify items and totals
  ↓
✅ Test Remove Item
  └─ Remove product
  └─ Verify cart updates
```

**Success Criteria:** All console tests show `[HCL]` logs and no errors

---

### Day 2: UI Testing (Tomorrow - 1 hour)
```
✅ Test on Real PDP
  └─ Click "Add to Cart" button
  └─ Watch for logs and success message
  ↓
✅ Test Mini-Cart Update
  └─ Add product from PDP
  └─ Mini-cart updates automatically
  ↓
✅ Test Error Scenarios
  └─ Invalid SKU handling
  └─ Session expiration recovery
```

**Success Criteria:** PDP buttons work, mini-cart updates, no critical errors

---

### Day 3: End-to-End Testing (Next 3 days - 2 hours)
```
✅ Guest Checkout Flow
  └─ Add product
  └─ View mini-cart
  └─ View full cart page
  └─ Proceed to checkout
  ↓
✅ Authenticated Flow
  └─ Login first
  └─ Add products
  └─ Cart persists on login
```

**Success Criteria:** Full workflow from PDP → Cart → Checkout works

---

## ⚠️ Potential Issues You Might Encounter

### Issue 1: CORS Error
**Error Message:**
```
Access to XMLHttpRequest at 'https://20.40.52.251/...' blocked by CORS policy
```

**Quick Fix:**
- This is expected if HCL hasn't whitelisted your domain yet
- Contact HCL team: "Please whitelist http://localhost:3000 for testing"
- For production: Whitelist your EDS domain (e.g., `https://main--repo--owner.aem.page`)

---

### Issue 2: SSL Certificate Error
**Error Message:**
```
NET::ERR_CERT_AUTHORITY_INVALID or SEC_ERROR_UNKNOWN_ISSUER
```

**Quick Fix:**
1. In browser address bar, click the warning icon
2. Click "Advanced"
3. Click "Proceed to 20.40.52.251 (unsafe)"
4. Or ask HCL team for proper staging certificate

---

### Issue 3: 403 Forbidden
**Error Message:**
```
Failed to add to cart: 403 Forbidden
```

**Quick Fix:**
```javascript
import { HclSession, createHclGuestSession } from '/scripts/hcl-commerce-api.js';
HclSession.clear();  // Clear old token
await createHclGuestSession();  // Create fresh session
// Try again
```

---

### Issue 4: Product Not Found
**Error Message:**
```
Product not found or inventory not available
```

**Quick Fix:**
- Verify the SKU/part number is correct
- Ask HCL team for valid product part numbers
- Example format: `CLA022_220601`

---

### Issue 5: Import Error
**Error Message:**
```
Failed to import module: GET /scripts/hcl-commerce-api.js 404
```

**Quick Fix:**
```javascript
// ❌ Wrong path
import { addToHclCart } from 'hcl-commerce-api.js';

// ✅ Correct path
import { addToHclCart } from '/scripts/hcl-commerce-api.js';
```

---

## 📚 Documentation Map

| Document | Purpose | When to Use |
|----------|---------|------------|
| **TESTING-GUIDE.md** | Step-by-step phases | Start here for systematic testing |
| **TESTING-VISUAL-GUIDE.md** | Architecture diagrams | Understand the flow visually |
| **CONSOLE-COMMANDS.md** | Copy-paste console commands | Quick console testing |
| **HCL-INTEGRATION-GUIDE.md** | Complete architecture reference | Deep technical understanding |
| **HCL-API-QUICK-REF.md** | API function reference | Quick lookup of available functions |
| **IMPLEMENTATION-SUMMARY.md** | What was built | Project overview |
| **TESTING-CHECKLIST.md** | Pre-flight checklist | Before full testing |

---

## 🔧 Troubleshooting Tree

```
Is the error in the console?
  │
  ├─ YES → See "Common Console Errors" below
  │
  └─ NO → Check Network tab
        │
        └─ Is HTTP status 200 OK?
           │
           ├─ YES → Data issue
           │        └─ Check response body structure
           │
           └─ NO → HTTP error
                   ├─ 403 → Token expired
                   ├─ 404 → Endpoint wrong
                   ├─ 0 (CORS) → Domain not whitelisted
                   └─ 500 → HCL server error
```

---

## 💡 Pro Tips

### Tip 1: Use Postman First (Optional)
Before browser testing, verify HCL API works with Postman:
1. Open Postman
2. Test guest session endpoint
3. Get token manually
4. Test add-to-cart with token
5. If Postman works → Issue is in browser/CORS
6. If Postman fails → Issue is HCL server

### Tip 2: Keep DevTools Open
1. Press F12 before adding to cart
2. Go to Network tab
3. Watch the request in real-time
4. Check Status, Headers, Response body

### Tip 3: Copy-Paste Commands Carefully
1. Don't include the backticks `` ` ``
2. Paste entire command block (multi-line)
3. Press Enter at the end
4. Wait for response (may take 2-3 seconds)

### Tip 4: Clear Cache Between Tests
```javascript
sessionStorage.clear();
console.log('Session cleared');
// Refresh page (F5) to clear module cache
```

### Tip 5: Save Successful Responses
```javascript
// When you get a successful response, save it
const result = await addToHclCart('CLA022_220601', 1);
copy(result);  // Copies to clipboard
// Paste into a text file for reference
```

---

## ✅ Success Indicators by Phase

### Phase 1: Session Management ✅
- [ ] `createHclGuestSession()` completes without errors
- [ ] `HclSession.hasValidSession()` returns `true`
- [ ] `HclSession.getToken()` returns a token string
- [ ] No CORS errors in console
- [ ] No SSL certificate errors

### Phase 2: Add to Cart ✅
- [ ] `addToHclCart()` returns success response
- [ ] Response includes `orderId` and `orderItemId`
- [ ] Network tab shows 200 OK status
- [ ] No 403 errors

### Phase 3: Get Cart ✅
- [ ] `getHclCart()` returns cart object
- [ ] `cart.items` is an array with added products
- [ ] `cart.cartTotals.total` shows correct amount
- [ ] Item properties include `partNumber`, `quantity`, `unitPrice`

### Phase 4: PDP Integration ✅
- [ ] Click "Add to Cart" button on actual product page
- [ ] Console shows `[HCL]` prefixed messages
- [ ] Button shows success message (optional)
- [ ] No JavaScript errors in console

### Phase 5: Mini-Cart ✅
- [ ] Mini-cart icon/button is visible
- [ ] After adding product, mini-cart updates automatically
- [ ] Shows correct item count
- [ ] Shows correct total price

---

## 🎓 Learning Resources

### Understanding the Architecture
1. Read `TESTING-VISUAL-GUIDE.md` (10 mins)
   - See data flow diagrams
   - Understand request/response cycle

2. Read `HCL-INTEGRATION-GUIDE.md` (15 mins)
   - Learn about session management
   - Understand API endpoints
   - See testing checklist

### Understanding the Code
1. Read comments in `hcl-commerce-api.js` (15 mins)
   - Each function has detailed comments
   - Shows what each line does

2. Review `HCL-API-QUICK-REF.md` (10 mins)
   - API function signatures
   - Usage examples for each function
   - Common patterns

---

## 📞 Getting Help

### If You Get Stuck

**Step 1:** Check which phase failed
- Phase 1-5 in TESTING-GUIDE.md
- Note the exact error message

**Step 2:** Check Troubleshooting section
- Look up your error type
- Try the suggested fix

**Step 3:** Check Network tab
- Click on failed request
- Check Status code
- Check Response body

**Step 4:** Check HCL Configuration
- Verify endpoint is `20.40.52.251`
- Verify store ID is `715842834`
- Ask HCL if CORS is whitelisted

**Step 5:** Report with Details
When asking for help, provide:
- Error message (exact text)
- HTTP status code (from Network tab)
- Screenshot of console
- Screenshot of network request

---

## 🎯 Next Actions (In Order)

### Right Now (5 mins)
1. ✅ Read this document (you're doing it!)
2. ✅ Open browser to `localhost:3000`
3. ✅ Press F12 to open DevTools

### In Next 30 mins
1. Choose Option A, B, or C from earlier
2. Follow the testing steps
3. Document any errors you see

### In Next 2 hours
1. Test all phases from TESTING-GUIDE.md
2. Fix any issues found
3. Verify end-to-end flow works

### In Next 24 hours
1. Add CSS styling for buttons
2. Test authenticated user flow
3. Create test report
4. Schedule stakeholder demo

---

## 📊 Testing Progress Tracker

Copy this template and fill it in as you test:

```
Testing Date: ___________
Tester: ___________

Phase 1: Session Management
  [ ] Session created: _______
  [ ] Token stored: _______
  [ ] Logs show [HCL]: _______
  [ ] No CORS errors: _______
  Notes: _______________________

Phase 2: Add to Cart
  [ ] Product added: _______
  [ ] Response has orderId: _______
  [ ] Status 200 OK: _______
  [ ] No 403 errors: _______
  Notes: _______________________

Phase 3: Get Cart
  [ ] Cart fetched: _______
  [ ] Items show correctly: _______
  [ ] Total is correct: _______
  Notes: _______________________

Phase 4: PDP Testing
  [ ] Button found: _______
  [ ] Click triggers add: _______
  [ ] Success message shown: _______
  [ ] Mini-cart updates: _______
  Notes: _______________________

Phase 5: Mini-Cart
  [ ] Mini-cart visible: _______
  [ ] Updates in real-time: _______
  [ ] Shows correct count: _______
  [ ] Shows correct total: _______
  Notes: _______________________

Overall: ________% Complete
Issues Found: _______________
Next Steps: ________________
```

---

## 🚀 Ready to Test?

**Choose your testing option:**

1. **Quick Console Test** (10 mins)
   → Open `CONSOLE-COMMANDS.md` and start with Section 1️⃣

2. **Structured Testing** (30 mins)
   → Follow `TESTING-GUIDE.md` step by step

3. **Visual First** (20 mins)
   → Read `TESTING-VISUAL-GUIDE.md` then test

---

**Good luck! You've got this! 🎉**

Report back with results and any issues you encounter.
