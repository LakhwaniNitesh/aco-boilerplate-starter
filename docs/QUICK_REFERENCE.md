# Quick Reference: WCTrustedToken Fix Checklist

## ✅ Implementation Status

- [x] Backend extracts WCTrustedToken from HCL response
- [x] Backend returns both tokens to frontend
- [x] Frontend stores trustedToken in sessionStorage
- [x] Frontend sends trustedToken with cart requests
- [x] Backend sets both tokens as separate headers
- [x] Comprehensive logging added at all steps
- [x] Documentation created

## 🚀 How to Deploy the Fix

### Quick Start (3 steps)

```bash
# 1. Stop all Node processes
Stop-Process -Name node -Force

# 2. Restart backend
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:backend

# 3. Restart frontend (in another terminal)
npm run dev:frontend
```

### What to Test

1. ✅ Login works
2. ✅ No console errors
3. ✅ Check browser console for `hasTrustedToken: true`
4. ✅ Add product to cart
5. ✅ No 401 error
6. ✅ Product appears in cart

## 📋 Files Modified

| #   | File                                     | Change                 | Status  |
| --- | ---------------------------------------- | ---------------------- | ------- |
| 1   | `api/utils/hcl-rest-auth.js`             | Extract WCTrustedToken | ✅ Done |
| 2   | `api/controllers/hcl-auth-controller.js` | Return both tokens     | ✅ Done |
| 3   | `scripts/hcl-commerce-auth.js`           | Store trustedToken     | ✅ Done |
| 4   | `scripts/hcl-commerce-api.js`            | Send trustedToken      | ✅ Done |

## 🔍 Key Logs to Watch

### Backend (Terminal)

```
✅ GOOD:  [HCL-REST-AUTH] BEFORE RETURNING: hasWcTrustedToken: true
✅ GOOD:  [AUTH-CONTROLLER] RESPONSE DATA: hasWcTrustedToken: true
✅ GOOD:  [CART-PROXY] Trusted token present: yes
✅ GOOD:  [DEBUG] WCTrustedToken header: 1007002%2CTqdJGUO0v1QZsqAwCgY...

❌ BAD:   [CART-PROXY] Trusted token present: no
❌ BAD:   CWXFR0213E: A security error...
❌ BAD:   HTTP 401
```

### Frontend (Browser Console - F12)

```
✅ GOOD:  [HCL-AUTH] RECEIVED RAW RESPONSE: hasWcTrustedToken: true
✅ GOOD:  [HCL-AUTH] STORED IN SERVICE: hasTrustedToken: true
✅ GOOD:  [HCL-API] FINAL REQUEST BODY: hasTrustedToken: true

❌ BAD:   [HCL-AUTH] Service initialized: hasTrustedToken: false
❌ BAD:   Failed to add product to cart: Internal Server Error
```

## 🎯 Success Criteria

- [ ] Login response includes both tokens
- [ ] Frontend console shows `hasTrustedToken: true` after login
- [ ] sessionStorage contains `trustedToken` field
- [ ] Cart add request includes `trustedToken` in body
- [ ] Backend cart logs show `Trusted token present: yes`
- [ ] Cart add response is 200 (not 401)
- [ ] Product appears in cart

## ⚠️ Common Issues

| Issue                                | Check                           | Fix                            |
| ------------------------------------ | ------------------------------- | ------------------------------ |
| `hasTrustedToken: false` after login | Backend returning trustedToken? | Check auth controller response |
| `Trusted token present: no` in cart  | Frontend sending trustedToken?  | Check API request body         |
| Still getting 401 error              | Are tokens DIFFERENT values?    | Check that token1 ≠ token2     |
| `CWXFR0213E` error persists          | Did you restart servers?        | Kill all node, restart fresh   |

## 📚 Documentation Files

- `NEXT_STEPS_TEST_FIX.md` - How to test the fix
- `TRUSTED_TOKEN_FIX.md` - Technical details
- `TESTING_TRUSTED_TOKEN_FIX.md` - Comprehensive test guide
- `CHANGES_SUMMARY.md` - What changed and why
- `VISUAL_GUIDE.md` - Diagrams and flow charts
- `WCTUSTED_TOKEN_IMPLEMENTATION.md` - Implementation details
- `QUICK_REFERENCE.md` - This file

## 🔧 Troubleshooting Steps

### If fix doesn't work:

1. **Verify servers restarted**

   ```bash
   Get-Process -Name node
   # Should show recent start times
   ```

2. **Check backend logs on login**
   - Look for `[HCL-REST-AUTH]` entries
   - Verify `hasWcTrustedToken: true`
   - Verify token values are DIFFERENT

3. **Check frontend after login**
   - Open DevTools Console
   - Look for `[HCL-AUTH]` entries
   - Verify `hasWcTrustedToken: true`
   - Check sessionStorage for `trustedToken`

4. **Check cart request**
   - Look for `[HCL-API]` in console
   - Verify `hasTrustedToken: true` in request
   - Check backend `[CART-PROXY]` logs

5. **Check HCL response**
   - Backend should show full HCL error
   - If not 401, look for other error messages
   - Verify cookies are being sent

## 💡 How the Fix Works

```
Problem:   WCTrustedToken not sent → 401 error
Solution:  Extract → Store → Send WCTrustedToken
Result:    HCL validates both tokens → 200 success
```

## ✨ Key Changes

### Backend

```javascript
// Extract from HCL response
const wcTrustedToken = response.WCTrustedToken;

// Return to frontend
return { wcToken, wcTrustedToken, ... }

// Set as separate headers
headers['WCToken'] = wcToken;
headers['WCTrustedToken'] = wcTrustedToken;  // DIFFERENT!
```

### Frontend

```javascript
// Store both tokens
this.trustedToken = data.wcTrustedToken;

// Send with requests
{ accessToken: token, trustedToken: trustedToken }

// Retrieve when needed
const trustedToken = hclAuthService.getTrustedToken();
```

## 🎓 What You Learned

- ✅ HCL Commerce requires TWO separate tokens
- ✅ Tokens MUST have different values
- ✅ Both tokens must flow through entire stack
- ✅ Logging helps verify each step
- ✅ Follow the "extract → store → send" pattern

## 📞 Support

If you encounter issues:

1. **Check the logs first** - they tell you where the problem is
2. **Look for `hasTrustedToken: false`** - that's where it breaks
3. **Verify token values are different** - not duplicates
4. **Check all 5 code changes** - make sure they all applied
5. **Restart servers completely** - kill all node processes first

## 🏁 Final Checklist

Before declaring "fixed":

- [ ] Servers restarted with new code
- [ ] Backend logs show `hasWcTrustedToken: true`
- [ ] Frontend logs show `hasWcTrustedToken: true`
- [ ] sessionStorage shows `trustedToken` after login
- [ ] Cart API request shows `trustedToken` in body
- [ ] Backend cart logs show `Trusted token present: yes`
- [ ] Add to cart returns 200 (success)
- [ ] Product appears in mini-cart
- [ ] NO 401 errors
- [ ] NO CWXFR0213E errors
- [ ] Everything works! ✅

---

**Status:** ✅ Implementation complete - Ready to test

See `NEXT_STEPS_TEST_FIX.md` to begin testing.
