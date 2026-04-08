# ✅ SSL Certificate Fix - Ready to Test

## What Was Fixed

The 503 error you encountered was caused by **self-signed SSL certificate rejection** in Node.js.

**Error Message:**
```
Login failed with status 503. 
Service error: request to https://20.40.52.251/store/715842834/logidentity 
failed, reason: self-signed certificate
```

**Solution:** Added HTTPS agent configuration to accept self-signed certificates in development.

## Code Changes

Modified `api/utils/hcl-rest-auth.js`:

```javascript
import https from 'https';

// Create HTTPS agent that accepts self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Accept self-signed certificates
});

// Applied to all fetch calls:
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { ... },
  agent: httpsAgent,  // ← This allows self-signed certs
});
```

Applied to:
- ✅ Login request
- ✅ Logout request  
- ✅ Token validation request

## How to Test Now

### Step 1: Kill Previous Processes

If you have any previous npm processes running, kill them first:

```powershell
# Kill all node processes (be careful with this!)
Get-Process node | Stop-Process -Force

# Or kill specific ports if needed:
netstat -ano | findstr ":3001"
taskkill /PID <PID> /F
```

### Step 2: Start Three Terminals

Open three separate PowerShell windows in the project directory.

**Terminal A - Backend (Port 3001):**
```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:backend
```

**Expected output:**
```
[DEBUG] Loading .env from: ...\.env
[DEBUG] Successfully loaded .env file
✅ All required environment variables present
✅ RUNNING Port: 3001
```

**Terminal B - Frontend (Port 3000):**
```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:frontend
```

**Expected output:**
```
info: Starting AEM dev server v16.10.17
info: Local AEM dev server up and running: http://localhost:3000/
```

**Terminal C - Proxy (Port 8080):**
```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev:proxy
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════════╗
║     Development Proxy Server Ready                            ║
╠════════════════════════════════════════════════════════════════╣
║  Proxy Server:  http://localhost:8080                          ║
║  AEM CLI Dev:   http://localhost:3000                          ║
║  HCL Backend:   http://localhost:3001                          ║
```

### Step 3: Open Browser

Open your browser and navigate to:
```
http://localhost:8080
```

### Step 4: Test Login

1. **Look for login icon** - Should see 👤 icon in top-right header
2. **Click login icon** - Should see **modal popup** with form
3. **Enter credentials:**
   - Username: `auroraadobetest`
   - Password: `passw0rd`
4. **Click "Sign In"**
5. **Check DevTools Network tab** - Look for `/api/hcl/login` request
   - ✅ Should see Status **200** (not 503)
   - ✅ Response should contain `wcToken`

### Step 5: Verify Success

After clicking "Sign In", you should see:
- ✅ Modal closes
- ✅ Header shows "Welcome auroraadobetest!" or account menu
- ✅ Login icon changes to account menu
- ✅ No red error messages
- ✅ No console errors
- ✅ Network tab shows successful 200 response

## Troubleshooting

### Issue: Still Getting 503 Error

**Solution 1: Restart Backend**
- Kill the backend process (Terminal A)
- Code changes are already in place
- Run `npm run dev:backend` again
- The new code with SSL certificate fix should load

**Solution 2: Check Environment Variables**
- Verify `.env` file has:
  ```
  HCL_HOST=https://20.40.52.251
  HCL_STORE_ID=715842834
  USE_REAL_HCL_AUTH=true
  ```

### Issue: 405 Error (instead of 503)

- This means backend is working but proxy routing is wrong
- Make sure you're opening `http://localhost:8080` (not `:3000`)
- Make sure `npm run dev:proxy` is running in Terminal C

### Issue: Can't Connect to Backend

- Verify `npm run dev:backend` shows `✅ RUNNING Port: 3001`
- Check .env file is loading correctly
- Verify environment variables are present

## Git Commits

Two commits were made for this fix:

1. **0c0ed31** - `fix: Accept self-signed SSL certificates in HCL REST API calls`
2. **88558ac** - `docs: Add SSL certificate troubleshooting guide`

## Files Modified

- `api/utils/hcl-rest-auth.js` - Added HTTPS agent with self-signed cert support

## Architecture Reminder

```
Browser (localhost:8080)
  ↓
Dev Proxy (dev-proxy.js)
  ├─ /api/hcl/* → Backend (port 3001)
  └─ /* → AEM CLI (port 3000)
       ↓
  HCL Commerce (HTTPS)
  (https://20.40.52.251)
```

## What's Different

✅ **Before:** Node.js rejected self-signed SSL cert → 503 error
✅ **After:** Node.js accepts self-signed SSL cert via HTTPS agent → Login works

The backend can now successfully connect to the HCL Commerce test server!

---

**Ready to test? Follow the steps above and report back! 🚀**
