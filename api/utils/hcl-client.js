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
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Host: url.hostname,
          // HCL Commerce expects token in Cookie header, not Authorization: Bearer
          ...(accessToken && { Cookie: `WCToken=${accessToken}` }),
        },
        agent,
      };

      console.log(`[DEBUG] ${method} ${url.toString()}`);
      if (accessToken) {
        console.log(`[DEBUG] Auth: Cookie header with WCToken set`);
        console.log(`[DEBUG] Token (first 50 chars): ${accessToken.substring(0, 50)}`);
      }

      const req = https.request(url, options, (res) => {
        let data = '';

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
      return await this.request(
        'GET',
        `${this.baseUrl}/cart/@self?responseFormat=json`,
        null,
        accessToken
      );
    } catch (error) {
      console.error('❌ Get cart failed:', error);
      throw {
        status: error.statusCode || 500,
        message: 'Failed to retrieve cart',
        details: error,
      };
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(accessToken, partNumber, quantity = 1) {
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
      
      // Some HCL versions require token in body as well
      if (accessToken) {
        requestBody.wcToken = accessToken;
      }
      
      console.log(`[DEBUG] Adding to cart: ${partNumber} x${quantity}, body=${JSON.stringify(requestBody)}`);
      
      return await this.request(
        'POST',
        `${this.baseUrl}/cart?langId=1&responseFormat=json`,
        requestBody,
        accessToken
      );
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
