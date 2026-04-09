#!/usr/bin/env node

/**
 * Cart Migration - Interactive Test Suite
 *
 * Tests all cart functionality end-to-end:
 * - Health checks
 * - Authentication
 * - Cart operations (add, get, clear)
 * - Error handling
 *
 * Usage: node api/test-cart.mjs [phase]
 * Example: node api/test-cart.mjs 1
 */

import http from "http";
import { URL } from "url";

// Configuration
const BASE_URL = "http://localhost:3001";
const TEST_USER = {
  username: "auroraadobetest",
  password: "passw0rd",
};

const TEST_PRODUCTS = [
  { partNumber: "SKU-123", name: "Test Product", price: 100, quantity: 1 },
  {
    partNumber: "SKU-456",
    name: "Premium Product",
    price: 299.99,
    quantity: 2,
  },
];

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Results tracking
let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

// Helper functions
function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  log("\n" + "=".repeat(60), "blue");
  log(`  ${title}`, "cyan");
  log("=".repeat(60), "blue");
}

function testTitle(num, title) {
  log(`\n[Test ${num}] ${title}`, "yellow");
}

function success(message) {
  log(`✓ ${message}`, "green");
  testResults.passed++;
}

function failure(message, details = "") {
  log(`✗ ${message}`, "red");
  if (details) {
    log(`  Details: ${details}`, "red");
  }
  testResults.failed++;
}

function info(message) {
  log(`ℹ ${message}`, "cyan");
}

// HTTP request helper
async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const response = JSON.parse(data || "{}");
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: response,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Test functions
async function testPhase1() {
  header("PHASE 1: Connectivity & Health Checks");

  // Test 1.1: Health endpoint
  testTitle(1, "Health Check Endpoint");
  try {
    const res = await request("GET", "/health");
    if (res.status === 200 && res.body.status === "ok") {
      success("Server is running and healthy");
      info(`Environment: ${res.body.environment}`);
      info(`Timestamp: ${res.body.timestamp}`);
    } else {
      failure("Server response unexpected", `Status: ${res.status}`);
    }
  } catch (error) {
    failure("Cannot reach server", error.message);
    info("Start server with: npm run start:proxy");
  }
}

async function testPhase2(previousToken = null) {
  header("PHASE 2: Authentication Testing");

  let accessToken = null;

  // Test 2.1: Login with valid credentials
  testTitle(2.1, "Login with Valid Credentials");
  try {
    const res = await request("POST", "/api/hcl/login", TEST_USER);

    if (res.status === 200 && res.body.success) {
      success("Login successful");
      accessToken = res.body.accessToken || res.body.token;
      info(`Token received: ${accessToken?.substring(0, 20)}...`);
      if (res.body.user) {
        info(`User: ${res.body.user.username}`);
      }
    } else if (res.status === 200 && !res.body.success) {
      failure("Login failed", res.body.error);
    } else if (res.status === 401) {
      failure("Login returned 401", JSON.stringify(res.body));
    } else {
      failure(
        "Unexpected response",
        `Status: ${res.status}, Body: ${JSON.stringify(res.body)}`,
      );
    }
  } catch (error) {
    failure("Login request failed", error.message);
  }

  // Test 2.2: Login with invalid credentials
  testTitle(2.2, "Login with Invalid Credentials (Should Fail)");
  try {
    const res = await request("POST", "/api/hcl/login", {
      username: "invalid",
      password: "wrong",
    });

    if (res.status === 200 && !res.body.success) {
      success("Correctly rejected invalid credentials");
      info(`Error message: ${res.body.error}`);
    } else if (res.status === 401) {
      success("Correctly rejected invalid credentials with 401");
    } else {
      failure("Did not reject invalid credentials", `Status: ${res.status}`);
    }
  } catch (error) {
    failure("Request failed", error.message);
  }

  return accessToken;
}

