/**
 * HCL Commerce REST API Authentication
 * 
 * Uses HCL Commerce Identity/Login REST API endpoints:
 * - POST /identity/v1/customers/login - Authenticate and get wcToken
 * - POST /identity/v1/customers/logout - Invalidate wcToken
 * 
 * References:
 * https://help.hcl-software.com/commerce/9.0.0/restapi/code/authentication_and_session_management.html
 * 
 * Token Lifecycle:
 * 1. User provides username/password
 * 2. POST to /identity/v1/customers/login
 * 3. Receive wcToken (valid for duration specified)
 * 4. Store wcToken in sessionStorage on frontend
 * 5. Include wcToken in all subsequent cart/checkout API calls
 * 6. On logout, POST to /identity/v1/customers/logout to invalidate token
 */

import fetch from 'node-fetch';

// Simple logger wrapper - using console for basic boilerplate server
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

/**
 * HCL Commerce REST API Authentication Handler
 * Manages login/logout using HCL's official REST API endpoints
 */
class HCLRestAuth {
  constructor() {
    // Delay reading environment variables until runtime to ensure dotenv has loaded
    this._initialized = false;
    this._hclHost = null;
    this._hclStoreId = null;
    this._hclCatalogId = null;
    this._hclLanguageId = null;
    this._hclCurrencyId = null;
  }

  // Lazy initialization of environment variables
  _ensureInitialized() {
    if (!this._initialized) {
      this._hclHost = process.env.HCL_HOST || 'http://localhost:8080';
      this._hclStoreId = process.env.HCL_STORE_ID || 'B2CStore';
      this._hclCatalogId = process.env.HCL_CATALOG_ID || '10001';
      this._hclLanguageId = process.env.HCL_LANGUAGE_ID || '-1';
      this._hclCurrencyId = process.env.HCL_CURRENCY_ID || '1';
      this._initialized = true;
    }
  }

  get hclHost() {
    this._ensureInitialized();
    return this._hclHost;
  }

  get hclStoreId() {
    this._ensureInitialized();
    return this._hclStoreId;
  }

  get hclCatalogId() {
    this._ensureInitialized();
    return this._hclCatalogId;
  }

  get hclLanguageId() {
    this._ensureInitialized();
    return this._hclLanguageId;
  }

  get hclCurrencyId() {
    this._ensureInitialized();
    return this._hclCurrencyId;
  }

  /**
   * Login to HCL Commerce using REST API
   * 
   * Endpoint: POST /identity/v1/customers/login
   * Body: { logonId, password, storeId }
   * Response: { wcToken, userId, email, displayName, ... }
   * 
   * @param {string} username - HCL Commerce user/customer ID (logonId)
   * @param {string} password - User password
   * @returns {Promise<Object>} Authentication result with wcToken
   */
  async login(username, password) {
    try {
      const loginEndpoint = `${this.hclHost}/identity/v1/customers/login`;
      
      const requestBody = {
        logonId: username,
        password: password,
        storeId: this.hclStoreId,
      };

      logger.info(`[HCL-REST-AUTH] Attempting login for user: ${username}`);
      logger.debug(`[HCL-REST-AUTH] Login endpoint: ${loginEndpoint}`);
      logger.debug(`[HCL-REST-AUTH] Request body (sanitized): logonId=${username}, storeId=${this.hclStoreId}`);

      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        timeout: 5000,
      });

      const responseText = await response.text();
      
      logger.debug(`[HCL-REST-AUTH] Response status: ${response.status}`);

      if (!response.ok) {
        logger.warn(`[HCL-REST-AUTH] Login failed with status ${response.status}`);
        logger.debug(`[HCL-REST-AUTH] Error response: ${responseText}`);
        
        let errorDetail = 'Authentication failed';
        try {
          const errorBody = JSON.parse(responseText);
          errorDetail = errorBody.message || errorBody.error || errorDetail;
        } catch (e) {
          // Response was not JSON, use status message
        }

        return {
          success: false,
          error: errorDetail,
          statusCode: response.status,
        };
      }

      // Parse successful response
      let responseBody;
      try {
        responseBody = JSON.parse(responseText);
      } catch (e) {
        logger.error(`[HCL-REST-AUTH] Failed to parse login response: ${e.message}`);
        return {
          success: false,
          error: 'Invalid response format from HCL Commerce',
          statusCode: 500,
        };
      }

      // Extract wcToken from response
      const wcToken = responseBody.wcToken || responseBody.token;
      
      if (!wcToken) {
        logger.error('[HCL-REST-AUTH] No wcToken in response');
        logger.debug(`[HCL-REST-AUTH] Response body: ${JSON.stringify(responseBody)}`);
        return {
          success: false,
          error: 'No authentication token received from HCL Commerce',
          statusCode: 500,
        };
      }

