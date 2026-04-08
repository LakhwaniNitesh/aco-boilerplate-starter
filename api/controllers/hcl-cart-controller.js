/**
 * HCL Cart Controller
 * Handles cart operations by proxying to HCL Commerce REST APIs
 * Single source of truth: HCL Commerce only
 */

import { hclClient } from '../utils/hcl-client.js';

/**
 * Convert HCL Commerce API response to standard cart format
 * HCL returns cart with items array, we normalize to our format
 */
function normalizeHCLCart(hclResponse) {
  try {
    if (!hclResponse) {
      return { cartId: null, items: [], total: 0 };
    }

    // Handle different HCL API response formats
    const items = (hclResponse.items || hclResponse.orderItems || []).map(item => ({
      partNumber: item.partNumber || item.partnumber || '',
      sku: item.sku || item.partNumber || item.partnumber || '',
      quantity: item.quantity || 1,
      price: item.unitPrice || item.price || 0,
      name: item.displayName || item.name || 'Product',
      orderItemId: item.orderItemId || null,
    }));

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return {
      cartId: hclResponse.cartId || hclResponse.orderId || null,
      items,
      total: parseFloat(total.toFixed(2)),
    };
  } catch (error) {
    console.error('[CART-PROXY] Error normalizing HCL response:', error.message);
    return { cartId: null, items: [], total: 0 };
  }
}

export const hclCartController = {
  /**
   * POST /api/hcl/cart/add
   * Add product to cart - proxies to HCL Commerce REST API
   */
  addToCart: async (req, res, next) => {
    try {
      const { partNumber, sku, quantity, accessToken } = req.body;
      const productId = partNumber || sku;

      console.log(`[CART-PROXY] Request body: partNumber=${partNumber}, sku=${sku}, quantity=${quantity}, accessToken=${accessToken ? 'present' : 'missing'}`);

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: partNumber or sku',
        });
      }

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Missing required field: accessToken',
        });
      }

      console.log(`[CART-PROXY] Adding to cart: ${productId} x${quantity || 1}`);

      // Call HCL Commerce REST API to add item to cart
      const hclResponse = await hclClient.addToCart(
        accessToken,
        productId,
        quantity || 1
      );

      // Normalize response to our standard format
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(`[CART-PROXY] ✓ Added to HCL cart. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`);

      return res.json({
        success: true,
        message: 'Product added to cart',
        cart: normalizedCart,
      });
    } catch (error) {
      console.error('[CART-PROXY] Error adding to cart:', error.message);
      console.error('[CART-PROXY] Full error:', error);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to add product to cart',
        details: error.details,
      });
    }
  },

  /**
   * GET /api/hcl/cart
   * Get current cart - proxies to HCL Commerce REST API
   */
  getCart: async (req, res, next) => {
    try {
      const { accessToken } = req.query;

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Missing required field: accessToken',
        });
      }

      console.log('[CART-PROXY] Fetching cart from HCL...');

      // Call HCL Commerce REST API to get cart
      const hclResponse = await hclClient.getCart(accessToken);

      // Normalize response to our standard format
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(`[CART-PROXY] ✓ Fetched cart. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`);

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error('[CART-PROXY] Error fetching cart:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch cart',
        details: error.details,
      });
    }
  },

  /**
   * DELETE /api/hcl/cart/clear
   * Clear cart - calls HCL Commerce to remove all items
   */
  clearCart: async (req, res, next) => {
    try {
      const { accessToken } = req.query;

      if (!accessToken) {
        // For localhost test mode or when no auth needed
        return res.json({
          success: true,
          message: 'Cart cleared',
        });
      }

      console.log('[CART-PROXY] Clearing cart in HCL...');

      // Call HCL Commerce REST API to delete all items
      await hclClient.clearCart(accessToken);

      console.log('[CART-PROXY] ✓ Cart cleared');
      return res.json({
        success: true,
        message: 'Cart cleared',
      });
    } catch (error) {
      console.error('[CART-PROXY] Error clearing cart:', error.message);
      // Don't fail hard if clear fails - return success anyway
      return res.json({
        success: true,
        message: 'Cart cleared (HCL sync may have issues)',
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/hcl/cart/item
   * Remove item from cart - proxies to HCL Commerce REST API
   */
  removeFromCart: async (req, res, next) => {
    try {
      const { accessToken, orderItemId } = req.query;

      if (!accessToken || !orderItemId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: accessToken, orderItemId',
        });
      }

      console.log(`[CART-PROXY] Removing item ${orderItemId} from cart...`);

      // Call HCL Commerce REST API to remove item
      const hclResponse = await hclClient.removeFromCart(accessToken, orderItemId);

      // Normalize response
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(`[CART-PROXY] ✓ Item removed. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`);

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error('[CART-PROXY] Error removing item:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to remove item',
        details: error.details,
      });
    }
  },

  /**
   * PUT /api/hcl/cart/item
   * Update item quantity - proxies to HCL Commerce REST API
   */
  updateCartItem: async (req, res, next) => {
    try {
      const { accessToken, orderItemId, quantity } = req.body;

      if (!accessToken || !orderItemId || !quantity) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: accessToken, orderItemId, quantity',
        });
      }

      console.log(`[CART-PROXY] Updating item ${orderItemId} quantity to ${quantity}...`);

      // Call HCL Commerce REST API to update item
      const hclResponse = await hclClient.updateCartItem(accessToken, orderItemId, quantity);

      // Normalize response
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(`[CART-PROXY] ✓ Item updated. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`);

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error('[CART-PROXY] Error updating item:', error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to update item',
        details: error.details,
      });
    }
  },
};
