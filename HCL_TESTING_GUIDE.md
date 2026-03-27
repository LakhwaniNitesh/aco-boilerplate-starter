# HCL Commerce Integration - Testing Guide

**Date:** March 27, 2026  
**Status:** Code committed to `hcl-cart` branch  
**Dev Server:** Running with `npm start` (AEM up)  

---

## 📋 Testing Overview

You now have the integration running against the **live AEM site** with your local environment connected via `aem up`. 

Here's how to test the HCL Commerce integration:

---

## 🔧 Setup

### ✅ Already Done
- [x] Code committed to `hcl-cart` branch
- [x] `npm start` running (`aem up` connected)
- [x] All 4 components integrated
- [x] 5 modules in place

### ✅ What's Running
```
Your Local Files (hcl-cart branch)
         ↓
npm start (aem up)
         ↓
AEM Server (live site)
         ↓
Browser
```

When you visit the site, it loads your **local code changes** through AEM.

---

## 🧪 Testing Steps

### **Phase 1: Verify Server is Running** (2 minutes)

1. **Check terminal output** - Look for messages like:
   ```
   aem up --url https://main--aem-boilerplate-commerce--hlxsites.aem.page
   ```

2. **Confirm no errors** - Watch for 5-10 seconds to ensure it's stable

3. **Keep terminal running** - Don't close it during testing!

### **Phase 2: Open Browser & Navigate** (3 minutes)

1. **Open your browser**
   - Chrome, Firefox, Safari, or Edge

2. **Go to the live site**
   ```
   https://main--aem-boilerplate-commerce--hlxsites.aem.page
   ```
   
3. **Open Developer Tools** (F12)
   - Go to **Console** tab
   - Leave it open during testing
   - Look for `[HCL` logs

### **Phase 3: Test Product List Page (PLP)** (5 minutes)

**Location:** Any product listing page or search results

**What to Test:**

1. ✅ **Navigate to a product list**
   - Go to home page
   - Click on a category
   - Or search for a product

2. ✅ **Look for products displayed**
   - You should see ACO products with images
   - These come from the ACO catalog (not HCL)

3. ✅ **Find "Add to Cart" button**
   - Click it on any product
   - Watch the console (F12)

4. ✅ **Expected Console Output:**
   ```
   [HCL PLP] Adding to cart: SKU=xxx, Qty=1
   [HCL PLP] Session invalid, creating new session...
   [HCL PLP] Successfully added to HCL cart
   ```

5. ✅ **Look for Success Notification**
   - Top-right corner of screen
   - Green message saying "Product added to cart!"

6. ✅ **Check Mini-Cart Badge**
   - Header (top-right)
   - Should now show "1" item
   - May take 1-2 seconds to update

7. ✅ **Verify No Errors**
   - Console should have no red errors
   - Only `[HCL` messages

**If something doesn't work:**
- Check console for error messages
- See "Troubleshooting" section below

---

### **Phase 4: Test Product Details Page (PDP)** (5 minutes)

**Location:** Any product detail page

**What to Test:**

1. ✅ **Navigate to product details**
   - From PLP, click on a product
   - Or go to `/products/[productname]/[sku]`

2. ✅ **View product information**
   - ACO shows: name, price, images, options
   - This is from the ACO catalog

3. ✅ **Configure the product**
   - Select any options (size, color, etc.)
   - Change quantity (use + button)

4. ✅ **Click "Add to Cart" button**
   - Watch console (F12)

5. ✅ **Expected Console Output:**
   ```
   [HCL PDP] Adding to HCL cart...
   [HCL Commerce] Creating guest session...
   [HCL Commerce] Session created successfully
   [HCL Commerce] Adding item to cart...
   [HCL Commerce] Successfully added to cart
   ```

6. ✅ **Check Mini-Cart Updates**
   - Badge count should increase
   - Click mini-cart to see the item

7. ✅ **Test Update Quantity (Optional)**
   - If you see edit mode on the cart page
   - Try updating quantity and checking cart updates

---

### **Phase 5: Test Mini-Cart Display** (3 minutes)

**Location:** Header (top-right of any page)

**What to Test:**

1. ✅ **Look for mini-cart badge**
   - Shows item count (should be 1+)
   - Position: header, top-right

