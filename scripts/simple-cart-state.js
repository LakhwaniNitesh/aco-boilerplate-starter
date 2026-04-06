/**
 * Simple global cart state and listener system
 * Syncs with HCL Commerce as single source of truth
 * No localStorage persistence - session-only like Adobe Commerce drop-ins
 */

let cartState = {
  cartId: null,
  items: [],
  total: 0,
};

const listeners = new Set();

/**
 * Update cart state from HCL Commerce response
 * Called after every API operation (add, remove, update)
 */
export function updateCartState(newCart) {
  console.log('[CART-STATE] Updating from HCL Commerce:', newCart);
  
  cartState = {
    cartId: newCart.cartId || null,
    items: (newCart.items || []).map(item => ({
      partNumber: item.partNumber || '',
      sku: item.sku || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      name: item.name || 'Product',
      orderItemId: item.orderItemId || null,
    })),
    total: newCart.total || 0,
  };

  console.log(`[CART-STATE] Updated in memory: ${cartState.items.length} items, Total: $${cartState.total.toFixed(2)}`);

  // Notify all listeners (mini-cart, cart page, etc.)
  listeners.forEach(listener => {
    try {
      listener(cartState);
    } catch (error) {
      console.error('[CART-STATE] Error calling listener:', error);
    }
  });
}

/**
 * Get current cart state from memory
 */
export function getCartState() {
  return cartState;
}

/**
 * Subscribe to cart state changes
 * Returns unsubscribe function
 */
export function subscribeToCart(listener) {
  listeners.add(listener);
  console.log(`[CART-STATE] Listener added, total listeners: ${listeners.size}`);

  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
    console.log(`[CART-STATE] Listener removed, total listeners: ${listeners.size}`);
  };
}

/**
 * Fetch cart from HCL Commerce via backend proxy
 * Used on page load to sync with HCL Commerce
 */
export async function fetchCartFromHCL(accessToken) {
  try {
    console.log('[CART-STATE] Fetching cart from HCL via backend proxy...');
    
    const response = await fetch(`/api/hcl/cart?accessToken=${encodeURIComponent(accessToken)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.cart) {
      updateCartState(data.cart);
      return data.cart;
    } else {
      throw new Error(data.error || 'Failed to fetch cart');
    }
  } catch (error) {
    console.error('[CART-STATE] Error fetching cart from HCL:', error.message);
    throw error;
  }
}

/**
 * Clear cart state (for logout or explicit clear)
 */
export function clearCartState() {
  console.log('[CART-STATE] Clearing cart state');
  updateCartState({ cartId: null, items: [], total: 0 });
}
