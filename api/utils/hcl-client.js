/**
 * HCL Commerce API Client
 * Handles all HTTP communication with HCL Commerce backend
 */

import https from "https";

const agent = new https.Agent({
  rejectUnauthorized: false, // Only for staging - DO NOT use in production
});

class HCLClient {
  constructor() {
    // IMPORTANT: Do NOT read environment variables in constructor
    // They will not be loaded yet when the module is imported
    // Initialize will be called from server.js AFTER dotenv.config()
    this.host = null;
    this.storeId = null;
    this.baseUrl = null;
    this.accessToken = null; // WCToken
    this.trustedToken = null; // WCTrustedToken - DIFFERENT from WCToken
    this.tokenExpiry = null;
    this.sessionCookies = {}; // Store session cookies (JSESSIONID, WC_PERSISTENT, etc)
  }

  /**
   * Initialize client with environment variables
   * MUST be called after dotenv.config() in server.js
   */
  initialize() {
    this.host = process.env.HCL_HOST;
    this.storeId = process.env.HCL_STORE_ID;
    this.baseUrl = `${this.host}/wcs/resources/store/${this.storeId}`;

    if (!this.host || !this.storeId) {
      console.error("[ERROR] HCL_HOST or HCL_STORE_ID not set in environment");
      throw new Error(
        "Missing required environment variables: HCL_HOST and HCL_STORE_ID",
      );
    }

    console.log(`[INFO] HCL Client initialized: ${this.baseUrl}`);
  }