2. ✅ **Click on mini-cart**
   - Should expand/open
   - Display cart items list
   - Show items with:
     - Product image
     - Product name
     - Price
     - Quantity
     - Total
     - Cart subtotal

3. ✅ **Verify Items Display Correctly**
   - Should match what you added
   - Price should be visible
   - No broken images

4. ✅ **Auto-Refresh Check**
   - Wait 30 seconds
   - Mini-cart auto-refreshes HCL data
   - Watch for console logs:
     ```
     [HCL Mini-Cart] Auto-refreshing cart...
     ```

---

### **Phase 6: Test Cart Page** (5 minutes)

**Location:** `/cart` or cart link in mini-cart

**What to Test:**

1. ✅ **Navigate to Cart Page**
   - Click "View Cart" button in mini-cart
   - Or go directly to `/cart`

2. ✅ **Verify Items Display**
   - Should show all items you added
   - Each item shows:
     - Product image
     - Product name & SKU
     - Unit price
     - Quantity field
     - Total price (qty × unit price)
     - Remove button

3. ✅ **Test Quantity Update**
   - Click quantity field on an item
   - Change the number (e.g., 1 → 2)
   - Verify:
     - Total updates immediately
     - Console shows update logs
     - Mini-cart badge updates

4. ✅ **Test Item Removal**
   - Click "Remove" button on an item
   - Verify:
     - Item disappears from cart
     - Cart total recalculates
     - Mini-cart badge updates
     - Console shows removal log

5. ✅ **Check Cart Summary**
   - Should show:
     - Subtotal
     - Shipping
     - Tax
     - **Total** (bold, prominent)
   - Checkout button at bottom

6. ✅ **Test Empty Cart State**
   - Remove all items
   - Page should show "Your cart is empty"
   - "Continue Shopping" button appears

---

## 📊 Expected Results Table

```
Feature                Expected Behavior                Status
─────────────────────────────────────────────────────────────────
PLP Add to Cart        Green notification appears       ✅/❌
                       Mini-cart badge updates          ✅/❌
                       Console shows [HCL logs          ✅/❌

PDP Add to Cart        Green notification appears       ✅/❌
                       HCL session created              ✅/❌
                       Mini-cart updates                ✅/❌

Mini-Cart Display      Shows item count badge           ✅/❌
                       Shows item list when clicked     ✅/❌
                       Shows prices & totals            ✅/❌
                       Auto-refreshes every 30s         ✅/❌

Cart Page Display      Shows all cart items             ✅/❌
                       Shows product images             ✅/❌
                       Shows prices & totals            ✅/❌

Quantity Update        Input field works                ✅/❌
                       Total recalculates               ✅/❌
                       Mini-cart updates                ✅/❌

Item Removal           Remove button works              ✅/❌
                       Item disappears                  ✅/❌
                       Total updates                    ✅/❌

Cart Summary           Shows all totals                 ✅/❌
                       Math is correct                  ✅/❌
                       Checkout button visible          ✅/❌
```

---

## 🔍 Console Monitoring

### **What to Look For**

Open DevTools Console (F12) and watch for these logs:

**Good Signs (✅):**
```javascript
[HCL PLP] Adding to cart: SKU=xxx, Qty=1
[HCL Commerce] Session valid
[HCL Commerce] Successfully added to cart
[HCL Mini-Cart] Updating display...
[HCL Cart] Removing item xxx
```

**Warning Signs (⚠️):**
```javascript
[HCL *] Error: ...
Failed to fetch
403 Forbidden
CORS error
```

### **Filter Console Logs**

1. In DevTools Console
2. Type in filter box: `[HCL`
3. Only HCL logs will show
4. Easier to read!

---

## 🛠️ Troubleshooting

### **Issue: Nothing happens when clicking "Add to Cart"**

**Check:**
1. Open DevTools Console (F12)
2. Look for error messages
3. Check if `hcl-plp-integration.js` loaded
   - Network tab → Scripts → search for `hcl-plp`

**Solutions:**
- Refresh page (Ctrl+Shift+R for hard refresh)
- Check terminal for `npm start` errors
- Look for 404 errors in Network tab

---

### **Issue: Mini-cart doesn't update**

