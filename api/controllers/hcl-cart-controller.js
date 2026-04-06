/**
 * HCL Cart Controller
 * Handles cart operations (add, get, update, remove)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hclClient } from '../utils/hcl-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CART_STORAGE_DIR = path.join(__dirname, '../.cart-storage');
const CART_FILE = path.join(CART_STORAGE_DIR, 'test-cart-localhost.json');

// Ensure storage directory exists
if (!fs.existsSync(CART_STORAGE_DIR)) {
  fs.mkdirSync(CART_STORAGE_DIR, { recursive: true });
}

// Helper functions for file-based cart storage
function loadCart() {
  try {
    if (fs.existsSync(CART_FILE)) {
      const data = fs.readFileSync(CART_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[CART] Error loading cart from file:', error.message);
  }
  return null;
}

function saveCart(cart) {
  try {
    fs.writeFileSync(CART_FILE, JSON.stringify(cart, null, 2), 'utf8');
    console.log('[CART] ✓ Cart persisted to file');
  } catch (error) {
    console.error('[CART] Error saving cart to file:', error.message);
  }
}

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

      // Localhost test mode - return mock cart response with accumulation
      if (isLocalhost && !accessToken) {
        console.log(`[CART] Adding to cart (localhost test mode): ${productId} x${quantity || 1}`);
        
        // Load or create cart from file
        const cartId = 'test-cart-localhost';
        let cart = loadCart();
        
        if (!cart) {
          console.log(`[CART] ✓ Creating new cart with id: ${cartId}`);
          cart = {
            cartId,
            items: [],
            total: 0,
          };
        } else {
          console.log(`[CART] ✓ Loaded existing cart from file, current items: ${cart.items.length}`);
        }

        // Check if product already exists in cart
        const existingItem = cart.items.find(item => item.partNumber === productId);
        
        if (existingItem) {
          // Update quantity if already in cart
          existingItem.quantity += (quantity || 1);
          console.log(`[CART] ✓ Updated item quantity → ${existingItem.quantity}`);
        } else {
          // Add new item
          cart.items.push({
            partNumber: productId,
            sku: productId,
            quantity: quantity || 1,
            price: 99.99,
            name: 'Test Product',
          });
          console.log(`[CART] ✓ Added new item (total items in cart: ${cart.items.length})`);
        }

        // Recalculate total
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log(`[CART] ✓ Cart total: $${cart.total.toFixed(2)}`);

        // Persist to file
        saveCart(cart);
        console.log(`[CART] ✓ Returning cart with ${cart.items.length} items, total: $${cart.total.toFixed(2)}`);

        return res.json({
          success: true,
          message: 'Product added to cart (test mode)',
          cart,
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
   * Get current cart for authenticated user or localhost test mode
   */
  getCart: async (req, res, next) => {
    try {
      const { accessToken } = req.query;
      const isLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';

      // Localhost test mode - return persisted cart
      if (isLocalhost && !accessToken) {
        const cartId = 'test-cart-localhost';
        const cart = cartStorage.get(cartId) || {
          cartId,
          items: [],
          total: 0,
        };
        console.log(`[CART] Getting cart (localhost test mode): ${cart.items.length} items`);
        return res.json({
          success: true,
          cart,
        });
      }

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
