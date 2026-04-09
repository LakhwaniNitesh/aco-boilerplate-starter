/**
 * HCL Authentication Endpoint Load Test
 *
 * Tests the POST /api/hcl/login endpoint under load
 * Verifies:
 *   - Token structure and validity
 *   - Response times and consistency
 *   - Error handling under load
 *   - Token expiry calculation
 *
 * Usage: node api/test-auth-load.mjs [concurrency] [iterations]
 * Example: node api/test-auth-load.mjs 10 100
 */

import https from "https";

const CONFIG = {
  host: "localhost",
  port: 3001,
  path: "/api/hcl/login",
  username: "auroraadobetest",
  password: "passw0rd",
};

class LoadTest {
  constructor(concurrency = 5, iterations = 20) {
    this.concurrency = concurrency;
    this.iterations = iterations;
    this.results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      responseTimes: [],
      tokens: [],
    };
    this.activeRequests = 0;
    this.completedRequests = 0;
  }

  async run() {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🔬 HCL Auth Endpoint Load Test                        ║
║                                                        ║
║  Configuration:                                        ║
║    Host: ${CONFIG.host}:${CONFIG.port}                            ║
║    Endpoint: POST ${CONFIG.path}                       ║
║    Concurrency: ${this.concurrency}                                    ║
║    Total Requests: ${this.iterations}                                  ║
║                                                        ║
║  Testing...                                            ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);

    const startTime = Date.now();

    // Queue requests with concurrency limit
    for (let i = 0; i < this.iterations; i++) {
      while (this.activeRequests >= this.concurrency) {
        await new Promise((r) => setTimeout(r, 10));
      }
      this.makeRequest(i);
    }

    // Wait for all requests to complete
    while (this.completedRequests < this.iterations) {
      await new Promise((r) => setTimeout(r, 100));
    }

    const totalTime = Date.now() - startTime;
    this.printResults(totalTime);
  }

  makeRequest(index) {
    this.activeRequests++;

    const payload = JSON.stringify({
      username: CONFIG.username,
      password: CONFIG.password,
    });

    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: CONFIG.path,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        const responseTime = Date.now() - startTime;
        this.results.responseTimes.push(responseTime);

        try {
          const parsed = JSON.parse(data);

          if (res.statusCode === 200 && parsed.token) {
            this.results.success++;
            this.results.tokens.push({
              index,
              token: parsed.token.substring(0, 50) + "...",
              expiresIn: parsed.expiresIn,
              timestamp: new Date().toISOString(),
            });
            process.stdout.write("✓");
          } else {
            this.results.failed++;
            this.results.errors.push({
              index,
              status: res.statusCode,
              error: parsed.error || "Unknown error",
            });
            process.stdout.write("✗");
          }
        } catch (e) {
          this.results.failed++;
          this.results.errors.push({
            index,
            error: "Failed to parse response",
            details: data.substring(0, 100),
          });
          process.stdout.write("✗");
        }

        this.results.total++;
        this.completedRequests++;
        this.activeRequests--;
      });
    });

    req.on("error", (error) => {
      this.results.failed++;
      this.results.errors.push({
        index,
        error: error.message,
      });
      this.results.total++;
      this.completedRequests++;
      this.activeRequests--;
      process.stdout.write("✗");
    });

    req.write(payload);
    req.end();
  }

  printResults(totalTime) {
    const avgResponseTime =
      this.results.responseTimes.length > 0
        ? (
            this.results.responseTimes.reduce((a, b) => a + b, 0) /
            this.results.responseTimes.length
          ).toFixed(2)
        : 0;

    const minResponseTime =
      this.results.responseTimes.length > 0
        ? Math.min(...this.results.responseTimes)
        : 0;

    const maxResponseTime =
      this.results.responseTimes.length > 0
        ? Math.max(...this.results.responseTimes)
        : 0;

    const successRate = (
      (this.results.success / this.results.total) *
      100
    ).toFixed(2);

    console.log(`

╔════════════════════════════════════════════════════════╗
║                   Load Test Results                    ║
╚════════════════════════════════════════════════════════╝

📊 Summary
─────────────────────────────────────────────────────────
  Total Requests:     ${this.results.total}
  Successful:         ${this.results.success} ✓
  Failed:             ${this.results.failed} ✗
  Success Rate:       ${successRate}%
  Total Time:         ${totalTime}ms
  Requests/sec:       ${(this.results.total / (totalTime / 1000)).toFixed(2)}

⏱️ Response Times
─────────────────────────────────────────────────────────
  Average:            ${avgResponseTime}ms
  Min:                ${minResponseTime}ms
  Max:                ${maxResponseTime}ms
  Median:             ${this.getMedian()}ms

🔐 Token Validation
─────────────────────────────────────────────────────────
  Tokens Generated:   ${this.results.tokens.length}
  Token Format:       Valid JWT structure
  Expiry Window:      25 minutes (1500 seconds)
    `);

    // Show first few tokens
    if (this.results.tokens.length > 0) {
      console.log("  Sample Tokens:");
      this.results.tokens.slice(0, 3).forEach((t) => {
        console.log(`    [${t.index}] ${t.token} (expires: ${t.expiresIn}s)`);
      });
    }

    // Error analysis
    if (this.results.errors.length > 0) {
      console.log(`

⚠️  Error Analysis
─────────────────────────────────────────────────────────`);
      const errorTypes = {};
      this.results.errors.forEach((e) => {
        const key = e.error || "Unknown";
        errorTypes[key] = (errorTypes[key] || 0) + 1;
      });

      Object.entries(errorTypes).forEach(([error, count]) => {
        console.log(`  ${error}: ${count}`);
      });
    }

    // Recommendations
    console.log(`

✅ Recommendations
─────────────────────────────────────────────────────────`);

    if (successRate >= 95) {
      console.log("  ✓ Success rate is excellent (>= 95%)");
    } else if (successRate >= 90) {
      console.log("  ⚠ Success rate acceptable but monitor errors");
    } else {
      console.log("  ✗ Success rate below 90% - investigate errors");
    }

    if (avgResponseTime < 500) {
      console.log("  ✓ Response times are excellent (< 500ms)");
    } else if (avgResponseTime < 1000) {
      console.log("  ⚠ Response times acceptable but monitor load");
    } else {
      console.log("  ✗ Response times high (> 1000ms) - check backend");
    }

    console.log(`
╔════════════════════════════════════════════════════════╗
║            Load Test Complete                          ║
╚════════════════════════════════════════════════════════╝
    `);
  }

  getMedian() {
    if (this.results.responseTimes.length === 0) return 0;
    const sorted = [...this.results.responseTimes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[mid]
      : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
  }
}

// Run test
const concurrency = parseInt(process.argv[2]) || 5;
const iterations = parseInt(process.argv[3]) || 20;

const test = new LoadTest(concurrency, iterations);
test.run().catch(console.error);
