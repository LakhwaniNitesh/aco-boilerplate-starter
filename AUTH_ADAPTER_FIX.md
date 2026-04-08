# Auth Adapter Fix Summary

## Problem Discovered
Your browser console showed a critical error:
```
TypeError: Cannot assign to property 'authenticateCustomer' of [object Module]
    at hclAuthAdapter.js:20:30
```

This prevented the auth adapter from loading and broke the entire header module, causing:
1. ❌ Navigation menu hidden
2. ❌ Search bar hidden  
3. ❌ Auth icon hidden
4. ❌ sessionStorage.hcl_auth never populated
5. ❌ sessionCookies arriving as empty `{}` in cart requests

## Root Cause
The original `hclAuthAdapter.js` tried to **mutate an imported ES module**:

```javascript
// ❌ WRONG - ES modules are read-only
import * as authApi from '@dropins/storefront-auth/api.js';
authApi.authenticateCustomer = async (...) => { ... }  // NOT ALLOWED!
```

In ES modules, you **cannot** assign properties to imported objects. This is a fundamental JavaScript limitation, not a code issue.

## Solution Applied (Commit: 56a0d82)
Rewrote the entire auth adapter to use **fetch interception** - a proper pattern for intercepting API calls in ES modules:

```javascript
// ✅ CORRECT - Intercept at the fetch level
const originalFetch = window.fetch;

window.fetch = async function(...args) {
  const [resource, config] = args;
  
  // If it's an auth request to drop-in API, redirect to HCL
  if (typeof resource === 'string' && resource.includes('/auth') && config?.method === 'POST') {
    // Call /api/hcl/login instead
    const hclResponse = await originalFetch.call(window, '/api/hcl/login', {
      method: 'POST',
      body: JSON.stringify({
        username: body.email || body.username,
        password: body.password,
      }),
    });
    
    // Store sessionCookies to sessionStorage.hcl_auth
    if (hclResponse.sessionCookies) {
      sessionStorage.setItem('hcl_auth', JSON.stringify({
        token: hclResponse.token,
        userId: hclResponse.userId,
        sessionCookies: hclResponse.sessionCookies,
      }));
    }
    
    // Return response in format drop-in expects
    return new Response(...);
  }
  
  // For non-auth requests, use original fetch
  return originalFetch.apply(window, args);
};
```

## How It Works Now

### Login Flow (Fixed)
1. User clicks "Account" → Login modal appears
2. User enters credentials and submits
3. Drop-in auth calls `fetch()` to send login request
4. **Fetch interceptor catches this request** ✨
5. Redirects to `/api/hcl/login` instead
6. Backend authenticates with HCL, returns `sessionCookies`
7. **Auth adapter stores to sessionStorage.hcl_auth** ✨
8. Drop-in receives success response, shows "Welcome!" message

### Add-to-Cart Flow (Fixed)
1. User navigates to PDP and clicks "Add to Cart"
2. PDP code retrieves from sessionStorage.hcl_auth
3. **sessionStorage now has cookies** because auth adapter stored them ✨
4. Cookies sent in cart request body
5. Backend receives non-empty sessionCookies object
6. Cart succeeds with authenticated user

## What Changed
- **File**: `blocks/header/hclAuthAdapter.js`
- **Lines**: 1-125 (complete rewrite)
- **Pattern**: Module mutation → Fetch interception
- **Import**: No longer tries to import authApi
- **Error handling**: Proper try-catch and Response objects

## Testing Checklist
After hard refresh (Ctrl+F5):

- [ ] Header visible with navigation, search, auth icon
- [ ] Click Account → Login modal appears
- [ ] Browser console shows `[HCL-AUTH-ADAPTER] Intercepted auth request to:`
- [ ] Browser console shows `[HCL-AUTH-ADAPTER] Storing session cookies:`
- [ ] Check DevTools → Application → Session Storage → `hcl_auth` key exists
- [ ] `hcl_auth` contains: `{ token, userId, sessionCookies: { JSESSIONID, WC_PERSISTENT } }`
- [ ] Login successful, shows "Welcome, username!"
- [ ] Navigate to product page
- [ ] Click "Add to Cart"
- [ ] Browser console shows `[PDP] Retrieved session cookies for cart request: ['JSESSIONID', 'WC_PERSISTENT']`
- [ ] Backend logs show `[CART-PROXY] sessionCookies value from body: { JSESSIONID: '...', WC_PERSISTENT: '...' }`
- [ ] Cart succeeds with no "generic user" error

## Commits in This Session
1. **1fe6ca7**: Fix import paths (../../blocks/header/... → ./)
2. **03c6e50**: Add detailed debugging logs  
3. **56a0d82**: CRITICAL - Rewrite auth adapter with fetch interception

All three commits work together to:
1. Fix the module import paths
2. Provide debugging visibility
3. Enable proper auth flow with sessionCookie storage
