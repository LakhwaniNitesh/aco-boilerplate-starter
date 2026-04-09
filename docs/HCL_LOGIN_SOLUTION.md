# HCL Commerce Login - Solution Summary

## Problem Statement

- ❌ Login failed with "tenant not found or not accessible" error
- ❌ Drop-in auth was using GraphQL, but HCL Commerce only supports REST API
- ❌ 405 Method Not Allowed errors when trying to POST to `/api/hcl/login`
- ❌ Login modal popup was missing after disabling GraphQL auth
- ❌ Requests were being proxied to remote EDS instead of local backend

## Root Causes Identified

1. **Competing Auth Systems**
   - Drop-in auth (@dropins/storefront-auth) uses GraphQL
   - HCL Commerce requires REST API
   - Both were trying to initialize on the same page

2. **Proxy Routing Issues**
   - AEM CLI was forwarding `/api/hcl/*` requests to remote EDS URL
   - Remote EDS doesn't have the backend endpoints
   - Resulting in 405 errors

3. **Missing Auth Adapter**
   - No translation layer between GraphQL drop-in auth and REST API

## Solution Implemented

### 1. HCL Auth Adapter (`blocks/header/hclAuthAdapter.js`)
- Intercepts drop-in auth API methods
- Routes `authenticateCustomer()` → `/api/hcl/login`
- Routes `revokeCustomerToken()` → clears session
- Stores tokens in `sessionStorage`
- Dynamic import for graceful fallback

### 2. Development Proxy Server (`dev-proxy.js`)
- Listens on port 8080
- Routes `/api/hcl/*` → Backend (port 3001)
- Routes everything else → AEM CLI (port 3000)
- Solves the 405 error by keeping local traffic local

### 3. Backend API (`api/server.js`)
- Listens on port 3001
- Endpoints:
  - `POST /api/hcl/login` - Authenticate with HCL
  - `POST /api/hcl/logout` - Clear session
  - `GET /api/hcl/auth/diagnose` - Check status

### 4. Three-Tier Architecture

```
┌─────────────────────────────────────────────────┐
│           Browser (localhost:8080)              │
│        Development Proxy Entry Point            │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    AEM CLI          Backend Server
  (port 3000)       (port 3001)
         │                │
         ▼                ▼
   Remote EDS      HCL Commerce
   (content)      (authentication)
```

## What's Been Restored

✅ **Login Modal Popup**
- Beautiful drop-in auth UI (forms, validation, success messages)
- No page redirect needed
- Same UX as before

✅ **Working Authentication**
- Posts to local backend on port 3001
- Backend connects to HCL Commerce
- Tokens stored in session
- Login/logout workflow functional

✅ **Header Navigation**
- Login icon visible in header
- Navigation menu intact
- No GraphQL errors

## Technical Stack

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| Frontend | AEM CLI + Drop-ins | 3000 | Storefront UI |
| Proxy | Node.js http-proxy | 8080 | Route traffic locally |
| Backend | Express.js | 3001 | API endpoints |
| Auth | HCL REST API | N/A | Authentication |

## Development Workflow

Run 3 terminals in parallel:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend

# Terminal 3: Proxy
npm run dev:proxy

# Browser: http://localhost:8080
```

## Git Commits

| Commit | Purpose |
|--------|---------|
| 94c7ee6 | Restore auth modal with HCL adapter |
| b2d6f8d | Remove registration endpoints (POC only) |
| 33e7593 | Use dynamic import for HCL adapter |
| dceddc9 | Add dev proxy server |
| e39473d | Add development guide |

## Testing Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Proxy running on port 8080
- [ ] Open http://localhost:8080 in browser
- [ ] See header with login icon
- [ ] Click login icon
- [ ] See modal popup with form
- [ ] Enter: auroraadobetest / passw0rd
- [ ] Click "Sign In"
- [ ] See success message
- [ ] Redirect to account page
- [ ] No 405 errors in console
- [ ] No GraphQL errors in network tab

## Future Enhancements

- [ ] Add registration endpoint for sign-up
- [ ] Implement password reset flow
- [ ] Add customer profile management
- [ ] Implement cart persistence
- [ ] Add order history view
- [ ] Multi-language support
- [ ] Mobile optimization

## Known Limitations (POC)

- Registration endpoint not implemented (login/logout only)
- Mock auth for development (real HCL needs environment config)
- No token refresh mechanism
- No offline support
- No session timeout handling

## References

- [HCL Commerce REST API](https://help.hcl-software.com/commerce/9.0.0/restapi/)
- [Adobe Drop-in Components](https://developer.adobe.com/commerce/storefront/dropins/)
- [AEM Edge Delivery Services](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/edge-delivery/overview)
