# ⚡ Quick Start: Test on Localhost EDS Storefront (5 Minutes)

## 🚀 Step 1: Start Backend (1 min)

```powershell
cd 'c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter'
npm run start:proxy
```

✅ **Expected**: `Backend running on http://localhost:3001`

---

## 🌐 Step 2: Start EDS Storefront (Already Running)

Your EDS storefront should be running at:
- **URL**: `http://localhost:3000`
- **Start command**: `aem up --html-folder="./drafts/agents"`

✅ **Verify**: Open http://localhost:3000 in browser

---

## 🧪 Step 3: Test Authentication (1 min)

Open DevTools console (F12) and run:

```javascript
// Import auth service
import { HCLAuthService } from 'http://localhost:3000/scripts/hcl-auth-service.js';

// Try login
const result = await HCLAuthService.login('test@example.com', 'password123');
console.log('Auth Result:', result);

// Check if authenticated
console.log('Authenticated:', HCLAuthService.isAuthenticated());
```

✅ **Expected**: Console shows authentication status

---

## 🛒 Step 4: Test Cart (1 min)

Create a new file `drafts/agents/quick-test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Quick Cart Test</title>
    <script src="/scripts/scripts.js" type="module"></script>
</head>
<body>
    <h1>Cart Test</h1>
    <button onclick="addItem()">Add Item</button>
    <button onclick="showCart()">Show Cart</button>
    <pre id="output"></pre>

    <script type="module">
        import { CartStore } from '/scripts/cart-store.js';
        
        CartStore.subscribe((cart) => {
            document.getElementById('output').textContent = JSON.stringify(cart, null, 2);
        });
        
        window.addItem = () => {
            CartStore.addItem({
                productId: 'TEST-001',
                name: 'Test Product',
                price: 99.99,
                quantity: 1
            });
        };
        
        window.showCart = () => {
            console.log('Current Cart:', CartStore.getCart());
        };
    </script>
</body>
</html>
```

Open: `http://localhost:3000/quick-test.html`

✅ **Expected**: Click "Add Item" and see cart update in real-time

---

## 📱 Step 5: Test Components (2 min)

Create `drafts/agents/components-test.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Components Test</title>
    <link rel="stylesheet" href="/styles/styles.css">
    <script src="/scripts/scripts.js" type="module"></script>
</head>
<body>
    <h1>Components Test</h1>
    
    <!-- Test Add to Cart Button -->
    <h2>Add to Cart Button</h2>
    <div class="add-to-cart-hcl" 
         data-product-id="PROD-001"
         data-button-text="Add to Cart">
    </div>
    
    <!-- Test Mini Cart -->
    <h2>Mini Cart</h2>
    <div class="hcl-mini-cart" data-max-items="5"></div>
    
    <!-- Test Cart Page -->
    <h2>Cart Page</h2>
    <div class="hcl-cart-page"></div>
</body>
</html>
```

Open: `http://localhost:3000/components-test.html`

✅ **Expected**: All components render and respond

---

## ✅ Verification Checklist

Quick verification that everything works:

```
☐ Backend responds to http://localhost:3001/health
☐ Authentication completes without errors
☐ Cart accepts new items
☐ Cart updates in real-time
☐ Components render properly
☐ No console errors (F12)
☐ All network requests succeed (Network tab)
```

---

## 🎯 Common Endpoints to Test

### Health Check
```bash
curl http://localhost:3001/health
```

### Login (with curl)
```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'
```

### Cart Operations (with curl)
```bash
# Get cart
curl http://localhost:3001/api/hcl/cart/get

# Add to cart
curl -X POST http://localhost:3001/api/hcl/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId":"PROD-001","quantity":1}'
```

---

## 🔍 Troubleshooting Quick Fixes

### Backend Not Starting?
```powershell
# Kill any existing process on port 3001
Get-Process node | Where-Object { $_.Handles -like "*3001*" } | Stop-Process -Force

# Try again
npm run start:proxy
```

### CORS Errors?
✓ Backend is configured with CORS enabled  
✓ Make sure requests come from http://localhost:3000  
✓ Check browser console for exact error

### Components Not Loading?
✓ Verify blocks are in `blocks/` directory  
✓ Check that scripts are loaded (F12 → Network tab)  
✓ Clear browser cache: `Ctrl+Shift+Delete`

### Cart Not Persisting?
✓ Check localStorage: Open DevTools → Application → Storage  
✓ Clear it: `localStorage.clear()` in console  
✓ Reload page

---

## 📊 Run Full Test Suite

```bash
# All tests
npm test

# With coverage
npm test -- --coverage

# Watch mode (auto-rerun on file changes)
npm test -- --watch
```

---

## 📈 Load Testing

```bash
# Test with 10 concurrent users
node api/load-test.mjs 10 100
```

---

## 🎓 Full Testing Guides

For detailed testing procedures, see:
- **Complete Guide**: `LOCALHOST_TESTING_GUIDE.md` (all scenarios)
- **Deployment Info**: `DEPLOYMENT_GUIDE.md` (staging/production)
- **Component Docs**: See individual block READMEs
- **Architecture**: `HCL_PROJECT_SUMMARY.md`

---

## ✨ Success Indicators

When you see these, everything is working:

✅ Backend health check returns OK  
✅ Components render in EDS  
✅ Cart updates happen in real-time  
✅ No errors in console  
✅ Network requests succeed  
✅ Tests pass with 80%+ coverage  

---

**Status**: Ready for Local Testing! 🚀

Just follow the 5 steps above and you're ready to validate everything locally before staging/production.
