/**
 * HCL Commerce API Client Service
 *
 * Provides abstraction layer for HCL Commerce API calls through backend proxy
 * Handles:
 *   - Cart operations (add, get, remove, update)
 *   - Product information retrieval
 *   - Error handling and response normalization
 *   - Request/response logging
 *
 * All calls go through backend proxy for security and CORS handling
 */

import { hclAuthService } from './hcl-commerce-auth.js';

class HCLCommerceAPI {
  constructor() {
    this.baseUrl = window.location.origin || 'http://localhost:3000';
    this.proxyPrefix = '/api/hcl';
  }

  /**
   * Make request to backend proxy
   */
  async request(method, endpoint, body = null) {
    const token = hclAuthService.getToken();
    if (!token) {
      throw new Error('Not authenticated - please login first');
    }

    const url = `${this.baseUrl}${this.proxyPrefix}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    // Add token and session cookies to request body
    if (body) {
      const requestBody = {
        ...body,
        accessToken: token,
      };
      
      // Get session cookies from auth service
      const sessionCookies = hclAuthService.getSessionCookies();
      console.log('[HCL-API] Session cookies from auth service:', {
        hasCookies: !!sessionCookies,
        keys: sessionCookies ? Object.keys(sessionCookies) : [],
        value: sessionCookies,
      });
      
      if (sessionCookies && Object.keys(sessionCookies).length > 0) {
        requestBody.sessionCookies = sessionCookies;
        console.log(`[HCL-API] ✓ Including ${Object.keys(sessionCookies).length} session cookies in request`);
      } else {
        console.warn('[HCL-API] ⚠ No session cookies available to include');
      }
      
      options.body = JSON.stringify(requestBody);
    } else if (method === 'GET') {
      const separator = endpoint.includes('?') ? '&' : '?';
      url = `${url}${separator}accessToken=${encodeURIComponent(token)}`;
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || `HTTP ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`HCL API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(partNumber, quantity = 1) {
    try {
      const result = await this.request('POST', '/cart/add', {
        partNumber,
        quantity,
      });

      return {
        success: true,
        cartId: result.cart?.orderId,
        itemCount: result.cart?.orderItems?.length || 0,
        cart: result.cart,
      };
    } catch (error) {
      throw {
        operation: 'addToCart',
        partNumber,
        quantity,
        error: error.message,
      };
    }
  }

  /**
   * Get current cart
   */
  async getCart() {
    try {
      const result = await this.request('GET', '/cart');

      return {
        success: true,
        cartId: result.cart?.orderId,
        items: result.cart?.orderItems || [],
        itemCount: (result.cart?.orderItems || []).length,
        cart: result.cart,
      };
    } catch (error) {
      throw {
        operation: 'getCart',
        error: error.message,
      };
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(orderId, itemId) {
    try {
      const result = await this.request(
        'DELETE',
        `/cart/item/${orderId}/${itemId}`
      );

      return {
        success: true,
        cartId: result.cart?.orderId,
        itemCount: result.cart?.orderItems?.length || 0,
        cart: result.cart,
      };
    } catch (error) {
      throw {
        operation: 'removeFromCart',
        orderId,
        itemId,
        error: error.message,
      };
    }
  }

  /**
   * Update item quantity
   */
  async updateCartItem(orderId, itemId, quantity) {
    try {
      const result = await this.request('PUT', '/cart/item', {
        orderId,
        itemId,
        quantity,
      });

      return {
        success: true,
        cartId: result.cart?.orderId,
        itemCount: result.cart?.orderItems?.length || 0,
        cart: result.cart,
      };
    } catch (error) {
      throw {
        operation: 'updateCartItem',
        orderId,
        itemId,
        quantity,
        error: error.message,
      };
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart() {
    try {
      const cart = await this.getCart();
      const items = cart.items || [];

      // Remove each item
      for (const item of items) {
        await this.removeFromCart(cart.cartId, item.orderItemId);
      }

      return {
        success: true,
        message: 'Cart cleared',
      };
    } catch (error) {
      throw {
        operation: 'clearCart',
        error: error.message,
      };
    }
  }

  /**
   * Get cart summary (for mini-cart)
   */
  async getCartSummary() {
    try {
      const result = await this.getCart();

      const summary = {
        itemCount: result.itemCount,
        cartId: result.cartId,
        items: (result.items || []).map((item) => ({
          id: item.orderItemId,
          partNumber: item.partNumber,
          quantity: item.quantity,
          name: item.productName || item.partNumber,
        })),
        subtotal: result.cart?.orderTotals?.subtotal || 0,
        tax: result.cart?.orderTotals?.tax || 0,
        shipping: result.cart?.orderTotals?.shipping || 0,
        total: result.cart?.orderTotals?.total || 0,
      };

      return summary;
    } catch (error) {
      throw {
        operation: 'getCartSummary',
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const hclCommerceAPI = new HCLCommerceAPI();

/**
 * React Hook for cart state
 * Usage:
 *   const [cart, loading, error] = useHCLCart();
 */
export function useHCLCart() {
  const [cart, setCart] = window.React?.useState(null) || [null];
  const [loading, setLoading] = window.React?.useState(false) || [false];
  const [error, setError] = window.React?.useState(null) || [null];

  const fetchCart = window.React?.useCallback?.(async () => {
    setLoading(true);
    try {
      const result = await hclCommerceAPI.getCart();
      setCart(result);
      setError(null);
    } catch (err) {
      setError(err.error || err.message);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = window.React?.useCallback?.(
    async (partNumber, quantity) => {
      try {
        await hclCommerceAPI.addToCart(partNumber, quantity);
        await fetchCart();
        return { success: true };
      } catch (err) {
        setError(err.error || err.message);
        return { success: false, error: err };
      }
    },
    [fetchCart]
  );

  const removeItem = window.React?.useCallback?.(
    async (orderId, itemId) => {
      try {
        await hclCommerceAPI.removeFromCart(orderId, itemId);
        await fetchCart();
        return { success: true };
      } catch (err) {
        setError(err.error || err.message);
        return { success: false, error: err };
      }
    },
    [fetchCart]
  );

  // Load cart on mount
  window.React?.useEffect?.(() => {
    fetchCart();
  }, [fetchCart]);

  return [cart, loading, error, { addItem, removeItem, fetchCart }];
}
