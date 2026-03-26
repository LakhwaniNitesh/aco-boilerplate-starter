/**
 * HCL Commerce API - Direct Call Wrapper
 * Handles CORS, self-signed certificates, WCToken management
 * 
 * This module provides an interface to interact with HCL Commerce APIs directly
 * from the storefront for POC purposes.
 * 
 * @module hcl-commerce-api
 */

const HCL_API_HOST = '20.40.52.251';
const HCL_STORE_ID = '715842834';
const HCL_LANG_ID = '1';
const HCL_PROTOCOL = 'https';

/**
 * HCL Session Management
 * Stores authentication tokens for the current session
 */
class HclSession {
  static getToken() {
    return sessionStorage.getItem('hcl_wctoken');
  }

  static setToken(wcToken, wcTrustedToken) {
    sessionStorage.setItem('hcl_wctoken', wcToken);
    sessionStorage.setItem('hcl_wctrustedtoken', wcTrustedToken);
  }

  static getTrustedToken() {
    return sessionStorage.getItem('hcl_wctrustedtoken');
  }

  static getOrderId() {
    return sessionStorage.getItem('hcl_order_id');
  }

  static setOrderId(orderId) {
    sessionStorage.setItem('hcl_order_id', orderId);
  }

  static clear() {
    sessionStorage.removeItem('hcl_wctoken');
    sessionStorage.removeItem('hcl_wctrustedtoken');
    sessionStorage.removeItem('hcl_order_id');
  }

  static isValid() {
    return !!(this.getToken() && this.getTrustedToken());
  }
}

/**
 * Make an authenticated request to HCL Commerce API
 * @private
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function makeHclRequest(endpoint, options = {}) {
  const wcToken = HclSession.getToken();
  const wcTrustedToken = HclSession.getTrustedToken();

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  if (wcToken) {
    defaultHeaders.WCToken = wcToken;
  }

  if (wcTrustedToken) {
    defaultHeaders.WCTrustedToken = wcTrustedToken;
  }

  const url = `${HCL_PROTOCOL}://${HCL_API_HOST}${endpoint}`;

  console.log(`[HCL API] ${options.method || 'GET'} ${endpoint}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    });

    return response;
  } catch (error) {
    console.error(`[HCL API] Request error: ${error.message}`);
    throw error;
  }
}

/**
 * Create a guest session in HCL Commerce
 * Must be called before making any cart operations
 * 
 * @returns {Promise<Object>} Session data with WCToken and WCTrustedToken
 * @throws {Error} If session creation fails
 */
export async function createHclGuestSession() {
  try {
    const endpoint = `/wcs/resources/store/${HCL_STORE_ID}/guestidentity?langId=${HCL_LANG_ID}`;
    const response = await makeHclRequest(endpoint, {
      method: 'POST',
    });

    if (response.status === 403 || response.status === 401) {
      throw new Error('Failed to authenticate with HCL Commerce');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to create HCL guest session: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.WCToken && data.WCTrustedToken) {
      HclSession.setToken(data.WCToken, data.WCTrustedToken);
      if (data.orderId) {
        HclSession.setOrderId(data.orderId);
      }
      console.log('[HCL API] Guest session created successfully');
      emitEvent('sessionCreated', { orderId: data.orderId });
      return data;
    } else {
      throw new Error('Failed to get tokens from HCL response');
    }
  } catch (error) {
    console.error('[HCL API] Error creating guest session:', error);
    emitEvent('sessionError', { error: error.message });
    throw error;
  }
}

/**
 * Add product to HCL cart using part number
 * 
 * @param {string} partNumber - Product part number (e.g., "CLA022_220601")
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Promise<Object>} Response with orderId and orderItemId
 * @throws {Error} If add to cart fails
 */
export async function addToHclCart(partNumber, quantity = 1) {
  try {
    // Ensure session exists
    if (!HclSession.isValid()) {
      await createHclGuestSession();
    }

    const endpoint = `/wcs/resources/store/${HCL_STORE_ID}/cart?langId=${HCL_LANG_ID}`;
    const body = {
      orderId: '.',
      x_calculateOrder: '0',
      orderItem: [
        {
          quantity: String(quantity),
          partNumber: partNumber,
        },
      ],
      x_inventoryValidation: true,
    };

    const response = await makeHclRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Handle 403 - session might have expired
    if (response.status === 403) {
      console.warn('[HCL API] Session expired, creating new session...');
      HclSession.clear();
      await createHclGuestSession();
      // Retry the request
      return addToHclCart(partNumber, quantity);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to add to cart: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.orderId) {
      HclSession.setOrderId(data.orderId);
    }

    const result = {
      success: true,
      orderId: data.orderId,
      orderItemId: data.orderItem?.[0]?.orderItemId,
      partNumber,
      quantity,
      raw: data,
    };

    console.log('[HCL API] Product added to cart:', result);
    emitEvent('itemAdded', { partNumber, quantity, orderId: data.orderId });

    return result;
  } catch (error) {
    console.error('[HCL API] Error adding to cart:', error);
    emitEvent('cartError', { error: error.message, partNumber });
    throw error;
  }
}