async function testPhase3(accessToken = null) {
  header("PHASE 3: Cart Operations Testing");

  // Test 3.1: Add to cart
  testTitle(3.1, "Add Product to Cart");
  try {
    const product = TEST_PRODUCTS[0];
    const payload = {
      partNumber: product.partNumber,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      accessToken: accessToken || "test-token",
    };

    const res = await request("POST", "/api/hcl/cart/add", payload);

    if (res.status === 200 && res.body.success && res.body.cart) {
      success("Product added to cart");
      info(`Cart ID: ${res.body.cart.cartId}`);
      info(`Items in cart: ${res.body.cart.items?.length || 0}`);
      info(`Cart total: $${res.body.cart.total?.toFixed(2)}`);
    } else {
      failure(
        "Add to cart failed",
        `Status: ${res.status}, Message: ${res.body.error}`,
      );
    }
  } catch (error) {
    failure("Add to cart request failed", error.message);
  }

  // Test 3.2: Get cart
  testTitle(3.2, "Get Current Cart");
  try {
    const res = await request(
      "GET",
      `/api/hcl/cart?accessToken=${encodeURIComponent(accessToken || "test-token")}`,
    );

    if (res.status === 200 && res.body.success && res.body.cart) {
      success("Cart retrieved successfully");
      info(`Cart ID: ${res.body.cart.cartId}`);
      info(`Items in cart: ${res.body.cart.items?.length || 0}`);
      if (res.body.cart.items && res.body.cart.items.length > 0) {
        res.body.cart.items.forEach((item, idx) => {
          info(
            `  [${idx + 1}] ${item.name} x${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`,
          );
        });
      }
      info(`Cart total: $${res.body.cart.total?.toFixed(2)}`);
    } else {
      failure("Get cart failed", `Status: ${res.status}`);
    }
  } catch (error) {
    failure("Get cart request failed", error.message);
  }

  // Test 3.3: Add another product
  testTitle(3.3, "Add Second Product to Cart");
  try {
    const product = TEST_PRODUCTS[1];
    const payload = {
      partNumber: product.partNumber,
      name: product.name,
      price: product.price,
      quantity: product.quantity,
      accessToken: accessToken || "test-token",
    };

    const res = await request("POST", "/api/hcl/cart/add", payload);

    if (res.status === 200 && res.body.success && res.body.cart) {
      success("Second product added to cart");
      info(`Items in cart: ${res.body.cart.items?.length || 0}`);
      info(`Cart total: $${res.body.cart.total?.toFixed(2)}`);
    } else {
      failure("Add second product failed", `Status: ${res.status}`);
    }
  } catch (error) {
    failure("Add second product failed", error.message);
  }

  // Test 3.4: Clear cart
  testTitle(3.4, "Clear Cart");
  try {
    const res = await request("DELETE", "/api/hcl/cart/clear");

    if (res.status === 200 && res.body.success && res.body.cart) {
      success("Cart cleared successfully");
      info(`Items remaining: ${res.body.cart.items?.length || 0}`);
      info(`Cart total: $${res.body.cart.total?.toFixed(2)}`);

      if (res.body.cart.items?.length === 0) {
        success("Cart is now empty");
      } else {
        failure(
          "Cart still has items",
          `Items: ${res.body.cart.items?.length}`,
        );
      }
    } else {
      failure("Clear cart failed", `Status: ${res.status}`);
    }
  } catch (error) {
    failure("Clear cart failed", error.message);
  }
}

async function testPhase4() {
  header("PHASE 4: Error Handling Testing");

  // Test 4.1: Add without required fields
  testTitle(4.1, "Add to Cart Without Required Fields (Should Fail)");
  try {
    const res = await request("POST", "/api/hcl/cart/add", {
      quantity: 1,
      // Missing: partNumber, name, price
    });

    if (res.status !== 200 || !res.body.success) {
      success("Correctly rejected invalid request");
      info(`Error: ${res.body.error}`);
    } else {
      failure("Did not validate required fields");
    }
  } catch (error) {
    failure("Request failed", error.message);
  }

  // Test 4.2: Invalid quantity
  testTitle(4.2, "Add with Invalid Quantity (Should Fail or Handle)");
  try {
    const res = await request("POST", "/api/hcl/cart/add", {
      partNumber: "SKU-123",
      name: "Test",
      price: 100,
      quantity: -1,
    });

    if (res.status !== 200 || !res.body.success) {
      success("Correctly handled invalid quantity");
      info(`Response: ${res.body.error}`);
    } else {
      info("Quantity validation may be on backend");
    }
  } catch (error) {
    info(`Request error: ${error.message}`);
  }

  // Test 4.3: Network timeout (optional)
  testTitle(4.3, "Request Timeout Handling");
  try {
    log("(This test requires network delay simulation)", "yellow");
    info("You can manually test this by:");
    info("1. Disconnect from network");
    info("2. Run a cart operation");
    info("3. Should show timeout error");
  } catch (error) {
    failure("Test setup failed", error.message);
  }
}

async function displayResults() {
  header("TEST SUMMARY");

  log(`Total Tests: ${testResults.passed + testResults.failed}`);
  log(
    `Passed: ${testResults.passed}`,
    testResults.failed === 0 ? "green" : "yellow",
  );
  log(
    `Failed: ${testResults.failed}`,
    testResults.failed === 0 ? "green" : "red",
  );

  if (testResults.failed === 0) {
    log("\n✓ All tests passed!", "green");
  } else {
    log(
      `\n✗ ${testResults.failed} test(s) failed. Review output above for details.`,
      "red",
    );
  }

  log("\nNext Steps:", "cyan");
  log("1. If all tests pass: Test frontend components", "cyan");
  log("2. Check TESTING_PLAN.md for more test scenarios", "cyan");
  log("3. Review server logs for any warnings", "cyan");
  log("4. Test authentication token management", "cyan");
}

// Main execution
async function main() {
  const phase = process.argv[2] ? parseInt(process.argv[2], 10) : 0;

  log(
    "\n╔════════════════════════════════════════════════════════════╗",
    "blue",
  );
  log("║     Cart Migration - Interactive Test Suite                ║", "blue");
  log("║     Testing HCL Commerce REST API Integration              ║", "blue");
  log("╚════════════════════════════════════════════════════════════╝", "blue");

  if (phase === 0 || phase === 1) {
    await testPhase1();
  }

  if (phase === 0 || phase === 2) {
    const token = await testPhase2();
    if (phase === 0 && token) {
      // If running all phases, use the token
      if (phase === 0 || phase === 3) {
        await testPhase3(token);
      }
    }
  } else if (phase === 3) {
    await testPhase3();
  }

  if (phase === 0 || phase === 4) {
    await testPhase4();
  }

  await displayResults();

  log("\nDocumentation: TESTING_PLAN.md", "cyan");
  log("Server: npm run start:proxy", "cyan");
}

main().catch((error) => {
  log("\nFATAL ERROR", "red");
  log(error.message, "red");
  process.exit(1);
});
