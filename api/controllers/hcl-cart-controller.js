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
      const { partNumber, sku, quantity, accessToken } = req.body;
      
      // For localhost testing without auth
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
      const productId = partNumber || sku;

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: partNumber or sku',
        });
      }

      // Localhost test mode - return mock cart response
      if (isLocalhost && !accessToken) {
        console.log(`[CART] Adding to cart (localhost test mode): ${productId} x${quantity || 1}`);
        return res.json({
          success: true,
          message: 'Product added to cart (test mode)',
          cart: {
            cartId: 'test-cart-' + Date.now(),
            items: [{
              partNumber: productId,
              sku: productId,
              quantity: quantity || 1,
              price: 99.99,
              name: 'Test Product',
            }],
            total: (quantity || 1) * 99.99,
          },
        });
      }

      // Production mode - requires auth
      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Missing required field: accessToken',
        });
      }

      const cart = await hclClient.addToCart(
        accessToken,
        productId,
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
