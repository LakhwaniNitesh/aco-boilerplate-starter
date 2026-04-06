/**
 * Simple global cart state and listener system
 * Used as a fallback/supplement to cartStore for mini-cart updates
 */

let cartState = {
  items: [],
  total: 0,
};

// Initialize from localStorage if available
function initializeCartState() {
  try {
    const storedCart = localStorage.getItem('hcl-cart');
    if (storedCart) {
      const parsed = JSON.parse(storedCart);
      cartState = {
        items: parsed.items || [],
        total: parsed.total || 0,
      };
      console.log('[SIMPLE-CART-STATE] Initialized from localStorage:', cartState);
    }
  } catch (err) {
    console.warn('[SIMPLE-CART-STATE] Could not load cart from localStorage:', err);
  }
}

initializeCartState();

const listeners = new Set();

export function updateCartState(newCart) {
  console.log('[SIMPLE-CART-STATE] Updating cart state:', newCart);
  cartState = {
    items: newCart.items || [],
    total: newCart.total || 0,
  };
  
  // Persist to localStorage for recovery on page reload
  try {
    const cartJson = JSON.stringify(cartState);
    console.log('[SIMPLE-CART-STATE] Persisting to localStorage:', cartJson);
    localStorage.setItem('hcl-cart', cartJson);
    
    // Verify it was actually saved
    const verify = localStorage.getItem('hcl-cart');
    console.log('[SIMPLE-CART-STATE] Verified in localStorage:', verify);
  } catch (err) {
    console.warn('[SIMPLE-CART-STATE] Could not persist cart to localStorage:', err);
  }
  
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
