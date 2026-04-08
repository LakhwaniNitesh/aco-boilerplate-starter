# Server Startup Guide

## The Issue
The dev servers are failing to start because:
1. AEM frontend is trying to reach external URL: `https://main--aem-boilerplate-commerce--hlxsites.aem.page`
2. This requires network access and proper HLX setup
3. For local development, you should use the local HTML folder instead

## Solution: Use Local Development Mode

### Terminal 1: Backend API Server
```bash
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
node api/server.js
```
This starts the HCL backend proxy on `http://localhost:3001`

### Terminal 2: AEM Frontend Server (Local Mode)
```bash
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
npx aem up --html-folder="./drafts/agents"
```
This starts the AEM dev server in local mode on `http://localhost:3000`

### Terminal 3: Development Proxy
```bash
cd "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"
node dev-proxy.js
```
This starts the proxy server on `http://localhost:8080` that routes requests to AEM and backend

## Expected Output

**Backend Server Should Show:**
```
[INFO] HCL Backend API Server listening on http://localhost:3001
```

**AEM Server Should Show:**
```
info: Starting AEM dev server v16.10.17
info: Local AEM dev server up and running: http://localhost:3000/
info: Enabled reverse proxy to https://main--aem-boilerplate-commerce--hlxsites.aem.page
info: opening default browser: http://localhost:3000/
```

**Proxy Server Should Show:**
```
Development Proxy Server Ready

Proxy Server: http://localhost:8080
AEM CLI Dev: http://localhost:3000
HCL Backend: http://localhost:3001

Routes:
• /api/hcl/* -> Backend (http://localhost:3001)
• /* -> AEM CLI (http://localhost:3000)

Open browser to: http://localhost:8080
```

## Access the Application

Once all three servers are running, open your browser to:
```
http://localhost:8080
```

This will:
1. Route static content and pages through the proxy
2. Serve AEM pages from the local dev server
3. Route `/api/hcl/*` requests to the backend API

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
```

Then restart the servers.

### AEM Server Fails to Start
Make sure you're using the correct command with `--html-folder`:
```
❌ WRONG: aem up --url https://main--aem-boilerplate-commerce--hlxsites.aem.page
✅ CORRECT: npx aem up --html-folder="./drafts/agents"
```

### Browser Shows 404
1. Wait for all three servers to fully start (watch terminal output)
2. Hard refresh browser (Ctrl+F5)
3. Check that all three servers are running on correct ports

## Using npm Scripts

Alternatively, if you have npm scripts set up for local development:
```bash
npm run dev:backend      # Terminal 1
npm run dev:frontend     # Terminal 2 (if it has local HTML folder config)
npm run dev:proxy        # Terminal 3
```

But manually running the commands above is more reliable for troubleshooting.
