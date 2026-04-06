/**
 * HCL Authentication Controller
 * Handles login and token management
 */

import { hclClient } from '../utils/hcl-client.js';
import mockHCLAuth from '../utils/mock-hcl-auth.js';

// Always use mock auth for now - set to false to use real HCL
const USE_MOCK_AUTH = true;

export const hclAuthController = {
  /**
   * POST /api/hcl/login
   * Authenticate user with HCL Commerce or mock auth (development)
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

      // Use mock auth in development mode
      let authResult;
      if (USE_MOCK_AUTH) {
        console.log('[AUTH-CONTROLLER] Using MOCK authentication (development mode)');
        authResult = mockHCLAuth.login(username, password);
      } else {
        console.log('[AUTH-CONTROLLER] Using REAL HCL authentication');
        authResult = await hclClient.login(username, password);
      }

      // Store token in server session for this request
      req.session = req.session || {};
      req.session.hclToken = authResult.token;
      req.session.hclUserId = authResult.userId;

      res.json({
        success: true,
        accessToken: authResult.token,
        userId: authResult.userId,
        email: authResult.email,
        name: authResult.name,
        expiresIn: authResult.expiresIn || 1500, // 25 minutes in seconds
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/hcl/auth/available-users
   * Returns list of available mock users (development only)
   */
  getAvailableUsers: (req, res, next) => {
    if (!USE_MOCK_AUTH) {
      return res.status(403).json({
        error: 'This endpoint is only available in development mode with mock auth enabled',
      });
    }

    try {
      const users = mockHCLAuth.getAvailableUsers();
      res.json({
        success: true,
        message: 'Available mock users (development only)',
        users,
      });
    } catch (error) {
      next(error);
    }
  },
};
