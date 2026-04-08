/**
 * HCL Authentication Controller
 * Handles login and token management using HCL Commerce REST API
 * 
 * References:
 * https://help.hcl-software.com/commerce/9.0.0/restapi/code/authentication_and_session_management.html
 */

import hclRestAuth from '../utils/hcl-rest-auth.js';
import mockHCLAuth from '../utils/mock-hcl-auth.js';

/**
 * USE_REAL_HCL_AUTH: Set to true to use real HCL Commerce REST API
 * Set to false to use mock auth (development/testing without HCL VM)
 * 
 * Real HCL: Requires HCL_HOST and HCL_STORE_ID environment variables
 * Mock: Uses in-memory user database (test credentials built-in)
 * 
 * NOTE: This is evaluated at runtime (not at module load time) to ensure
 * dotenv has already loaded the .env file.
 */
const getUseRealHCLAuth = () => {
  const value = process.env.USE_REAL_HCL_AUTH === 'true';
  return value;
};

export const hclAuthController = {
  /**
   * POST /api/hcl/login
   * Authenticate user with HCL Commerce REST API
   * 
   * Request body:
   * {
   *   "username": "auroraadobetest",
   *   "password": "passw0rd"
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "wcToken": "...",
   *   "userId": "...",
   *   "email": "...",
   *   "displayName": "..."
   * }
   */
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: username, password',
        });
      }

      console.log(`[AUTH-CONTROLLER] Login attempt for user: ${username}`);

      // Use real HCL REST API or mock based on environment
      let authResult;
      const useReal = getUseRealHCLAuth();
      
      if (useReal) {
        console.log('[AUTH-CONTROLLER] Using REAL HCL Commerce REST API');
        authResult = await hclRestAuth.login(username, password);
      } else {
        console.log('[AUTH-CONTROLLER] Using MOCK authentication (development mode)');
        authResult = mockHCLAuth.login(username, password);
      }

      // Check for authentication failure
      if (!authResult.success) {
        console.warn(`[AUTH-CONTROLLER] Authentication failed: ${authResult.error}`);
        const statusCode = authResult.statusCode || 401;
        return res.status(statusCode).json({
          success: false,
          error: authResult.error,
        });
      }

      // Success - return authentication data
      // Note: wcToken from HCL should be stored in frontend sessionStorage
      // and included in subsequent requests to cart/checkout endpoints
      console.log(`[AUTH-CONTROLLER] ✓ Login successful for user: ${username}`);

      const responseData = {
        success: true,
        wcToken: authResult.wcToken || authResult.accessToken,
        accessToken: authResult.wcToken || authResult.accessToken, // Alias for consistency
        userId: authResult.userId,
        email: authResult.email,
        displayName: authResult.displayName || username,
        firstName: authResult.firstName || '',
        lastName: authResult.lastName || '',
        expiresIn: authResult.expiresIn || 3600, // Token expiration in seconds
        // Include session cookies from login response (JSESSIONID, WC_PERSISTENT, etc)
        // Frontend should pass these to subsequent cart requests
        sessionCookies: authResult.sessionCookies || {},
      };

      console.log(`[AUTH-CONTROLLER] Sending login response with sessionCookies:`, {
        hasCookies: !!responseData.sessionCookies,
        cookieKeys: Object.keys(responseData.sessionCookies || {}),
        sessionCookiesValue: responseData.sessionCookies,
      });

      res.json(responseData);

    } catch (error) {
      console.error(`[AUTH-CONTROLLER] Login error: ${error.message}`);
      next(error);
    }
  },

  /**
   * POST /api/hcl/logout
   * Invalidate session and logout from HCL Commerce
   * 
   * Request body:
   * {
   *   "wcToken": "..."
   * }
   */
  logout: async (req, res, next) => {
    try {
      const { wcToken } = req.body;

      if (!wcToken) {
        console.warn('[AUTH-CONTROLLER] Logout called without wcToken');
        return res.status(400).json({
          success: false,
          error: 'Missing wcToken',
        });
      }

      console.log('[AUTH-CONTROLLER] Processing logout');

      // Call HCL logout if using real auth
      const useReal = getUseRealHCLAuth();
      if (useReal) {
        const logoutResult = await hclRestAuth.logout(wcToken);
        console.log(`[AUTH-CONTROLLER] HCL logout response: ${logoutResult.success}`);
      } else {
        mockHCLAuth.logout(wcToken);
        console.log('[AUTH-CONTROLLER] Mock logout completed');
      }

      // Always return success - token is invalidated on frontend anyway
      res.json({
        success: true,
        message: 'Logout successful',
      });

    } catch (error) {
      console.error(`[AUTH-CONTROLLER] Logout error: ${error.message}`);
      next(error);
    }
  },

  /**
   * GET /api/hcl/auth/validate
   * Validate if a wcToken is still valid
   * 
   * Query params:
   * ?wcToken=...
   */
  validateToken: async (req, res, next) => {
    try {
      const { wcToken } = req.query;

      if (!wcToken) {
        return res.status(400).json({
          success: false,
          error: 'Missing wcToken parameter',
        });
      }

      console.log('[AUTH-CONTROLLER] Validating token');

      let isValid;
      const useReal = getUseRealHCLAuth();
      if (useReal) {
        const validationResult = await hclRestAuth.validateToken(wcToken);
        isValid = validationResult.valid;
      } else {
        const validationResult = mockHCLAuth.validateToken(wcToken);
        isValid = validationResult.valid;
      }

      res.json({
        success: true,
        valid: isValid,
      });

    } catch (error) {
      console.error(`[AUTH-CONTROLLER] Validation error: ${error.message}`);
      next(error);
    }
  },

  /**
   * GET /api/hcl/auth/available-users
   * Get list of available test users for development
   */
  getAvailableUsers: async (req, res, next) => {
    try {
      res.json({
        success: true,
        users: [
          {
            username: 'auroraadobetest',
            password: 'passw0rd',
            description: 'Aurora Test User',
          },
          {
            username: 'adobetest1',
            password: 'passw0rd',
            description: 'Adobe Test User 1',
          },
          {
            username: 'adobetest2',
            password: 'passw0rd',
            description: 'Adobe Test User 2',
          },
        ],
      });
    } catch (error) {
      console.error(`[AUTH-CONTROLLER] Error getting available users: ${error.message}`);
      next(error);
    }
  },

  /**
   * GET /api/hcl/auth/diagnose
   * Diagnostic endpoint to test HCL Commerce connectivity
   * Shows current configuration and tests login endpoint
   */
  diagnose: async (req, res, next) => {
    try {
      const useReal = getUseRealHCLAuth();
      
      res.json({
        success: true,
        mode: useReal ? 'REAL HCL Commerce' : 'MOCK Authentication',
        configuration: {
          HCL_HOST: process.env.HCL_HOST || 'http://localhost:8080',
          HCL_STORE_ID: process.env.HCL_STORE_ID || 'B2CStore',
          HCL_CATALOG_ID: process.env.HCL_CATALOG_ID || '10001',
          USE_REAL_HCL_AUTH: process.env.USE_REAL_HCL_AUTH === 'true',
        },
        loginEndpoints: {
          primary: `${process.env.HCL_HOST || 'http://localhost:8080'}/store/${process.env.HCL_STORE_ID || 'B2CStore'}/loginidentity`,
          alternative: `${process.env.HCL_HOST || 'http://localhost:8080'}/identity/v1/customers/login`,
        },
        testCredentials: {
          username: 'auroraadobetest',
          password: 'passw0rd',
        },
        instructions: [
          '1. If mode is MOCK, switch to REAL by setting USE_REAL_HCL_AUTH=true in .env',
          '2. Verify HCL_HOST points to your HCL Commerce VM',
          '3. Verify HCL_STORE_ID exists and user has access',
          '4. Try logging in with test credentials',
          '5. If "tenant not found" error, check store ID',
        ],
      });
    } catch (error) {
      console.error(`[AUTH-CONTROLLER] Diagnostic error: ${error.message}`);
      next(error);
    }
  },
};
