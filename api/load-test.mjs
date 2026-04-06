#!/usr/bin/env node

import http from 'http';

// Test configuration
const config = {
  host: 'localhost',
  port: 3001,
  path: '/api/hcl/login',
  username: 'auroraadobetest',
  password: 'passw0rd',
};

// Parse arguments
const concurrency = parseInt(process.argv[2], 10) || 5;
const iterations = parseInt(process.argv[3], 10) || 20;

// Results tracking
const results = {
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
  responseTimes: [],
  tokens: [],
};

let activeRequests = 0;
let completedRequests = 0;

// Helper: delay function
const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

// Helper: make HTTP request
async function makeRequest(index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const payload = JSON.stringify({
      username: config.username,
      password: config.password,
    });

    const options = {
      hostname: config.host,
      port: config.port,
      path: config.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        results.responseTimes.push(responseTime);

        try {
          const parsed = JSON.parse(data);

          if (res.statusCode === 200 && parsed.token) {
            results.success += 1;
            results.tokens.push({
              index,
              token: parsed.token.substring(0, 50),
            });
            process.stdout.write('.');
          } else {
            results.failed += 1;
            results.errors.push({
              index,
              status: res.statusCode,
              message: parsed.error || 'Unknown error',
            });
            process.stdout.write('E');
          }
        } catch (e) {
          results.failed += 1;
          results.errors.push({
            index,
            message: `Parse error: ${e.message}`,
          });
          process.stdout.write('F');
        }

        results.total += 1;
        completedRequests += 1;
        activeRequests -= 1;
        resolve();
      });
    });

    req.on('error', (error) => {
      results.failed += 1;
      results.errors.push({
        index,
        message: error.message,
      });
      results.total += 1;
      completedRequests += 1;
      activeRequests -= 1;
      process.stdout.write('X');
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

// Helper: calculate median
function getMedian() {
  if (results.responseTimes.length === 0) return 'N/A';
  const sorted = [...results.responseTimes].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  return median.toFixed(2);
}

// Main test runner
async function runTest() {
  const startTime = Date.now();

  // eslint-disable-next-line no-console
  console.log(`

HCL Auth Load Test
==================================================

Config:
  Host:        ${config.host}:${config.port}
  Endpoint:    POST ${config.path}
  Concurrency: ${concurrency}
  Iterations:  ${iterations}

Testing...
  `);

  // Queue requests with concurrency limit
  for (let i = 0; i < iterations; i += 1) {
    while (activeRequests >= concurrency) {
      // eslint-disable-next-line no-await-in-loop
      await delay(10);
    }

    activeRequests += 1;
    makeRequest(i);
  }

  // Wait for all requests to complete
  while (completedRequests < iterations) {
    // eslint-disable-next-line no-await-in-loop
    await delay(50);
  }

  const totalTime = Date.now() - startTime;

  // Calculate statistics
  const avgTime =
    results.responseTimes.length > 0
      ? (
          results.responseTimes.reduce((a, b) => a + b, 0) /
          results.responseTimes.length
        ).toFixed(2)
      : 'N/A';

  const minTime =
    results.responseTimes.length > 0
      ? Math.min(...results.responseTimes)
      : 'N/A';

  const maxTime =
    results.responseTimes.length > 0
      ? Math.max(...results.responseTimes)
      : 'N/A';

  const medianTime = getMedian();
  const successRate =
    results.total > 0 ? ((results.success / results.total) * 100).toFixed(2) : '0.00';
  const requestsPerSec = (results.total / (totalTime / 1000)).toFixed(2);

  // eslint-disable-next-line no-console
  console.log(`

Results
==================================================

Summary:
  Total Requests:    ${results.total}
  Successful:        ${results.success}
  Failed:            ${results.failed}
  Success Rate:      ${successRate}%
  Total Time:        ${totalTime}ms
  Requests/sec:      ${requestsPerSec}

Response Times:
  Average:           ${avgTime}ms
  Min:               ${minTime}ms
  Max:               ${maxTime}ms
  Median:            ${medianTime}ms

Token Validation:
  Tokens Generated:  ${results.tokens.length}
  Sample Token:      ${results.tokens.length > 0 ? results.tokens[0].token : 'None'}

Errors:            ${results.errors.length}
  ${
    results.errors.length > 0
      ? results.errors
          .slice(0, 3)
          .map((e) => `- [${e.index}] ${e.message}`)
          .join('\n  ')
      : 'None'
  }

Recommendations:
  ${successRate >= 95 ? 'OK' : 'WARN'} Success rate: ${successRate}%
  ${avgTime !== 'N/A' && parseFloat(avgTime) < 500 ? 'OK' : 'WARN'} Avg response: ${avgTime}ms

==================================================
Load test complete!
  `);
}

// Run
runTest().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Test failed:', error.message);
  process.exit(1);
});
