# ⚡ QUICK START - Test HCL Integration NOW

**Your Status:** Code deployed via `npm start` (aem up) → Live site

---

## 🎯 Test in 3 Steps

### **Step 1: Open Browser** (Now!)
```
https://main--aem-boilerplate-commerce--hlxsites.aem.page
```

### **Step 2: Open Console** (F12)
- Press `F12` or right-click → Inspect
- Go to "Console" tab
- Type in filter: `[HCL`
- Watch for logs

### **Step 3: Test Add-to-Cart**

**Option A: Product List**
1. Go to any product list/search page
2. Click "Add to Cart" on a product
3. Look for:
   - ✅ Green "Product added to cart!" notification
   - ✅ Mini-cart badge shows "1"
   - ✅ Console shows `[HCL` logs (no red errors)

**Option B: Product Details**
1. Click on a product to view details
2. Click "Add to Cart"
3. Look for:
   - ✅ Green notification
   - ✅ Mini-cart updates
   - ✅ No console errors

---

## 📊 What Should Happen

```
YOU                          SYSTEM
─────────────────────────────────────────────
Click "Add to Cart"
                             ├─ Create HCL session
                             ├─ Add to HCL cart
                             └─ Send success event
                             
Green notification ← ✅ Shows success
Mini-cart updates  ← ✅ Badge changes
Console logs       ← ✅ [HCL messages
No red errors      ← ✅ Everything works!
```

---

## 🔍 Console Expected Output

```javascript
[HCL PLP] Adding to cart: SKU=xxx, Qty=1
[HCL Commerce] Session valid, adding to cart...
[HCL Commerce] Successfully added to cart
```

**All good if you see these!** No red errors means working!

---

## 🚨 If Something's Wrong

| Problem | Check | Fix |
|---------|-------|-----|
| No notification | Console (F12) | Hard refresh: Ctrl+Shift+R |
| Mini-cart empty | Wait 2-3s | Refresh page |
| Red errors | Read error msg | See HCL_TESTING_GUIDE.md |
| Nothing happens | npm start terminal | Keep terminal running! |

---

## ✅ Success Signs

- [x] Notification appears
- [x] Mini-cart badge updates  
- [x] Console shows `[HCL` logs
- [x] No red errors
- [x] Can click mini-cart to see items
- [x] Can go to /cart and see items

**All checkmarks = Integration works! 🎉**

---

## 📖 Full Guide

For detailed steps and troubleshooting:
→ Read **HCL_TESTING_GUIDE.md** (in repo root)

---

**Keep `npm start` running in terminal!**

🚀 **Start testing now!**
