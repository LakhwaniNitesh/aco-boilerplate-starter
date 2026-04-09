# Agent Workflow Rules & Memory - CRITICAL

## Terminal Management (BLOCKING RULE)

### ⚠️ CRITICAL MISTAKE TO AVOID

**DO NOT** start a background process and then run status checks in the SAME terminal window.

### ❌ WRONG PATTERN (What I Was Doing)

```powershell
# Terminal 1
node api/server.js                    # ← Server starts

# SAME terminal window - THIS KILLS THE SERVER
Invoke-WebRequest http://localhost:3001/...  # ← Server shuts down!
```

### ✅ CORRECT PATTERN

**Use separate terminal windows for:**

1. **Terminal A (Background Server)**: Start `node api/server.js` and LEAVE IT RUNNING
2. **Terminal B (Test/Check)**: Run status checks, tests, diagnostics
3. **Terminal C (Git/Dev)**: Run git, npm, other development commands

### Implementation

**Step 1: Start Server in BACKGROUND Terminal (Terminal A)**

```powershell
# Terminal A - DEDICATED TO SERVER
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
node api/server.js
# ← Leave this running, DO NOT close or interrupt
```

**Step 2: Wait for Server Startup** (5-10 seconds)

**Step 3: Verify Server is Running (DIFFERENT Terminal - Terminal B)**

```powershell
# Terminal B - SEPARATE window for checks
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

# Check if server is responding
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/auth/diagnose" -UseBasicParsing
if ($response.StatusCode -eq 200) {
    Write-Host "✅ Server is running" -ForegroundColor Green
} else {
    Write-Host "❌ Server not responding" -ForegroundColor Red
}
```

**Step 4: Return to Terminal A to View Server Logs**

- Leave Terminal A running to see live logs
- Server logs show all requests and errors
- Use Terminal B for any other work

---

## Terminal Allocation Strategy

| Terminal | Purpose                 | Commands                     | Duration                           |
| -------- | ----------------------- | ---------------------------- | ---------------------------------- |
| **A**    | 🖥️ Backend Server       | `node api/server.js`         | **LEAVE RUNNING** (entire session) |
| **B**    | 🧪 Testing/Verification | Status checks, diagnostics   | Temporary                          |
| **C**    | 👨‍💻 Development          | Git, npm, file edits         | Temporary                          |
| **D**    | 📝 Frontend Dev Server  | `npm run dev` or `npm start` | **LEAVE RUNNING** (if needed)      |

**RULE:** Never run commands in the same terminal where a background process is running.

---

## Workflow for Debugging Login Issues

### Phase 1: Start Servers (DO THIS FIRST)

**Terminal A - Backend Server**

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
node api/server.js
# Wait 5-10 seconds for startup
# LEAVE THIS WINDOW OPEN
```

**Terminal D - Frontend (if needed)**

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npm run dev
# or: npm start
# LEAVE THIS WINDOW OPEN
```

### Phase 2: Verify Servers are Running (Terminal B)

Once you see startup messages in Terminal A and D, switch to Terminal B:

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

# Check backend
Write-Host "Checking backend..." -ForegroundColor Cyan
$backend = Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/auth/diagnose" -UseBasicParsing 2>$null
if ($?) {
    Write-Host "✅ Backend running on port 3001" -ForegroundColor Green
} else {
    Write-Host "❌ Backend not responding" -ForegroundColor Red
}

# Check frontend
Write-Host "Checking frontend..." -ForegroundColor Cyan
$frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing 2>$null
if ($?) {
    Write-Host "✅ Frontend running on port 3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend not responding" -ForegroundColor Red
}
```

### Phase 3: Test Login (Terminal B)

```powershell
# Test login endpoint
Write-Host "Testing login endpoint..." -ForegroundColor Cyan
$body = @{ username = "auroraadobetest"; password = "passw0rd" } | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -UseBasicParsing 2>$null

if ($response.StatusCode -eq 200) {
    $data = $response.Content | ConvertFrom-Json
    Write-Host "✅ Login endpoint responding" -ForegroundColor Green
    Write-Host "Response: " $data
} else {
    Write-Host "❌ Login failed with status $($response.StatusCode)" -ForegroundColor Red
}
```

### Phase 4: Manual Testing in Browser (Terminal B)

While servers are running in Terminal A and D:

1. Open browser to `http://localhost:3000/customer/login`
2. Open DevTools (F12)
3. Go to Network tab
4. Enter credentials: `auroraadobetest` / `passw0rd`
5. Click Sign In
6. Watch Network tab for requests
7. Check Console tab for errors
8. Check back Terminal A for server logs

### Phase 5: Code Changes (Terminal C)

If you need to make code changes:

```powershell
# Terminal C - SEPARATE from servers
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

# Edit files (or use IDE)
# After changes, commit:
git add <files>
git commit -m "fix: <description>"

# NOTE: May need to restart servers if code changed:
# 1. Switch to Terminal A
# 2. Press Ctrl+C to stop server
# 3. Run: node api/server.js (to restart)
# 4. Wait 5-10 seconds
# 5. Switch to Terminal B to test again
```

---

## Debugging Checklist

### ✅ Before Testing Login

- [ ] Backend server running in Terminal A (see startup message?)
- [ ] Frontend server running in Terminal D (if needed)
- [ ] Terminal B ready for verification commands
- [ ] Browser cleared cache (Ctrl+Shift+Delete)
- [ ] `.env` file has `USE_REAL_HCL_AUTH=true` (LIVE mode)
- [ ] VPN connected (can reach HCL VM)

### ✅ If Login Fails

**Check Server Logs (Terminal A):**

- Look for `[AUTH-CONTROLLER]` messages
- Look for `[HCL-REST-AUTH]` messages
- Look for error responses from HCL

**Check Browser Console (F12 → Console):**

- Look for `[LOGIN]` messages
- Look for fetch errors
- Look for CORS errors

**Check Network Tab (F12 → Network):**

- Find the POST to `/api/hcl/login`
- Check request headers and body
- Check response status and body
- Look for GraphQL queries (shouldn't be there for REST login)

**Verify Configuration (Terminal B):**

```powershell
# Check if LIVE mode is active
$config = Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/auth/diagnose" -UseBasicParsing | ConvertFrom-Json
Write-Host "Mode: $($config.mode)"
Write-Host "HCL_HOST: $($config.configuration.HCL_HOST)"
Write-Host "USE_REAL_HCL_AUTH: $($config.configuration.USE_REAL_HCL_AUTH)"
```

---

## Memory Rules (Agent Learning)

### 1. Terminal Separation is NOT Optional

- **ALWAYS** use separate terminals for server and tests
- Server in Terminal A, Tests in Terminal B
- Switching terminals in same window = server dies
- **This is the #1 source of repeated debugging**

### 2. Server Startup is Deterministic

- Server takes 5-10 seconds to start
- After startup, you'll see messages like:
  ```
  ✅ All required environment variables present
  ✅ RUNNING on Port: 3001
  ```
- Only then is server ready for requests

### 3. Server Logs are Gold

- Terminal A shows everything that happens
- Every request logs to Terminal A
- Every error shows in Terminal A
- **Always check Terminal A logs first when debugging**

### 4. When to Restart Server

- **DO restart after:** Code changes, `.env` changes
- **DO NOT restart:** Between status checks, between test runs
- **How to restart:** Terminal A → Ctrl+C → `node api/server.js` → wait 5-10s

### 5. Verification Flow (DO THIS EVERY TIME)

```
1. ✅ Start Server (Terminal A)
2. ⏳ Wait 5-10 seconds
3. 🧪 Verify Running (Terminal B)
4. 🔍 Check Server Logs (Terminal A)
5. 🧪 Run Tests (Terminal B)
6. 🔧 If failed: Check logs, fix code, restart
7. 🔁 Repeat 2-6 until working
```

---

## Commands to Keep Handy

### Start Backend (Terminal A)

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter" ; node api/server.js
```

### Verify Backend Running (Terminal B)

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter" ; $r = Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/auth/diagnose" -UseBasicParsing -ErrorAction SilentlyContinue ; if ($r -and $r.StatusCode -eq 200) { Write-Host "✅ Backend running" -ForegroundColor Green ; $r.Content | ConvertFrom-Json } else { Write-Host "❌ Backend not responding" -ForegroundColor Red }
```

### Test Login (Terminal B)

```powershell
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter" ; $b = @{ username="auroraadobetest"; password="passw0rd" } | ConvertTo-Json ; $r = Invoke-WebRequest -Uri "http://localhost:3001/api/hcl/login" -Method POST -Body $b -ContentType "application/json" -UseBasicParsing -ErrorAction SilentlyContinue ; if ($r) { Write-Host "✅ Login: $($r.StatusCode)" ; $r.Content | ConvertFrom-Json } else { Write-Host "❌ Login failed" }
```

### Stop All Node Processes

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force ; Write-Host "✅ All Node processes stopped"
```

---

## Summary

**The golden rule:**

- **Terminal A** = Server (leave running)
- **Terminal B** = Tests (run checks here)
- **Terminal C** = Development (git/npm/edits)
- **Never** run tests in the same terminal where server is running

This single rule will eliminate the repeated "server shutdown" issue and significantly improve debugging efficiency.