/**
 * Add product to HCL cart using product ID
 * 
 * @param {string} productId - HCL Product ID
 * @param {number} quantity - Quantity to add (default: 1)
 * @returns {Promise<Object>} Response with orderId and orderItemId
 */
export async function addToHclCartByProductId(productId, quantity = 1) {
  try {
    if (!HclSession.isValid()) {
      await createHclGuestSession();
    }

    const endpoint = `/wcs/resources/store/${HCL_STORE_ID}/cart?langId=${HCL_LANG_ID}`;
    const body = {
      orderId: '.',
      x_calculateOrder: '0',
      orderItem: [
        {
          quantity: String(quantity),
          productId: productId,
        },
      ],
      x_inventoryValidation: true,
    };

    const response = await makeHclRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (response.status === 403) {
      HclSession.clear();
      await createHclGuestSession();
      return addToHclCartByProductId(productId, quantity);
    }

    if (!response.ok) {
      throw new Error(`Failed to add to cart: ${response.status}`);
    }

    const data = await response.json();

    if (data.orderId) {
      HclSession.setOrderId(data.orderId);
    }

    const result = {
      success: true,
      orderId: data.orderId,
      orderItemId: data.orderItem?.[0]?.orderItemId,
      productId,
      quantity,
      raw: data,
    };

    console.log('[HCL API] Product added to cart:', result);
    emitEvent('itemAdded', { productId, quantity, orderId: data.orderId });

    return result;
  } catch (error) {
    console.error('[HCL API] Error adding to cart by product ID:', error);
    throw error;
  }
}

/**
 * Get current HCL cart
 * 
 * @returns {Promise<Object>} Full cart data with items and totals
 */
