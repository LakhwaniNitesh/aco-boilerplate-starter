# 404 Error Fix - Using Correct HCL REST API Endpoint

## Problem

You received a **404 error** with message:
```
A WebGroup/Virtual Host to handle /store/715842834/logidentity has not been defined.
```

## Root Cause

Two issues were preventing successful login:

1. **Incorrect endpoint prefix** - Code was trying `/wcs/resources/store/{id}/loginidentity` but HCL API documentation shows the endpoint should be `/store/{id}/loginidentity`

2. **Wrong request field** - Code was sending `password` field but HCL API expects `logonPassword`

## Solution Applied ✅

### Endpoint Fixed
**Before (Wrong):**
```javascript
/wcs/resources/store/{storeId}/loginidentity
```

**After (Correct):**
```javascript
/store/{storeId}/loginidentity  // Primary endpoint per HCL REST API docs
```

### Request Body Fixed
**Before (Wrong):**
```javascript
{
  "logonId": "auroraadobetest",
  "password": "passw0rd"     // ← Wrong field name
}
```

**After (Correct):**
```javascript
{
  "logonId": "auroraadobetest",
  "logonPassword": "passw0rd"  // ← Correct field name
}
```

### Endpoint Priority (Fallback Order)
1. ✅ `/store/{storeId}/loginidentity` - **Primary (per HCL API docs)**
2. `/store/{storeId}/loginidentity?responseFormat=json` - With response format
3. `/wcs/v2/store/{storeId}/customers/login` - REST API v2 format
4. `/identity/v1/customers/login` - Generic identity endpoint
5. `/rest/identity/v1/customers/login` - Old API format

## What the Code Now Does

```javascript
const requestBody = {
  logonId: username,              // User email/ID
  logonPassword: password,         // User password (HCL field name)
};

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  body: JSON.stringify(requestBody),
  agent: httpsAgent,  // For self-signed cert support
});
```

## HCL REST API Reference

Based on official HCL Commerce REST API documentation:

**Endpoint:** `POST /store/{storeId}/loginidentity`

**Request Body:**
```json
{
  "logonId": "username",
  "logonPassword": "password"
}
```

**Response (Success - 200):**
```json
{
  "wcTrustedToken": "...",
  "userId": "-1000",
  "email": "user@example.com",
  ...
}
```

**Response (Error - 401):**
```json
{
  "errors": [
    {
      "errorKey": "errors.invalid.credential"
    }
  ]
}
```

## Testing

1. **Restart backend:**
   ```powershell
   npm run dev:backend
   ```

2. **Try login again** with credentials:
   - Username: `auroraadobetest`
   - Password: `passw0rd`

3. **Check for:**
   - ✅ Status 200 (success) or 401 (bad credentials)
   - ✅ No more 404 errors
   - ✅ Response contains `wcTrustedToken` or error details

## Git Commit

```
Commit: 26fd365
fix: Use correct HCL REST API endpoint and request body format
```

## Files Modified

- `api/utils/hcl-rest-auth.js` - Corrected endpoint and request body format

## Key Learnings

- ❌ Don't assume endpoint paths - check official API documentation
- ❌ Don't assume request field names - check API request examples
- ✅ Use exact field names from API documentation (`logonPassword` not `password`)
- ✅ Try multiple endpoints for backward compatibility
- ✅ Stop retrying on 401 (credentials invalid) vs 404 (endpoint not found)

## Next Steps

The login should now work correctly:
1. Backend tries `/store/{id}/loginidentity` endpoint
2. Sends `logonId` and `logonPassword` fields
3. HCL Commerce responds with token
4. Frontend receives token and updates session

---

**Ready to test! The endpoint and request format are now aligned with HCL REST API documentation. 🚀**
