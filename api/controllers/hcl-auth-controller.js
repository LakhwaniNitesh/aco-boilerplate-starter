/**
 * HCL Authentication Controller
 * Handles login and token management
 */

import { hclClient } from '../utils/hcl-client.js';

export const hclAuthController = {
  /**
   * POST /api/hcl/login
   * Authenticate user with HCL Commerce
   */
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          error: 'Missing required fields: username, password',
        });
      }

      const authResult = await hclClient.login(username, password);

      // Store token in server session for this request
      req.session = req.session || {};
      req.session.hclToken = authResult.token;
      req.session.hclUserId = authResult.userId;

      res.json({
        success: true,
        token: authResult.token,
        userId: authResult.userId,
        expiresIn: 1500, // 25 minutes in seconds
      });
    } catch (error) {
      next(error);
    }
  },
};