export async function getHclCart() {
  try {
    // If no session, return empty cart
    if (!HclSession.isValid()) {
      return {
        success: true,
        orderId: null,
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

    const endpoint = `/wcs/resources/store/${HCL_STORE_ID}/cart/@self?langId=${HCL_LANG_ID}`;
    const response = await makeHclRequest(endpoint, {
      method: 'GET',
    });

    if (response.status === 403) {
      console.warn('[HCL API] Session expired, clearing...');
      HclSession.clear();
      return {
        success: true,
        orderId: null,
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

    if (!response.ok) {
      throw new Error(`Failed to get cart: ${response.status}`);
    }

    const cartData = await response.json();

    // Update order ID in session
    if (cartData.orderId) {
      HclSession.setOrderId(cartData.orderId);
    }

    // Transform HCL response to our standardized format
    const transformedCart = {
      success: true,
      orderId: cartData.orderId,
      items: (cartData.orderItem || []).map((item) => ({
        orderItemId: item.orderItemId,
        partNumber: item.partNumber || '',
        productId: item.productId || '',
        productName: item.productName || item.partNumber || `Product ${item.productId}`,
        quantity: parseFloat(item.quantity || 0),
        unitPrice: item.unitPrice || '0.00',
        orderItemPrice: item.orderItemPrice || '0.00',
        orderItemInventoryStatus: item.orderItemInventoryStatus || 'Unknown',
        currency: item.currency || 'USD',
        shipModeCode: item.shipModeCode || '',
      })),
      cartTotals: {
        itemCount: cartData.orderItem ? cartData.orderItem.length : 0,
        subtotal: cartData.totalProductPrice || '0.00',
        shippingCharge: cartData.totalShippingCharge || '0.00',
        salesTax: cartData.totalSalesTax || '0.00',
        grandTotal: cartData.grandTotal || '0.00',
        currency: cartData.totalProductPriceCurrency || 'USD',
      },
      raw: cartData,
    };

    console.log('[HCL API] Cart retrieved:', transformedCart);
    return transformedCart;
  } catch (error) {
    console.error('[HCL API] Error fetching cart:', error);
    emitEvent('cartError', { error: error.message });
    // Return empty cart on error to prevent UI breaking
    return {
      success: false,
      error: error.message,
      orderId: null,
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
}

/**
 * Update order item (used for checkout transitions)
 * 
 * @param {string} orderItemId - Order item ID to update
 * @returns {Promise<Object>} Updated order item data
 */
export async function updateHclOrderItem(orderItemId) {
  try {
    if (!HclSession.isValid()) {
      throw new Error('No active HCL session');
    }

    const endpoint = `/wcs/resources/store/${HCL_STORE_ID}/cart/@self/update_order_item?langId=${HCL_LANG_ID}`;
    const body = {
      x_remerge: '***',
      x_check: '*n',
      x_allocate: '***',
      x_backorder: '***',
      x_calculationUsage: '-1,-2,-3,-4,-5,-6,-7',
      x_calculateOrder: '1',
      orderId: '.',
      x_isCheckout: 'true',
      orderItem: [
        {
          orderItemId: orderItemId,
        },
      ],
    };

    const response = await makeHclRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to update order item: ${response.status}`);
    }

    const data = await response.json();
    console.log('[HCL API] Order item updated:', data);
    emitEvent('orderItemUpdated', { orderItemId });

    return {
      success: true,
      orderId: data.orderId,
      orderItemId: data.orderItem?.[0]?.orderItemId,
      raw: data,
    };
  } catch (error) {
    console.error('[HCL API] Error updating order item:', error);
    throw error;
  }
}

/**
 * Remove item from cart
 * 
 * @param {string} orderItemId - Order item ID to remove
 * @returns {Promise<Object>} Updated cart data
 */
export async function removeFromHclCart(orderItemId) {
  try {
    if (!HclSession.isValid()) {
      throw new Error('No active HCL session');
    }

    const endpoint = `/wcs/resources/store/${HCL_STORE_ID}/cart/@self/orderitem/${orderItemId}?langId=${HCL_LANG_ID}`;
    const response = await makeHclRequest(endpoint, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to remove item: ${response.status}`);
    }

    console.log('[HCL API] Item removed from cart:', orderItemId);
    emitEvent('itemRemoved', { orderItemId });

    // Return updated cart
    return getHclCart();
  } catch (error) {
    console.error('[HCL API] Error removing from cart:', error);
    throw error;
  }
}

/**
 * Validate product availability
 * Checks if product exists and is in stock
 * 
 * @param {string} partNumber - Product part number
 * @returns {Promise<Object>} Availability data
 */
export async function checkProductAvailability(partNumber) {
  try {
    // This would typically call a product details/availability API
    // For now, we'll rely on the inventory validation in addToHclCart
    // But you could implement a dedicated endpoint here
    
    console.log('[HCL API] Checking availability for:', partNumber);
    // Placeholder - implement based on HCL product availability API
    return {
      success: true,
      available: true,
      partNumber,
    };
  } catch (error) {
    console.error('[HCL API] Error checking availability:', error);
    return {
      success: false,
      available: false,
      error: error.message,
    };
  }
}

/**
 * Format price for display
 * 
 * @param {string|number} price - Price value
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted price string
 */
export function formatPrice(price, currency = 'USD') {
  const amount = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(amount)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Emit custom event for cart updates
 * @private
 * 
 * @param {string} eventName - Event name
 * @param {object} detail - Event detail data
 */
function emitEvent(eventName, detail) {
  const event = new CustomEvent(`hcl:${eventName}`, { detail });
  document.dispatchEvent(event);
  console.log(`[HCL Event] ${eventName}:`, detail);
}

/**
 * Listen for HCL cart events
 * 
 * @param {string} eventName - Event name to listen for
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export function onCartEvent(eventName, callback) {
  const listener = (event) => {
    try {
      callback(event.detail);
    } catch (error) {
      console.error(`[HCL Event] Error in listener for ${eventName}:`, error);
    }
  };

  document.addEventListener(`hcl:${eventName}`, listener);

  // Return unsubscribe function
  return () => {
    document.removeEventListener(`hcl:${eventName}`, listener);
  };
}

/**
 * Get current session status
 * 
 * @returns {Object} Session status information
 */
export function getSessionStatus() {
  return {
    isValid: HclSession.isValid(),
    orderId: HclSession.getOrderId(),
    hasToken: !!HclSession.getToken(),
    hasTrustedToken: !!HclSession.getTrustedToken(),
  };
}

/**
 * Clear HCL session
 */
export function clearHclSession() {
  HclSession.clear();
  console.log('[HCL API] Session cleared');
  emitEvent('sessionCleared', {});
}

/**
 * Initialize HCL Commerce integration
 * Call this once when the storefront loads
 */
export async function initializeHclCommerce() {
  try {
    console.log('[HCL API] Initializing HCL Commerce integration...');
    
    // Check if we already have a valid session
    if (HclSession.isValid()) {
      console.log('[HCL API] Valid session found, skipping initialization');
      return;
    }

    // Create a guest session
    await createHclGuestSession();
    console.log('[HCL API] HCL Commerce initialization complete');
  } catch (error) {
    console.warn('[HCL API] Failed to initialize HCL Commerce:', error.message);
    // Don't throw - initialization failure shouldn't break the page
  }
}