      logger.info(`[HCL-REST-AUTH] ✓ Login successful for user: ${username}`);
      logger.debug(`[HCL-REST-AUTH] Token received (truncated): ${wcToken.substring(0, 20)}...`);

      // Return standardized response (matches Adobe Commerce format)
      return {
        success: true,
        wcToken: wcToken,
        accessToken: wcToken, // Alias for consistency
        userId: responseBody.userId || responseBody.customerId,
        email: responseBody.email || responseBody.logonId,
        firstName: responseBody.firstName || '',
        lastName: responseBody.lastName || '',
        displayName: responseBody.displayName || username,
        expiresIn: responseBody.expiresIn || 3600, // Default 1 hour if not specified
        // Pass through all other fields
        ...responseBody,
      };

    } catch (error) {
      logger.error(`[HCL-REST-AUTH] Login error: ${error.message}`);
      logger.debug(`[HCL-REST-AUTH] Stack trace: ${error.stack}`);
      
      return {
        success: false,
        error: `Authentication service error: ${error.message}`,
        statusCode: 503,
      };
    }
  }

  /**
   * Logout from HCL Commerce using REST API
   * 
   * Endpoint: POST /identity/v1/customers/logout
   * Headers: wcToken in Cookie or Header
   * Response: { logoutSuccessful: true/false }
   * 
   * @param {string} wcToken - The authentication token to invalidate
   * @returns {Promise<Object>} Logout result
   */
  async logout(wcToken) {
    try {
      const logoutEndpoint = `${this.hclHost}/identity/v1/customers/logout`;
      
      logger.info('[HCL-REST-AUTH] Attempting logout');

      const response = await fetch(logoutEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cookie': `WCToken=${wcToken}`, // Some HCL versions use cookie
          'Authorization': `Bearer ${wcToken}`, // Some versions use header
        },
        timeout: 5000,
      });

      const responseText = await response.text();
      
      logger.debug(`[HCL-REST-AUTH] Logout response status: ${response.status}`);

      if (!response.ok) {
        logger.warn(`[HCL-REST-AUTH] Logout response: ${response.status}`);
      }

      // Try to parse response
      let responseBody;
      try {
        responseBody = JSON.parse(responseText);
      } catch (e) {
        // Response might be empty or plain text
        responseBody = { logoutSuccessful: response.ok };
      }

      logger.info('[HCL-REST-AUTH] ✓ Logout processed');

      return {
        success: response.ok,
        message: responseBody.message || 'Logout successful',
        ...responseBody,
      };

    } catch (error) {
      logger.warn(`[HCL-REST-AUTH] Logout error: ${error.message}`);
      // Don't fail on logout errors - token might already be invalid
      return {
        success: false,
        message: `Logout warning: ${error.message}`,
      };
    }
  }

  /**
   * Validate token is still valid
   * Can be called before making API requests to check token freshness
   * 
   * @param {string} wcToken - Token to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateToken(wcToken) {
    try {
      // Try to call a simple endpoint that requires authentication
      // If token is invalid, we'll get 401
      const validateEndpoint = `${this.hclHost}/rest/model/v2/sites/${this.hclStoreId}/cart`;
      
      const response = await fetch(validateEndpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cookie': `WCToken=${wcToken}`,
          'Authorization': `Bearer ${wcToken}`,
        },
        timeout: 5000,
      });

      if (response.status === 401) {
        logger.warn('[HCL-REST-AUTH] Token validation failed: 401 Unauthorized');
        return {
          valid: false,
          message: 'Token is invalid or expired',
          statusCode: 401,
        };
      }

      logger.debug('[HCL-REST-AUTH] Token validation passed');
      return {
        valid: true,
        message: 'Token is valid',
        statusCode: response.status,
      };

    } catch (error) {
      logger.warn(`[HCL-REST-AUTH] Token validation error: ${error.message}`);
      return {
        valid: false,
        message: `Validation error: ${error.message}`,
      };
    }
  }

  /**
   * Get HCL Commerce store configuration
   * Used for debugging and configuration validation
   * 
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      hclHost: this.hclHost,
      hclStoreId: this.hclStoreId,
      hclCatalogId: this.hclCatalogId,
      hclLanguageId: this.hclLanguageId,
      hclCurrencyId: this.hclCurrencyId,
      loginEndpoint: `${this.hclHost}/identity/v1/customers/login`,
      logoutEndpoint: `${this.hclHost}/identity/v1/customers/logout`,
    };
  }
}

// Export singleton instance
const hclRestAuth = new HCLRestAuth();

export default hclRestAuth;
export { HCLRestAuth };