**Check:**
1. Was the success notification shown?
2. Are there errors in console?
3. Did HCL session create successfully?

**Solutions:**
- Wait 2-3 seconds (might be delayed)
- Manually refresh mini-cart (refresh page)
- Check HCL server connection (look for 403/500 errors)

---

### **Issue: Cart page shows empty**

**Check:**
1. Can you see items in mini-cart?
2. Does cart page load without errors?
3. Any console errors?

**Solutions:**
- Clear sessionStorage: Console → `sessionStorage.clear()`
- Refresh page
- Try adding item again
- Check if `/cart` URL is correct

---

### **Issue: CRLF line ending warnings**

**This is normal on Windows!** The linter sees CRLF (Windows line endings) but expects LF (Unix).

**Not blocking** - your code still works!

**To fix (optional):**
```powershell
# Convert line endings
git config core.autocrlf true
git add -A
git commit -m "chore: convert CRLF to LF"
```

---

## 📈 Testing Checklist

Print this out or use it as your testing guide:

### **Basic Functionality**
- [ ] Product list page loads
- [ ] Products display (from ACO)
- [ ] "Add to Cart" button visible
- [ ] Can click "Add to Cart"
- [ ] Success notification shows
- [ ] Mini-cart badge updates

### **Product Details**
- [ ] Product details page loads
- [ ] Product options visible
- [ ] Can change quantity
- [ ] "Add to Cart" button works
- [ ] HCL session creates (check console)

### **Mini-Cart**
- [ ] Badge shows correct count
- [ ] Can click to expand
- [ ] Items list displays
- [ ] Prices are correct
- [ ] Auto-refresh works (wait 30s)

### **Cart Page**
- [ ] Cart page loads at `/cart`
- [ ] All items display correctly
- [ ] Images load
- [ ] Prices are correct
- [ ] Totals calculate correctly
- [ ] Can update quantity
- [ ] Can remove items

### **Console Logs**
- [ ] [HCL logs appear for all actions
- [ ] No red error messages
- [ ] Session creates successfully
- [ ] API calls succeed (200 status)

### **Cross-Component**
- [ ] Add from PLP → mini-cart updates
- [ ] Add from PDP → mini-cart updates
- [ ] Update in cart → mini-cart updates
- [ ] Remove in cart → mini-cart updates

---

## 📞 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Nothing happens | Hard refresh (Ctrl+Shift+R) |
| Mini-cart empty | Wait 2-3 seconds or refresh |
| Console errors | Check error message, see troubleshooting |
| Page blank | Check `npm start` terminal for errors |
| Line ending warnings | Normal on Windows, not blocking |
| 403 Forbidden | HCL session expired, page refresh |

---

## ✅ Success Criteria

**You'll know it's working when:**

1. ✅ You can add items from PLP/PDP
2. ✅ Success notification appears
3. ✅ Mini-cart badge updates
4. ✅ Mini-cart shows items
5. ✅ Cart page displays all items
6. ✅ Can update quantities
7. ✅ Can remove items
8. ✅ Cart totals calculate correctly
9. ✅ Console shows `[HCL` logs
10. ✅ No red errors in console

---

## 🎯 Next Steps

### **If Testing Succeeds** ✅
1. Document what works
2. Take screenshots
3. Prepare for production deployment
4. Create test report

### **If Testing Fails** ❌
1. Check console logs carefully
2. Review troubleshooting section
3. Check network requests (Network tab)
4. Verify all files are in place

---

## 📸 Screenshots to Take

For documentation:
1. PLP with products
2. PLP add-to-cart notification
3. Mini-cart expanded
4. Cart page with items
5. Console logs showing [HCL operations
6. Cart totals

---

## ⏱️ Time Estimate

- Phase 1-2: 5 minutes (setup)
- Phase 3-6: 18 minutes (testing)
- Troubleshooting: 10-20 minutes (if needed)

**Total: 30-45 minutes for complete testing**

---

## 🚀 Ready?

Open your browser to:
```
https://main--aem-boilerplate-commerce--hlxsites.aem.page
```

Then follow the testing steps above!

**And keep your terminal running** with `npm start` during testing.

---

**Questions?** Check the troubleshooting section or review the HCL documentation files.

**Status:** ✅ Ready to test!
