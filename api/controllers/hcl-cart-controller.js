/**
 * HCL Cart Controller
 * Handles cart operations (add, get, update, remove)
 */

import { hclClient } from '../utils/hcl-client.js';

export const hclCartController = {
  /**
   * POST /api/hcl/cart/add
   * Add product to cart
   */
  addToCart: async (req, res, next) => {
    try {
      const { partNumber, quantity, accessToken } = req.body;

      if (!partNumber || !accessToken) {
        return res.status(400).json({
          error: 'Missing required fields: partNumber, accessToken',
        });
      }

      const cart = await hclClient.addToCart(
        accessToken,
        partNumber,
        quantity || 1
      );

      res.json({
        success: true,
        cart,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/hcl/cart
   * Get current cart for authenticated user
   */
  getCart: async (req, res, next) => {
    try {
      const { accessToken } = req.query;

      if (!accessToken) {
        return res.status(400).json({
          error: 'Missing required parameter: accessToken',
        });
      }

      const cart = await hclClient.getCart(accessToken);

      res.json({
        success: true,
        cart,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/hcl/cart/item/:orderId/:itemId
   * Remove item from cart
   */
  removeFromCart: async (req, res, next) => {
    try {
      const { orderId, itemId } = req.params;
      const { accessToken } = req.query;

      if (!accessToken) {
        return res.status(400).json({
          error: 'Missing required parameter: accessToken',
        });
      }

      const cart = await hclClient.removeFromCart(
        accessToken,
        orderId,
        itemId
      );

      res.json({
        success: true,
        cart,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/hcl/cart/checkout
   * Placeholder for checkout (not in Phase 1 scope)
   */
  checkoutCart: async (req, res) => {
    res.status(501).json({
      error: 'Checkout not implemented',
      message: 'Checkout functionality is planned for Phase 2',
    });
  },
};
