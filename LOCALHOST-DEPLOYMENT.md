# 🚀 LOCAL DEPLOYMENT GUIDE

## Current Status

✅ **Dev Server Status:** Running on `localhost:3000`  
✅ **Branch:** `hcl-cart`  
✅ **All Code:** Committed to git  
✅ **All Docs:** Committed to git  

---

## 🎯 What to Do Now

Your code is **already deployed locally**! The `npm start` command that's running has already picked up all your changes.

### Option 1: Verify Deployment (5 minutes)

**Open your browser and test:**

1. **Go to:** `http://localhost:3000`
2. **You should see:** Your AEM storefront homepage
3. **Check for errors:** Press F12 → Console tab → Look for red errors
4. **All good?** → Proceed to testing

---

### Option 2: Full Reload (If Something Feels Off)

**Stop and restart the dev server:**

```powershell
# Stop the current server (Ctrl+C in the terminal)
# OR run this:
Stop-Process -Name "node" -Force

# Then restart:
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm start
```

**Wait for:** 
```
✓ Done. You can view your site at: http://localhost:3000
```

---

## ✅ Deployment Checklist

After starting the server, verify:

- [ ] Browser opens to `http://localhost:3000`
- [ ] Homepage loads without errors
- [ ] No 404 errors in Network tab
- [ ] Console shows no critical red errors
- [ ] JavaScript files loaded (check Network tab → Scripts)

---

## 🔍 Verify Your Code is Deployed

### Test 1: Check Files Are Being Served

**In browser console (F12 → Console), run:**

```javascript
// Check if your HCL module is accessible
fetch('/scripts/hcl-commerce-api.js')
  .then(r => r.text())
  .then(t => {
    if (t.includes('HclSession')) {
      console.log('✅ hcl-commerce-api.js is deployed and accessible');
    } else {
      console.log('❌ File exists but seems wrong');
    }
  })
  .catch(e => console.log('❌ File not found:', e.message));
```

**Expected:** `✅ hcl-commerce-api.js is deployed and accessible`

---

### Test 2: Try Importing the Module

**In browser console, run:**

```javascript
import { HclSession, createHclGuestSession } from '/scripts/hcl-commerce-api.js';
console.log('✅ Module imported successfully');
console.log('HclSession class available:', typeof HclSession);
```

**Expected:** No error, `HclSession class available: function`

---

### Test 3: Create a Session

**In browser console, run:**

```javascript
import { createHclGuestSession } from '/scripts/hcl-commerce-api.js';
await createHclGuestSession();
```

**Expected:** `[HCL] Guest session created successfully`

---

## 📁 File Locations to Verify

These files should exist at these URLs:

| File | URL | Status |
|------|-----|--------|
| hcl-commerce-api.js | `http://localhost:3000/scripts/hcl-commerce-api.js` | Check |
| hcl-pdp-integration.js | `http://localhost:3000/scripts/hcl-pdp-integration.js` | Check |
| hcl-plp-integration.js | `http://localhost:3000/scripts/hcl-plp-integration.js` | Check |
| hcl-mini-cart-integration.js | `http://localhost:3000/scripts/hcl-mini-cart-integration.js` | Check |
| initializers/hcl-cart.js | `http://localhost:3000/scripts/initializers/hcl-cart.js` | Check |

**How to check in browser:**
1. Press F12 → Network tab
2. Refresh page (F5)
3. Filter by: `hcl-`
4. You should see all 5 files loaded

---

## 🔧 If Something Isn't Working

### Issue: Files Not Loading (404 Errors)

**Problem:** Network shows 404 for your files

**Solution:**
1. Stop server: `Ctrl+C` in terminal
2. Clear cache: Delete `.venv` and `node_modules` (if old versions)
3. Reinstall: `npm install`
4. Start fresh: `npm start`

---

### Issue: Old Cached Versions

**Problem:** Changes don't appear

**Solution in browser:**
1. Press F12
2. Right-click refresh button
3. Select "Empty cache and hard refresh"
4. Or: `Ctrl+Shift+Delete` and clear all cache

---

### Issue: CORS Errors in Console

**Problem:** Can't reach HCL API

**Expected:** You'll see this until HCL whitelists your domain
**Not a deployment issue** - it's HCL server configuration

---

## 📊 Development Server Info

### Current Server Details
- **Host:** `localhost`
- **Port:** `3000` (or `5173` as fallback)
- **Browser:** http://localhost:3000
- **Status:** Running (from your earlier `npm start`)

### What npm start Does
1. Watches file changes
2. Hot-reloads changes automatically
3. Serves static files
4. Compiles SCSS/CSS
5. Transpiles JavaScript (if needed)

---

## 🔄 Deployment Workflow

### When You Make Changes:

```
1. Edit a file (e.g., hcl-commerce-api.js)
2. Save the file
3. Dev server auto-reloads (watch mode)
4. Browser auto-refreshes or shows changes
5. No need to restart npm start
```

### To Test Your Changes:

```
1. Make changes to code
2. Press F5 in browser to refresh
3. Press F12 to open DevTools
4. Check Console for errors
5. Test functionality in console
```

---

## 📝 Deployment Steps (Summary)

### ✅ Already Done
1. ✅ Code written and committed
2. ✅ Tests created and committed
3. ✅ npm start running
4. ✅ Files being served from localhost

### 🔄 Currently Running
1. 🟢 Dev server (npm start)
2. 🟢 File watching
3. 🟢 Auto-reloading

### ⏭️ Next Steps
1. Open browser to http://localhost:3000
2. Test the functionality
3. Check console for errors
4. Use testing guides to validate

---

## 🌐 Access URLs

| Resource | URL |
|----------|-----|
| **Homepage** | http://localhost:3000 |
| **Any Page** | http://localhost:3000/path/to/page |
| **Product Detail Page** | http://localhost:3000/products/product-name |
| **JavaScript Console** | F12 → Console tab |
| **Network Inspector** | F12 → Network tab |
| **Application Storage** | F12 → Application → Storage |

---

## ✨ You're Ready!

**Your local deployment is complete and running.**

### What's Next?

1. **Open browser** → `http://localhost:3000`
2. **Open console** → F12 → Console tab
3. **Follow testing guide** → Use `QUICK-REFERENCE.md` or `TESTING-GUIDE.md`
4. **Test your integration** → Run console commands to verify

---

## 🎯 Quick Action Items

**Right Now (Next 5 minutes):**

```
1. ✅ Keep npm start running
2. ✅ Open http://localhost:3000
3. ✅ Press F12 to see console
4. ✅ Run first test command from QUICK-REFERENCE.md
```

**Then (Next 30 minutes):**

```
1. ✅ Follow TESTING-GUIDE.md phases 1-5
2. ✅ Verify all components work
3. ✅ Check for errors in console
```

---

## 📞 Troubleshooting

**Server won't start?**
```powershell
# Make sure you're in the right directory
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

# Try npm start
npm start
```

**Port already in use?**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F

# Start fresh
npm start
```

**Browser shows blank page?**
1. Press F12 → Console
2. Look for errors
3. Check Network tab for failed requests
4. Refresh page (F5)

---

## ✅ SUCCESS INDICATORS

When deployment is complete, you should see:

```
✓ Browser loads http://localhost:3000
✓ No critical red errors in console
✓ Network shows files loading (200 OK)
✓ Can import HclSession module
✓ Can create guest session
✓ Can add products to cart
```

---

**You're all set! Your changes are deployed on localhost.** 🚀

**Next:** Follow the testing guide to validate everything works!
