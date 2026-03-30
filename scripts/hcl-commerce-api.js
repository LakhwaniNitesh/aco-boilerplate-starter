/* eslint-disable no-console, no-unused-vars, no-shadow */
/**
 * HCL Commerce API - Direct Call Wrapper
 * Handles guest & authenticated sessions, tokens, API calls, and event management
 * POC Implementation: Direct browser calls to HCL (CORS handling required)
 *
 * This module provides:
 * - Session management (guest & authenticated users)
 * - Token caching (sessionStorage for POC)
 * - Add to cart, get cart, remove items
 * - Custom event system for cart updates
 * - Error handling & retry logic
 */

const HCL_API_HOST = '20.40.52.251';
const HCL_STORE_ID = '715842834';
const HCL_LANG_ID = '1';
const HCL_PROTOCOL = 'https';

// Session storage keys
const SESSION_KEYS = {
  WC_TOKEN: 'hcl_wctoken',
  WC_TRUSTED_TOKEN: 'hcl_wctrustedtoken',
  ORDER_ID: 'hcl_orderid',
  USER_TYPE: 'hcl_usertype', // 'guest' or 'authenticated'
  USER_ID: 'hcl_userid',
};

/**
 * HCL Session Manager
 * Handles token storage and retrieval for both guest and authenticated users
 */
export class HclSession {
  /**
   * Check if user is currently logged in
   */
  static isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEYS.USER_TYPE) === 'authenticated';
  }

  /**
   * Check if user is guest
   */
  static isGuest() {
    return sessionStorage.getItem(SESSION_KEYS.USER_TYPE) === 'guest';
  }

  /**
   * Check if valid session exists
   */
  static hasValidSession() {
    return !!(
      sessionStorage.getItem(SESSION_KEYS.WC_TOKEN)
      && sessionStorage.getItem(SESSION_KEYS.WC_TRUSTED_TOKEN)
    );
  }

  /**
   * Get stored token
   */
  static getToken() {
    return sessionStorage.getItem(SESSION_KEYS.WC_TOKEN);
  }

  /**
   * Get trusted token
   */
  static getTrustedToken() {
    return sessionStorage.getItem(SESSION_KEYS.WC_TRUSTED_TOKEN);
  }

  /**
   * Set tokens (from login or guest session creation)
   */
  static setToken(wcToken, wcTrustedToken, userType = 'guest', userId = null) {
    sessionStorage.setItem(SESSION_KEYS.WC_TOKEN, wcToken);
    sessionStorage.setItem(SESSION_KEYS.WC_TRUSTED_TOKEN, wcTrustedToken);
    sessionStorage.setItem(SESSION_KEYS.USER_TYPE, userType);
    if (userId) {
      sessionStorage.setItem(SESSION_KEYS.USER_ID, userId);
    }
  }

  /**
   * Get order ID from session
   */
  static getOrderId() {
    return sessionStorage.getItem(SESSION_KEYS.ORDER_ID);
  }

  /**
   * Set order ID
   */
  static setOrderId(orderId) {
    sessionStorage.setItem(SESSION_KEYS.ORDER_ID, orderId);
  }

  /**
   * Clear all session data
   */
  static clear() {
    Object.values(SESSION_KEYS).forEach((key) => {
      sessionStorage.removeItem(key);
    });
  }

  /**
   * Get user ID if authenticated
   */
  static getUserId() {
    return sessionStorage.getItem(SESSION_KEYS.USER_ID);
  }
}

/**
 * Create a guest session in HCL Commerce
 * Returns WCToken and WCTrustedToken needed for subsequent API calls
 *
 * @returns {Promise<Object>} { wcToken, wcTrustedToken }
 * @throws {Error} If guest session creation fails
 */
export async function createHclGuestSession() {
  try {
    const url = `${HCL_PROTOCOL}://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/guestidentity?langId=${HCL_LANG_ID}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies if any
    });

    if (!response.ok) {
      throw new Error(
        `Guest session creation failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (!data.WCToken || !data.WCTrustedToken) {
      throw new Error('Failed to retrieve tokens from HCL guest session response');
    }

    // Store tokens in session
    HclSession.setToken(data.WCToken, data.WCTrustedToken, 'guest');

    console.log('[HCL] Guest session created successfully');
    return {
      wcToken: data.WCToken,
      wcTrustedToken: data.WCTrustedToken,
    };
  } catch (error) {
    console.error('[HCL] Error creating guest session:', error);
    throw error;
  }
}

