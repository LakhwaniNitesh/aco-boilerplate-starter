/**
 * HCL Commerce API Client
 * Handles all HTTP communication with HCL Commerce backend
 */

import https from 'https';

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
    this.accessToken = null;
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
      console.error('[ERROR] HCL_HOST or HCL_STORE_ID not set in environment');
      throw new Error('Missing required environment variables: HCL_HOST and HCL_STORE_ID');
    }
    
    console.log(`[INFO] HCL Client initialized: ${this.baseUrl}`);
  }

  /**
   * Make HTTPS request to HCL API
   */
  async request(method, path, body = null, accessToken = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path.startsWith('http') ? path : this.baseUrl + path);
      
      // If token is URL-encoded (contains %2C, %2F, etc), decode it for Cookie header
      const decodedToken = accessToken ? decodeURIComponent(accessToken) : null;
      
      // Build Cookie header with tokens AND any session cookies from previous responses
      let cookieHeader = '';
      if (decodedToken) {
        cookieHeader = `WCToken=${decodedToken}; WCTrustedToken=${decodedToken}`;
      }
      
      // Add any session cookies we've captured (JSESSIONID, WC_PERSISTENT, etc)
      // CRITICAL: Decode URL-encoded cookie values before sending to HCL
      const sessionCookieString = Object.entries(this.sessionCookies)
        .map(([key, value]) => {
          // Decode the cookie value if it's URL-encoded
          const decodedValue = typeof value === 'string' && value.includes('%') ? decodeURIComponent(value) : value;
          return `${key}=${decodedValue}`;
        })
        .join('; ');
      
      if (sessionCookieString) {
        cookieHeader = cookieHeader ? `${cookieHeader}; ${sessionCookieString}` : sessionCookieString;
      }
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Host: url.hostname,
          ...(cookieHeader && { Cookie: cookieHeader }),
        },
        agent,
      };

      console.log(`[DEBUG] ${method} ${url.toString()}`);
      if (cookieHeader) {
        console.log(`[DEBUG] Auth: Cookie header with tokens + session cookies`);
        if (decodedToken) {
          console.log(`[DEBUG] ╔════════════════════════════════════════`);
          console.log(`[DEBUG] ║ TOKEN BEING SENT TO HCL`);
          console.log(`[DEBUG] ║ Received token: ${accessToken}`);
          console.log(`[DEBUG] ║ After decode: ${decodedToken}`);
          console.log(`[DEBUG] ║ First 30 chars: ${decodedToken.substring(0, 30)}`);
          console.log(`[DEBUG] ║ Last 30 chars: ${decodedToken.slice(-30)}`);
          console.log(`[DEBUG] ║ Length: ${decodedToken.length} chars`);
          console.log(`[DEBUG] ║ Contains user ID: ${decodedToken.includes('1007002')}`);
          console.log(`[DEBUG] ╚════════════════════════════════════════`);
        }
        if (sessionCookieString) {
          console.log(`[DEBUG] Session cookies: ${sessionCookieString.substring(0, 80)}`);
        }
      }
      
      // DEBUG: Log complete Cookie header being sent
      if (cookieHeader) {
        console.log(`[DEBUG] ╔════════════════════════════════════════`);
        console.log(`[DEBUG] ║ COMPLETE COOKIE HEADER BEING SENT`);
        console.log(`[DEBUG] ║ ${cookieHeader}`);
        console.log(`[DEBUG] ║ Session cookies object:`, JSON.stringify(this.sessionCookies));
        console.log(`[DEBUG] ╚════════════════════════════════════════`);
      }

      const req = https.request(url, options, (res) => {
        let data = '';

        // Capture Set-Cookie headers to store session cookies
        if (res.headers['set-cookie']) {
          const cookies = Array.isArray(res.headers['set-cookie']) 
            ? res.headers['set-cookie'] 
            : [res.headers['set-cookie']];
          
          console.log(`[DEBUG] ╔════════════════════════════════════════`);
          console.log(`[DEBUG] ║ SET-COOKIE RECEIVED FROM HCL`);
          console.log(`[DEBUG] ║ Count: ${cookies.length}`);
          cookies.forEach((cookieString, idx) => {
            console.log(`[DEBUG] ║ Cookie ${idx + 1}: ${cookieString.substring(0, 100)}`);
            // Parse "name=value; Path=...; HttpOnly" format
            const parts = cookieString.split(';');
            const [name, value] = parts[0].split('=');
            if (name && value) {
              this.sessionCookies[name.trim()] = value.trim();
              console.log(`[DEBUG] ║   → Stored as: ${name.trim()}=${value.trim().substring(0, 40)}...`);
            }
          });
          console.log(`[DEBUG] ╚════════════════════════════════════════`);
        }

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            console.log(`[DEBUG] Response status: ${res.statusCode}`);
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode >= 400) {
              console.error(`[ERROR] HCL API returned ${res.statusCode}: ${JSON.stringify(parsed).substring(0, 200)}`);
              reject({
                statusCode: res.statusCode,
                message: parsed.message || parsed.error || `HTTP ${res.statusCode}`,
                details: parsed,
              });
            } else {
              resolve(parsed);
            }
          } catch (e) {
            reject({
              statusCode: res.statusCode,
              message: 'Failed to parse response',
              raw: data,
            });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        console.log(`[DEBUG] Request body: ${JSON.stringify(body).substring(0, 300)}`);
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
        'POST',
        `${this.baseUrl}/loginidentity?responseFormat=json`,
        {
          logonId: username,
          password,
          rememberMe: 1,
        }
      );

      // Store token and set expiry (25 minutes from now)
      this.accessToken = response.WCToken || response.token;
      this.tokenExpiry = Date.now() + (25 * 60 * 1000);

      console.log(`✅ HCL Login successful. Token expires in 25 minutes`);

      return {
        token: this.accessToken,
        userId: response.userId,
        personalizationId: response.personalizationId,
      };
    } catch (error) {
      console.error('❌ HCL Login failed:', error);
      throw {
        status: 401,
        message: 'Authentication failed',
        details: error,
      };
    }
  }

  /**
   * Get current cart for authenticated user
   */
  async getCart(accessToken) {
    try {
      // Try different endpoint patterns for getting cart
      const endpoints = [
        `${this.baseUrl}/cart/@self?responseFormat=json`,
        `${this.baseUrl}/cart?responseFormat=json`,
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`[DEBUG] Trying GET cart endpoint: ${endpoint.substring(endpoint.lastIndexOf('/'))}`);
          return await this.request(
            'GET',
            endpoint,
            null,
            accessToken
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
      console.log('[DEBUG] All GET cart endpoints returned 404, creating new cart...');
      return await this.request(
        'POST',
        `${this.baseUrl}/cart?responseFormat=json`,
        {},
        accessToken
      );
    } catch (error) {
      console.error('❌ Get/create cart failed:', error);
      throw {
        status: error.statusCode || 500,
        message: 'Failed to retrieve/create cart',
        details: error,
      };
    }
  }

  /**
   * Add product to cart with auto-retry if session cookies need to be established
   */
  async addToCart(accessToken, partNumber, quantity = 1, userId = null) {
    try {
      // HCL Commerce expects this exact structure based on Postman successful request
      const requestBody = {
        orderId: '.',
        x_calculatedOrder: '0',
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
      
      console.log(`[DEBUG] Adding to cart: ${partNumber} x${quantity}${userId ? `, userId=${userId}` : ''}, body=${JSON.stringify(requestBody)}`);
      
      // First attempt
      let attempt = 1;
      let lastError = null;
      
      while (attempt <= 2) {
        try {
          console.log(`[DEBUG] Add to cart attempt ${attempt}/2`);
          
          const result = await this.request(
            'POST',
            `${this.baseUrl}/cart?langId=1&responseFormat=json`,
            requestBody,
            accessToken
          );
          
          console.log(`[DEBUG] ✓ Add to cart succeeded on attempt ${attempt}`);
          return result;
          
        } catch (error) {
          lastError = error;
          
          // Check if this is the "generic user" error
          if (error.statusCode === 400 && 
              error.details?.errors?.[0]?.errorKey === 'USR.CWXFR0130E' &&
              attempt === 1) {
            console.log(`[DEBUG] Got "generic user" error - likely need session cookies`);
            console.log(`[DEBUG] Session cookies captured so far:`, JSON.stringify(this.sessionCookies));
            console.log(`[DEBUG] Retrying with any captured session cookies...`);
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
      console.error('❌ Add to cart failed:', error);
      throw {
        status: error.statusCode || 500,
        message: 'Failed to add product to cart',
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
        'PUT',
        `${this.baseUrl}/cart/@self/update_order_item?responseFormat=json`,
        {
          orderId,
          orderItemId: itemId,
          quantity,
        },
        accessToken
      );
    } catch (error) {
      console.error('❌ Update cart item failed:', error);
      throw {
        status: error.statusCode || 500,
        message: 'Failed to update cart item',
        details: error,
      };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(accessToken, orderId, itemId) {
    try {
      return await this.request(
        'DELETE',
        `${this.baseUrl}/cart/@self/cart_item/${itemId}?responseFormat=json`,
        null,
        accessToken
      );
    } catch (error) {
      console.error('❌ Remove from cart failed:', error);
      throw {
        status: error.statusCode || 500,
        message: 'Failed to remove item from cart',
        details: error,
      };
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    return !this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry;
  }
}

// Export the class and create singleton instance (will be initialized in server.js)
export const hclClient = new HCLClient();
export { HCLClient };
