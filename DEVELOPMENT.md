# HCL Commerce Storefront Development Guide

## Overview

This project uses a three-tier architecture for local development:

```
Browser (http://localhost:8080)
    ↓
Dev Proxy (localhost:8080) [dev-proxy.js]
    ├─ /api/hcl/* → Backend (localhost:3001)
    └─ /* → AEM CLI (localhost:3000)
        ↓
    AEM CLI Dev Server (localhost:3000)
        ↓
    Remote EDS (https://main--aem-boilerplate-commerce--hlxsites.aem.page)

Backend (localhost:3001) [api/server.js]
    ↓
HCL Commerce REST API (https://20.40.52.251)
```

## Quick Start (3 Terminals Required)

### Terminal 1: Backend Server
```bash
npm run dev:backend
```
Starts HCL Commerce backend proxy on **http://localhost:3001**

**Output should show:**
```
✅ RUNNING Port: 3001
```

### Terminal 2: Frontend Dev Server
```bash
npm run dev:frontend
```
Starts AEM CLI dev server on **http://localhost:3000**

**Output should show:**
```
info: Local AEM dev server up and running: http://localhost:3000/
```

### Terminal 3: Development Proxy
```bash
npm run dev:proxy
```
Starts development proxy on **http://localhost:8080**

**Output should show:**
```
╔════════════════════════════════════════════════════════════════╗
║     Development Proxy Server Ready                            ║
╠════════════════════════════════════════════════════════════════╣
║  Proxy Server:  http://localhost:8080                          ║
║  AEM CLI Dev:   http://localhost:3000                          ║
║  HCL Backend:   http://localhost:3001                          ║
...
```

### Browser
Open **http://localhost:8080** in your browser

## Architecture Details

### Development Proxy (`dev-proxy.js`)

The development proxy solves the 405 error by:

1. **Intercepts requests** to `http://localhost:8080`
2. **Routes `/api/hcl/*`** → Backend on `localhost:3001`
3. **Routes everything else** → AEM CLI on `localhost:3000`

This prevents API requests from being proxied to the remote EDS URL.

### Backend Server (`api/server.js`)

- Listens on **port 3001**
- Endpoints:
  - `POST /api/hcl/login` - Authenticate user
  - `POST /api/hcl/logout` - Clear session
  - `GET /api/hcl/auth/diagnose` - Check auth status
  - `GET /api/hcl/cart` - Get shopping cart
  - `POST /api/hcl/cart/add` - Add item to cart
  - etc.

### Frontend Dev Server (AEM CLI)

- Runs on **port 3000**
- Serves EDS blocks and scripts
- Loads drop-in components
- Reverse-proxies to remote EDS for non-local content

### HCL Auth Adapter (`blocks/header/hclAuthAdapter.js`)

- Intercepts drop-in auth API calls
- Routes `authenticateCustomer` → `/api/hcl/login`
- Routes `revokeCustomerToken` → clears session
- Stores token in `sessionStorage`

## Testing Login

1. Ensure all 3 servers are running
2. Open **http://localhost:8080** in browser
3. Look for login icon (👤) in header
4. Click login icon to open modal popup
5. Enter credentials:
   - **Username:** `auroraadobetest`
   - **Password:** `passw0rd`
6. Click "Sign In"

**Expected behavior:**
- ✅ Modal popup shows with form
- ✅ No 405 errors in browser console
- ✅ POST request goes to `http://localhost:8080/api/hcl/login`
- ✅ Backend returns token
- ✅ Success message appears
- ✅ Redirects to account page

## Troubleshooting

### 405 Method Not Allowed Error

**Cause:** Request is going to remote EDS instead of local backend

**Solution:** Ensure dev-proxy is running on port 8080 and you're using `http://localhost:8080` in browser

**Check:**
```bash
# Terminal shows proxy requests?
npm run dev:proxy
```

### Header Missing

**Cause:** HCL adapter import failed or server not running

**Solution:** Check all 3 terminals are running successfully

### Login Modal Not Appearing

**Cause:** Drop-in auth not initialized or adapter not loaded

**Solution:** 
1. Check browser console for errors
2. Verify backend is responding: `curl http://localhost:3001/api/hcl/auth/diagnose`

### Token Not Working

**Cause:** Backend auth failed

**Solution:**
1. Check `/api/hcl/auth/diagnose` endpoint
2. Verify credentials: `auroraadobetest` / `passw0rd`
3. Check HCL connection status in terminal output

## Environment Variables

See `.env` file for HCL Commerce connection details:

```bash
USE_REAL_HCL_AUTH=false          # Use mock auth for development
HCL_HOST=https://20.40.52.251    # HCL Commerce server
HCL_STORE_ID=B2CStore             # HCL Store ID
HCL_CATALOG_ID=10001              # HCL Catalog ID
```

## Production Deployment

For production, use `npm start` which connects directly to the EDS URL without needing the local proxy.
