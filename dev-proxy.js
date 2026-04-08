/**
 * Development Proxy Server for AEM Edge Delivery Services
 * 
 * This server acts as a middleware between the AEM CLI dev server and the backend
 * It intercepts /api/hcl/* requests and forwards them to localhost:3001
 * All other traffic goes through to the AEM CLI on port 3000
 */

import http from 'http';
import httpProxy from 'http-proxy';

const HCL_BACKEND_URL = 'http://localhost:3001';
const AEM_CLI_URL = 'http://localhost:3000';
const PROXY_PORT = 8080;

// Create proxy instances
const hclProxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
});

const aemProxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ws: true,
});

// Error handling for HCL proxy
hclProxy.on('error', (err, req, res) => {
  console.error('[HCL-PROXY] Error:', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Bad Gateway - HCL backend unavailable' }));
});

// Error handling for AEM proxy
aemProxy.on('error', (err, req, res) => {
  console.error('[AEM-PROXY] Error:', err.message);
  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Bad Gateway - AEM dev server unavailable' }));
});

// Create the proxy server
const proxyServer = http.createServer((req, res) => {
  console.log(`[PROXY] ${req.method} ${req.url}`);

  // Route HCL API calls to backend
  if (req.url.startsWith('/api/hcl')) {
    console.log(`[PROXY] → HCL Backend (${HCL_BACKEND_URL})`);
    hclProxy.web(req, res, { target: HCL_BACKEND_URL });
  }
  // Route everything else to AEM CLI
  else {
    console.log(`[PROXY] → AEM CLI (${AEM_CLI_URL})`);
    aemProxy.web(req, res, { target: AEM_CLI_URL });
  }
});

// Handle WebSocket upgrade events
proxyServer.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/api/hcl')) {
    hclProxy.ws(req, socket, head, { target: HCL_BACKEND_URL });
  } else {
    aemProxy.ws(req, socket, head, { target: AEM_CLI_URL });
  }
});

proxyServer.listen(PROXY_PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Development Proxy Server Ready                            ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Proxy Server:  http://localhost:${PROXY_PORT}                     ║
║  AEM CLI Dev:   ${AEM_CLI_URL}                                  ║
║  HCL Backend:   ${HCL_BACKEND_URL}                                ║
║                                                                ║
║  Routes:                                                       ║
║  • /api/hcl/*  → Backend (${HCL_BACKEND_URL})             ║
║  • /*          → AEM CLI (${AEM_CLI_URL})                   ║
║                                                                ║
║  Open browser to: http://localhost:${PROXY_PORT}                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