/**
 * Use existing authenticated user session
 * Call this when user is already logged in via Adobe Commerce
 *
 * @param {string} wcToken - Token from authentication
 * @param {string} wcTrustedToken - Trusted token from authentication
 * @param {string} userId - Authenticated user ID
 * @returns {void}
 */
export function setAuthenticatedSession(wcToken, wcTrustedToken, userId) {
  HclSession.setToken(wcToken, wcTrustedToken, 'authenticated', userId);
  console.log('[HCL] Authenticated session set for user:', userId);
}

/**
 * Add product to HCL cart using part number
 * Supports both guest and authenticated users
 *
 * @param {string} partNumber - Product part number (e.g., "CLA022_220601")
 * @param {number} quantity - Quantity to add (default: 1)
 * @param {Object} options - Additional options
 * @param {boolean} options.validateInventory - Check inventory (default: true)
 * @param {boolean} options.calculateOrder - Calculate order totals (default: false)
 * @returns {Promise<Object>} { success, orderId, orderItemId, data }
 * @throws {Error} If add to cart fails
 */
export async function addToHclCart(partNumber, quantity = 1, options = {}) {
  const {
    validateInventory = true,
    calculateOrder = false,
  } = options;

  try {
    // Ensure session exists
    if (!HclSession.hasValidSession()) {
      console.log('[HCL] No valid session, creating guest session...');
      await createHclGuestSession();
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const url = `${HCL_PROTOCOL}://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart?langId=${HCL_LANG_ID}`;

    const requestBody = {
      orderId: '.',
      x_calculateOrder: calculateOrder ? '1' : '0',
      orderItem: [
        {
          quantity: String(quantity),
          partNumber,
        },
      ],
      x_inventoryValidation: validateInventory,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        WCToken: wcToken,
        WCTrustedToken: wcTrustedToken,
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    // Handle session expiration (403)
    if (response.status === 403) {
      console.warn('[HCL] Session expired (403), refreshing session...');
      HclSession.clear();

      if (HclSession.isLoggedIn()) {
        throw new Error('Authenticated session expired. Please log in again.');
      }

      // Retry with new guest session
      await createHclGuestSession();
      return addToHclCart(partNumber, quantity, options);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to add to cart: ${response.status} ${response.statusText}`,
      );
    }

    const cartData = await response.json();

    // Store order ID for later use
    if (cartData.orderId) {
      HclSession.setOrderId(cartData.orderId);
    }

    console.log('[HCL] Product added to cart:', {
      orderId: cartData.orderId,
      orderItemId: cartData.orderItem[0]?.orderItemId,
      partNumber,
    });

    emitCartEvent('itemAdded', {
      partNumber,
      quantity,
      orderItemId: cartData.orderItem[0]?.orderItemId,
      orderId: cartData.orderId,
    });

    return {
      success: true,
      orderId: cartData.orderId,
      orderItemId: cartData.orderItem[0]?.orderItemId,
      data: cartData,
    };
  } catch (error) {
    console.error('[HCL] Error adding to cart:', error);
    emitCartEvent('error', {
      action: 'addToCart',
      error: error.message,
    });
    throw error;
  }
}

/**
 * Add product to cart using product ID instead of part number
 * Some products may only have product ID available
 *
 * @param {string} productId - HCL product ID
 * @param {number} quantity - Quantity to add
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} { success, orderId, orderItemId, data }
 */
export async function addToHclCartByProductId(productId, quantity = 1, options = {}) {
  try {
    // Ensure session exists
    if (!HclSession.hasValidSession()) {
      await createHclGuestSession();
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const url = `${HCL_PROTOCOL}://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart?langId=${HCL_LANG_ID}`;

    const requestBody = {
      orderId: '.',
      x_calculateOrder: '0',
      orderItem: [
        {
          quantity: String(quantity),
          productId,
        },
      ],
      x_inventoryValidation: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        WCToken: wcToken,
        WCTrustedToken: wcTrustedToken,
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (response.status === 403) {
      HclSession.clear();
      if (HclSession.isLoggedIn()) {
        throw new Error('Authenticated session expired. Please log in again.');
      }
      await createHclGuestSession();
      return addToHclCartByProductId(productId, quantity, options);
    }

    if (!response.ok) {
      throw new Error(`Failed to add to cart: ${response.status}`);
    }

    const cartData = await response.json();

    if (cartData.orderId) {
      HclSession.setOrderId(cartData.orderId);
    }

    emitCartEvent('itemAdded', {
      productId,
      quantity,
      orderItemId: cartData.orderItem[0]?.orderItemId,
      orderId: cartData.orderId,
    });

    return {
      success: true,
      orderId: cartData.orderId,
      orderItemId: cartData.orderItem[0]?.orderItemId,
      data: cartData,
    };
  } catch (error) {
    console.error('[HCL] Error adding to cart by product ID:', error);
    emitCartEvent('error', {
      action: 'addToCart',
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get current HCL cart for authenticated user or guest
 * Returns full cart data including items, totals, payment info, etc.
 *
 * @returns {Promise<Object>} Transformed cart data or empty cart
 */
export async function getHclCart() {
  try {
    // If no session, return empty cart
    if (!HclSession.hasValidSession()) {
      return {
        success: true,
        items: [],
        cartTotals: {
          itemCount: 0,
          subtotal: '0.00',
          shippingCharge: '0.00',
          salesTax: '0.00',
          grandTotal: '0.00',
          currency: 'USD',
        },
      };
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const url = `${HCL_PROTOCOL}://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart/@self?langId=${HCL_LANG_ID}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        WCToken: wcToken,
        WCTrustedToken: wcTrustedToken,
      },
      credentials: 'include',
    });

    // Handle session expiration
    if (response.status === 403) {
      console.warn('[HCL] Session expired when fetching cart');
      HclSession.clear();
      return {
        success: true,
        items: [],
        cartTotals: {
          itemCount: 0,
          subtotal: '0.00',
          grandTotal: '0.00',
          currency: 'USD',
        },
      };
    }

    if (!response.ok) {
      throw new Error(`Failed to get cart: ${response.status}`);
    }

    const cartData = await response.json();

    // Transform HCL response to standardized format
    return {
      success: true,
      orderId: cartData.orderId,
      buyerId: cartData.buyerId,
      items: (cartData.orderItem || []).map((item) => ({
        orderItemId: item.orderItemId,
        partNumber: item.partNumber,
        productId: item.productId,
        productName:
          item.description || item.partNumber || `Product ${item.productId}`,
        quantity: parseFloat(item.quantity),
        unitPrice: item.unitPrice,
        orderItemPrice: item.orderItemPrice,
        orderItemInventoryStatus: item.orderItemInventoryStatus,
        shippingCharge: item.shippingCharge || '0.00',
        salesTax: item.salesTax || '0.00',
        currency: item.currency || 'USD',
      })),
      cartTotals: {
        itemCount: cartData.orderItem ? cartData.orderItem.length : 0,
        subtotal: cartData.totalProductPrice || '0.00',
        shippingCharge: cartData.totalShippingCharge || '0.00',
        salesTax: cartData.totalSalesTax || '0.00',
        grandTotal: cartData.grandTotal || '0.00',
        currency: cartData.totalProductPriceCurrency || 'USD',
      },
      rawData: cartData, // Include raw response for debugging
    };
  } catch (error) {
    console.error('[HCL] Error fetching cart:', error);
    emitCartEvent('error', {
      action: 'getCart',
      error: error.message,
    });
    return {
      success: false,
      error: error.message,
      items: [],
      cartTotals: {
        itemCount: 0,
        subtotal: '0.00',
        grandTotal: '0.00',
        currency: 'USD',
      },
    };
  }
}

/**
 * Remove item from HCL cart
 *
 * @param {string} orderItemId - Order item ID to remove
 * @returns {Promise<Object>} Updated cart data
 */
export async function removeFromHclCart(orderItemId) {
  try {
    if (!HclSession.hasValidSession()) {
      throw new Error('No active session');
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const url = `${HCL_PROTOCOL}://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart/@self/orderitem/${orderItemId}?langId=${HCL_LANG_ID}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        WCToken: wcToken,
        WCTrustedToken: wcTrustedToken,
      },
      credentials: 'include',
    });

    if (response.status === 403) {
      HclSession.clear();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(`Failed to remove item: ${response.status}`);
    }

    console.log('[HCL] Item removed from cart:', orderItemId);
    emitCartEvent('itemRemoved', { orderItemId });

    // Get updated cart
    return getHclCart();
  } catch (error) {
    console.error('[HCL] Error removing from cart:', error);
    emitCartEvent('error', {
      action: 'removeFromCart',
      error: error.message,
    });
    throw error;
  }
}

/**
 * Update order item quantity
 *
 * @param {string} orderItemId - Order item ID to update
 * @param {number} quantity - New quantity
 * @returns {Promise<Object>} Updated cart data
 */
export async function updateHclCartItemQuantity(orderItemId, quantity) {
  try {
    if (!HclSession.hasValidSession()) {
      throw new Error('No active session');
    }

    const wcToken = HclSession.getToken();
    const wcTrustedToken = HclSession.getTrustedToken();

    const url = `${HCL_PROTOCOL}://${HCL_API_HOST}/wcs/resources/store/${HCL_STORE_ID}/cart/@self/orderitem/${orderItemId}?langId=${HCL_LANG_ID}`;

    const requestBody = {
      quantity: String(quantity),
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        WCToken: wcToken,
        WCTrustedToken: wcTrustedToken,
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });

    if (response.status === 403) {
      HclSession.clear();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(`Failed to update item quantity: ${response.status}`);
    }

    console.log('[HCL] Item quantity updated:', { orderItemId, quantity });
    emitCartEvent('itemUpdated', { orderItemId, quantity });

    return getHclCart();
  } catch (error) {
    console.error('[HCL] Error updating item quantity:', error);
    emitCartEvent('error', {
      action: 'updateQuantity',
      error: error.message,
    });
    throw error;
  }
}

/**
 * Format price for display
 * @param {string|number} price - Price to format
 * @returns {string} Formatted price (e.g., "$45.00")
 */
export function formatPrice(price) {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Custom event system for cart updates
 * Allows components to listen for cart changes
 *
 * Supported events:
 * - hcl:itemAdded
 * - hcl:itemRemoved
 * - hcl:itemUpdated
 * - hcl:cartUpdated
 * - hcl:error
 */

/**
 * Emit HCL-specific event
 * @param {string} eventName - Event name (without 'hcl:' prefix)
 * @param {Object} detail - Event detail data
 */
export function emitCartEvent(eventName, detail) {
  const event = new CustomEvent(`hcl:${eventName}`, {
    detail,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  console.log(`[HCL Event] ${eventName}:`, detail);
}

/**
 * Listen for HCL cart events
 * @param {string} eventName - Event name (without 'hcl:' prefix)
 * @param {Function} callback - Callback function(detail)
 * @returns {Function} Cleanup function to remove listener
 */
export function onCartEvent(eventName, callback) {
  const listener = (event) => {
    callback(event.detail);
  };
  document.addEventListener(`hcl:${eventName}`, listener);

  // Return cleanup function
  return () => {
    document.removeEventListener(`hcl:${eventName}`, listener);
  };
}

/**
 * Convenience: Listen for any HCL event (for debugging)
 * @param {Function} callback - Callback for all events
 * @returns {Function} Cleanup function
 */
export function onAnyCartEvent(callback) {
  const listener = (event) => {
    if (event.type.startsWith('hcl:')) {
      callback(event.type.replace('hcl:', ''), event.detail);
    }
  };
  document.addEventListener('hcl:itemAdded', listener);
  document.addEventListener('hcl:itemRemoved', listener);
  document.addEventListener('hcl:itemUpdated', listener);
  document.addEventListener('hcl:cartUpdated', listener);
  document.addEventListener('hcl:error', listener);

  return () => {
    document.removeEventListener('hcl:itemAdded', listener);
    document.removeEventListener('hcl:itemRemoved', listener);
    document.removeEventListener('hcl:itemUpdated', listener);
    document.removeEventListener('hcl:cartUpdated', listener);
    document.removeEventListener('hcl:error', listener);
  };
}