  /**
   * Make HTTPS request to HCL API
   */
  async request(
    method,
    path,
    body = null,
    accessToken = null,
    trustedToken = null,
  ) {
    return new Promise((resolve, reject) => {
      const url = new URL(path.startsWith("http") ? path : this.baseUrl + path);

      // WCToken and WCTrustedToken should be sent as SEPARATE HEADERS, NOT in Cookie
      // They should remain URL-encoded (Postman shows them URL-encoded in the WCToken header)
      const wcToken = accessToken; // Keep URL-encoded as received from frontend
      const wcTrustedToken = trustedToken; // DIFFERENT token - keep URL-encoded

      // Build only session cookies for the Cookie header
      // CRITICAL: Send cookies AS-IS (URL-encoded) - do NOT decode!
      // HCL expects the WC_PERSISTENT cookie to remain URL-encoded (with %3D, %3B, etc.)
      const sessionCookieString = Object.entries(this.sessionCookies)
        .map(([key, value]) => {
          // Send the cookie value as-is without decoding
          // HCL needs it to stay URL-encoded
          return `${key}=${value}`;
        })
        .join("; ");

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Host: url.hostname,
      };

      // Add WCToken and WCTrustedToken as SEPARATE HEADERS (URL-encoded, as Postman shows)
      if (wcToken) {
        headers["WCToken"] = wcToken;
      }

      // CRITICAL: WCTrustedToken is a DIFFERENT token from WCToken
      // It comes from the login response and must be sent separately
      if (wcTrustedToken) {
        headers["WCTrustedToken"] = wcTrustedToken;
      }

      // Add session cookies to Cookie header (decoded)
      if (sessionCookieString) {
        headers["Cookie"] = sessionCookieString;
      }

      const options = {
        method,
        headers,
        agent,
      };

      console.log(`[DEBUG] ${method} ${url.toString()}`);
      console.log(`[DEBUG] Auth headers being sent:`);
      if (wcToken) {
        console.log(
          `[DEBUG]   WCToken: ${wcToken.substring(0, 40)}... (URL-encoded)`,
        );
      }
      if (wcTrustedToken) {
        console.log(
          `[DEBUG]   WCTrustedToken: ${wcTrustedToken.substring(0, 40)}... (URL-encoded)`,
        );
      }
      if (sessionCookieString) {
        console.log(
          `[DEBUG]   Cookie: ${sessionCookieString.substring(0, 80)}... (URL-encoded)`,
        );
      }

      if (wcToken) {
        console.log(`[DEBUG] ╔════════════════════════════════════════`);
        console.log(`[DEBUG] ║ TOKEN BEING SENT (AS HEADERS, URL-ENCODED)`);
        console.log(`[DEBUG] ║ WCToken header: ${wcToken.substring(0, 50)}...`);
        console.log(`[DEBUG] ║ First 30 chars: ${wcToken.substring(0, 30)}`);
        console.log(`[DEBUG] ║ Last 30 chars: ${wcToken.slice(-30)}`);
        console.log(`[DEBUG] ║ Length: ${wcToken.length} chars`);
        console.log(
          `[DEBUG] ║ Contains user ID (1007002): ${wcToken.includes("1007002")}`,
        );
        console.log(`[DEBUG] ║ Is URL-encoded: ${wcToken.includes("%")}`);
        console.log(`[DEBUG] ╚════════════════════════════════════════`);
      }

      if (wcTrustedToken) {
        console.log(`[DEBUG] ╔════════════════════════════════════════`);
        console.log(`[DEBUG] ║ TRUSTED TOKEN BEING SENT (SEPARATE HEADER)`);
        console.log(
          `[DEBUG] ║ WCTrustedToken: ${wcTrustedToken.substring(0, 50)}...`,
        );
        console.log(`[DEBUG] ║ Length: ${wcTrustedToken.length} chars`);
        console.log(
          `[DEBUG] ║ Contains user ID (1007002): ${wcTrustedToken.includes("1007002")}`,
        );
        console.log(
          `[DEBUG] ║ Is URL-encoded: ${wcTrustedToken.includes("%")}`,
        );
        console.log(`[DEBUG] ╚════════════════════════════════════════`);
      }

      if (sessionCookieString) {
        console.log(`[DEBUG] ╔════════════════════════════════════════`);
        console.log(`[DEBUG] ║ SESSION COOKIES BEING SENT (URL-ENCODED AS-IS)`);
        console.log(`[DEBUG] ║ ${sessionCookieString}`);
        console.log(
          `[DEBUG] ║ Session cookies object:`,
          JSON.stringify(this.sessionCookies),
        );
        console.log(`[DEBUG] ╚════════════════════════════════════════`);
      }

      const req = https.request(url, options, (res) => {
        let data = "";

        // Capture Set-Cookie headers to store session cookies
        if (res.headers["set-cookie"]) {
          const cookies = Array.isArray(res.headers["set-cookie"])
            ? res.headers["set-cookie"]
            : [res.headers["set-cookie"]];

          console.log(`[DEBUG] ╔════════════════════════════════════════`);
          console.log(`[DEBUG] ║ SET-COOKIE RECEIVED FROM HCL`);
          console.log(`[DEBUG] ║ Count: ${cookies.length}`);
          cookies.forEach((cookieString, idx) => {
            console.log(
              `[DEBUG] ║ Cookie ${idx + 1}: ${cookieString.substring(0, 100)}`,
            );
            // Parse "name=value; Path=...; HttpOnly" format
            const parts = cookieString.split(";");
            const [name, value] = parts[0].split("=");
            if (name && value) {
              this.sessionCookies[name.trim()] = value.trim();
              console.log(
                `[DEBUG] ║   → Stored as: ${name.trim()}=${value.trim().substring(0, 40)}...`,
              );
            }
          });
          console.log(`[DEBUG] ╚════════════════════════════════════════`);
        }

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            console.log(`[DEBUG] Response status: ${res.statusCode}`);
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode >= 400) {
              console.error(
                `[ERROR] HCL API returned ${res.statusCode}: ${JSON.stringify(parsed).substring(0, 200)}`,
              );
              reject({
                statusCode: res.statusCode,
                message:
                  parsed.message || parsed.error || `HTTP ${res.statusCode}`,
                details: parsed,
              });
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject({
              statusCode: res.statusCode,
              message: "Failed to parse response",
              raw: data,
            });
          }
        });
      });

      req.on("error", reject);

      if (body) {
        console.log(
          `[DEBUG] Request body: ${JSON.stringify(body).substring(0, 300)}`,
        );
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Authenticate with HCL Commerce
   */
  async login(username, password) {
    try {
      const response = await this.request(
        "POST",
        `${this.baseUrl}/loginidentity?responseFormat=json`,
        {
          logonId: username,
          password,
          rememberMe: 1,
        },
      );

      // Store both tokens from the login response
      // WCToken is the main authentication token
      this.accessToken = response.WCToken || response.token;
      // WCTrustedToken is a SEPARATE token for trusted operations
      this.trustedToken = response.WCTrustedToken;

      // Set expiry (25 minutes from now)
      this.tokenExpiry = Date.now() + 25 * 60 * 1000;

      console.log(`[DEBUG] [HCL-REST-AUTH] Tokens received:`);
      console.log(`[DEBUG]   WCToken: ${this.accessToken.substring(0, 50)}...`);
      console.log(
        `[DEBUG]   WCTrustedToken: ${this.trustedToken.substring(0, 50)}...`,
      );
      console.log(`✅ HCL Login successful. Tokens expire in 25 minutes`);

      return {
        token: this.accessToken,
        trustedToken: this.trustedToken,
        userId: response.userId,
        personalizationId: response.personalizationId,
      };
    } catch (error) {
      console.error("❌ HCL Login failed:", error);
      throw {
        status: 401,
        message: "Authentication failed",
        details: error,
      };
    }
  }

  /**
   * Get current cart for authenticated user
   * CRITICAL: Both accessToken (WCToken) and trustedToken (WCTrustedToken) must be provided
   */
  async getCart(accessToken, trustedToken) {
    try {
      // Try different endpoint patterns for getting cart
      const endpoints = [
        `${this.baseUrl}/cart/@self?responseFormat=json`,
        `${this.baseUrl}/cart?responseFormat=json`,
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(
            `[DEBUG] Trying GET cart endpoint: ${endpoint.substring(endpoint.lastIndexOf("/"))}`,
          );
          return await this.request(
            "GET",
            endpoint,
            null,
            accessToken,
            trustedToken,
          );
        } catch (error) {
          if (error.statusCode !== 404) {
            // Non-404 error, don't retry
            throw error;
          }
          // 404, try next endpoint
          console.log(`[DEBUG] Endpoint returned 404, trying next...`);
        }
      }

      // All GET attempts failed with 404, create new cart
      console.log(
        "[DEBUG] All GET cart endpoints returned 404, creating new cart...",
      );
      return await this.request(
        "POST",
        `${this.baseUrl}/cart?responseFormat=json`,
        {},
        accessToken,
        trustedToken,
      );
    } catch (error) {
      console.error("❌ Get/create cart failed:", error);
      throw {
        status: error.statusCode || 500,
        message: "Failed to retrieve/create cart",
        details: error,
      };
    }
  }

  /**
   * Add product to cart with auto-retry if session cookies need to be established
   */
  async addToCart(
    accessToken,
    partNumber,
    quantity = 1,
    userId = null,
    trustedToken = null,
  ) {
    try {
      // HCL Commerce expects this exact structure based on Postman successful request
      const requestBody = {
        orderId: ".",
        x_calculatedOrder: "0",
        orderItem: [
          {
            quantity: String(quantity),
            partNumber,
          },
        ],
        x_inventoryValidation: true,
      };

      // Add userId if provided - might be needed for proper authentication
      if (userId) {
        requestBody.userId = userId;
      }

      console.log(
        `[DEBUG] Adding to cart: ${partNumber} x${quantity}${userId ? `, userId=${userId}` : ""}, body=${JSON.stringify(requestBody)}`,
      );

      // First attempt
      let attempt = 1;
      let lastError = null;

      while (attempt <= 2) {
        try {
          console.log(`[DEBUG] Add to cart attempt ${attempt}/2`);

          const result = await this.request(
            "POST",
            `${this.baseUrl}/cart?langId=1&responseFormat=json`,
            requestBody,
            accessToken,
            trustedToken,
          );

          console.log(`[DEBUG] ✓ Add to cart succeeded on attempt ${attempt}`);
          return result;
        } catch (error) {
          lastError = error;

          // Check if this is the "generic user" error
          if (
            error.statusCode === 400 &&
            error.details?.errors?.[0]?.errorKey === "USR.CWXFR0130E" &&
            attempt === 1
          ) {
            console.log(
              `[DEBUG] Got "generic user" error - likely need session cookies`,
            );
            console.log(
              `[DEBUG] Session cookies captured so far:`,
              JSON.stringify(this.sessionCookies),
            );
            console.log(
              `[DEBUG] Retrying with any captured session cookies...`,
            );
            attempt++;
            // Loop will retry with the cookies we captured from the 400 response
          } else {
            // Other errors - don't retry
            throw error;
          }
        }
      }

      // If we get here, both attempts failed
      throw lastError;
    } catch (error) {
      console.error("❌ Add to cart failed:", error);
      throw {
        status: error.statusCode || 500,
        message: "Failed to add product to cart",
        details: error,
      };
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(accessToken, orderId, itemId, quantity) {
    try {
      return await this.request(
        "PUT",
        `${this.baseUrl}/cart/@self/update_order_item?responseFormat=json`,
        {
          orderId,
          orderItemId: itemId,
          quantity,
        },
        accessToken,
      );
    } catch (error) {
      console.error("❌ Update cart item failed:", error);
      throw {
        status: error.statusCode || 500,
        message: "Failed to update cart item",
        details: error,
      };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(accessToken, orderId, itemId, trustedToken = null) {
    try {
      // Step 1: Get current cart to see all items
      console.log(
        `[HCL-CLIENT] Step 1: Fetching current cart to identify items to keep...`,
      );
      const currentCart = await this.request(
        "GET",
        `${this.baseUrl}/cart/@self?responseFormat=json`,
        null,
        accessToken,
        trustedToken,
      );

      // Step 2: Build orderItem array with all items EXCEPT the one to remove
      // HCL Commerce doesn't have a DELETE endpoint - removal is done by PUTting
      // the updated cart with the item excluded
      const itemsToKeep = (currentCart.orderItem || []).filter(
        (item) => String(item.orderItemId) !== String(itemId),
      );

      console.log(
        `[HCL-CLIENT] Step 2: Found ${currentCart.orderItem?.length || 0} items total`,
      );
      console.log(`[HCL-CLIENT] Removing item ${itemId}, keeping ${itemsToKeep.length} items`);

      // Step 3: Prepare request body with remaining items
      const requestBody = {
        orderId: ".",
        x_calculatedOrder: "0",
        orderItem: itemsToKeep.map((item) => ({
          orderItemId: item.orderItemId,
          quantity: String(item.quantity),
          partNumber: item.partNumber,
        })),
        x_inventoryValidation: true,
      };

      console.log(
        `[HCL-CLIENT] Step 3: Sending PUT request to update cart with ${itemsToKeep.length} items`,
      );
      console.log(
        `[HCL-CLIENT] PUT URL: ${this.baseUrl}/cart?langId=1&responseFormat=json`,
      );

      // Step 4: Update cart by PUT with remaining items
      const response = await this.request(
        "PUT",
        `${this.baseUrl}/cart?langId=1&responseFormat=json`,
        requestBody,
        accessToken,
        trustedToken,
      );

      console.log(`[HCL-CLIENT] ✓ Item removed successfully`);
      return response;
    } catch (error) {
      console.error("❌ Remove from cart failed:", error);
      console.error("❌ Error details:", error);
      throw {
        statusCode: error.statusCode || 500,
        message: "Failed to remove item from cart",
        details: error,
      };
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    return (
      !this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry
    );
  }
}

// Export the class and create singleton instance (will be initialized in server.js)
export const hclClient = new HCLClient();
export { HCLClient };
