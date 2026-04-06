/**
 * Simple global cart state and listener system
 * Used as a fallback/supplement to cartStore for mini-cart updates
 */

let cartState = {
  items: [],
  total: 0,
};

const listeners = new Set();

export function updateCartState(newCart) {
  console.log('[SIMPLE-CART-STATE] Updating cart state:', newCart);
  cartState = {
    items: newCart.items || [],
    total: newCart.total || 0,
  };
  
  // Notify all listeners
  listeners.forEach(listener => {
    try {
      listener(cartState);
    } catch (error) {
      console.error('[SIMPLE-CART-STATE] Error calling listener:', error);
    }
  });
}

export function getCartState() {
  return cartState;
}

export function subscribeToCart(listener) {
  listeners.add(listener);
  console.log('[SIMPLE-CART-STATE] Listener added, total listeners:', listeners.size);
  
  // Return unsubscribe function
  return () => {
    listeners.delete(listener);
  };
}
