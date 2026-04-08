#!/usr/bin/env node

/**
 * HCL Commerce Diagnostic Tool
 * 
 * Tests connectivity to HCL Commerce and endpoint availability
 * Usage: node api/scripts/hcl-diagnostic.js
 */

import fetch from 'node-fetch';
import https from 'https';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../');
const envPath = join(projectRoot, '.env');

dotenv.config({ path: envPath });

// Create HTTPS agent for self-signed certs
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════╗${colors.reset}`),
  header: (msg) => console.log(`${colors.bright}${colors.blue}║ ${msg.padEnd(38)} ║${colors.reset}`),
  footer: () => console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

async function testEndpoint(url, method = 'GET', body = null) {
  try {
    const options = {
      method,
      agent: httpsAgent,
      timeout: 3000,
    };

    if (body) {
      options.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      status: null,
      ok: false,
      error: error.message,
    };
  }
}

async function main() {
  console.clear();
  
  log.title();
  log.header('HCL Commerce Diagnostic');
  log.header('Endpoint Availability Checker');
  log.footer();

  // Display configuration
  const hclHost = process.env.HCL_HOST || 'http://localhost:8080';
  const hclStoreId = process.env.HCL_STORE_ID || 'B2CStore';
  const useReal = process.env.USE_REAL_HCL_AUTH === 'true';

  console.log(`${colors.bright}Configuration:${colors.reset}`);
  console.log(`  HCL_HOST:        ${hclHost}`);
  console.log(`  HCL_STORE_ID:    ${hclStoreId}`);
  console.log(`  USE_REAL_HCL:    ${useReal ? 'YES' : 'NO'}`);
  console.log();

  if (!useReal) {
    log.warn('USE_REAL_HCL_AUTH is false - using mock authentication');
    log.warn('Set USE_REAL_HCL_AUTH=true in .env to test real HCL endpoints');
    return;
  }

  // Test connectivity
  console.log(`${colors.bright}Testing Connectivity:${colors.reset}`);

  // Try to connect to HCL host
  const hostTest = await testEndpoint(hclHost);
  if (hostTest.error) {
    log.error(`Cannot reach HCL_HOST: ${hostTest.error}`);
  } else {
    log.success(`Connected to HCL_HOST (${hostTest.statusText})`);
  }

  console.log();
  console.log(`${colors.bright}Testing Login Endpoints:${colors.reset}`);

  // Endpoints to test
  const endpoints = [
    `${hclHost}/store/${hclStoreId}/loginidentity`,
    `${hclHost}/store/${hclStoreId}/login/identity`,
    `${hclHost}/wcs/v2/store/${hclStoreId}/customers/login`,
    `${hclHost}/identity/v1/customers/login`,
    `${hclHost}/rest/identity/v1/customers/login`,
  ];

  const testPayload = {
    logonId: 'auroraadobetest',
    password: 'passw0rd',
  };

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, 'POST', testPayload);
    
    if (result.error) {
      log.error(`${endpoint} - ${result.error}`);
    } else if (result.status === 404) {
      log.error(`${endpoint} - 404 Not Found`);
    } else if (result.status === 401) {
      log.warn(`${endpoint} - 401 Unauthorized (endpoint exists but credentials invalid)`);
    } else if (result.ok) {
      log.success(`${endpoint} - ${result.status} OK ← USE THIS ENDPOINT`);
    } else {
      log.warn(`${endpoint} - ${result.status} ${result.statusText}`);
    }
  }

  console.log();
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log('✓ If you see "401 Unauthorized" = endpoint exists, credentials are wrong');
  console.log('✓ If you see "404 Not Found" = endpoint path is wrong');
  console.log('✓ If you see "OK" = endpoint works!');
  console.log('✓ If all are "Not Found" = wrong HCL_HOST or wrong STORE_ID');
  console.log();
  console.log(`${colors.bright}Next Steps:${colors.reset}`);
  console.log('1. Note which endpoint returns 401 (that\'s the correct one)');
  console.log('2. Update the endpoint order in api/utils/hcl-rest-auth.js');
  console.log('3. Restart the backend server');
  console.log('4. Try logging in again');
  console.log();
}

main().catch(console.error);
