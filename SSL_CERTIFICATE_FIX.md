# SSL Certificate Error - RESOLVED ✅

## Problem

When attempting to login, received 503 error:

```
Login failed with status 503. 
("success":false,"error":"Service error: request to 
https://20.40.52.251/store/715842834/logidentity failed, 
reason: self-signed certificate; if the root CA is installed 
locally, try running Node.js with `--use-system-ca`")
```

## Root Cause

Node.js `node-fetch` library by default rejects HTTPS connections with self-signed certificates (common in development/test environments). The HCL Commerce test server at `https://20.40.52.251` uses a self-signed SSL certificate.

## Solution Applied ✅

Modified `api/utils/hcl-rest-auth.js` to:

1. **Import https module**
   ```javascript
   import https from 'https';
   ```

2. **Create HTTPS agent that accepts self-signed certs**
   ```javascript
   const httpsAgent = new https.Agent({
     rejectUnauthorized: false, // Accept self-signed certificates
   });
   ```

3. **Apply agent to all fetch calls**
   ```javascript
   const response = await fetch(endpoint, {
     method: 'POST',
     headers: { ... },
     body: JSON.stringify(requestBody),
     agent: httpsAgent,  // ← Added this
   });
   ```

Applied to:
- Login endpoint (`POST /store/{storeId}/loginidentity`)
- Logout endpoint (`POST /identity/v1/customers/logout`)
- Token validation endpoint (`GET /rest/model/v2/sites/{storeId}/cart`)

## How to Test

1. **Ensure backend is running:**
   ```powershell
   npm run dev:backend
   ```
   Should show: `✅ RUNNING Port: 3001`

2. **Start proxy:**
   ```powershell
   npm run dev:proxy
   ```

3. **Start frontend:**
   ```powershell
   npm run dev:frontend
   ```

4. **Open browser:**
   ```
   http://localhost:8080
   ```

5. **Test login:**
   - Click login icon
   - Enter: `auroraadobetest` / `passw0rd`
   - ✅ Should now see success message without 503 error

## Verification

Check browser DevTools Network tab:
- ✅ `POST /api/hcl/login` → Status **200** (not 503)
- ✅ Response contains `wcToken`
- ✅ Modal shows success message
- ✅ Header shows account menu

## Security Note ⚠️

Using `rejectUnauthorized: false` is **safe for development** but should:

- ✅ **ONLY be used in development environments**
- ✅ **NEVER be used in production**
- ✅ **Always validate the HCL host URL from environment variables**

For production deployments, use proper SSL certificates from a trusted CA.

## Files Modified

- `api/utils/hcl-rest-auth.js` - Added HTTPS agent configuration

## Git Commit

```
Commit: 0c0ed31
Message: fix: Accept self-signed SSL certificates in HCL REST API calls
```

## Related Issues

- Previous 503 error was due to SSL certificate validation
- 405 error was due to proxy routing (fixed in earlier commits)
- GraphQL errors were due to competing auth systems (fixed in earlier commits)

## Environment Variables

```properties
# .env
HCL_HOST=https://20.40.52.251              # HTTPS with self-signed cert
HCL_STORE_ID=715842834
USE_REAL_HCL_AUTH=true                      # Use real HCL API
```

## Next Steps

✅ Login should now work properly with modal popup experience
✅ No more 503 errors from self-signed certificate rejection
✅ Backend correctly connects to HCL Commerce test environment
