/**
 * HCL Commerce Mini-Cart Integration
 * Updates the mini-cart to display HCL cart data
 */

import {
  getHclCart,
  onCartEvent,
  formatPrice,
  HclSession,
} from './hcl-commerce-api.js';

/**
 * Initialize HCL mini-cart integration
 * Replaces standard drop-in cart with HCL data
 */
export async function initializeHclMiniCartIntegration(miniCartBlock) {
  if (!miniCartBlock) {
    console.log('[HCL Mini-Cart] No mini-cart block provided');
    return;
  }

  console.log('[HCL Mini-Cart] Initializing HCL mini-cart integration');

  // Wait for drop-ins to initialize
  setTimeout(() => {
    setupMiniCartObserver(miniCartBlock);
  }, 500);
}

/**
 * Set up observer to update mini-cart when cart changes
 */
function setupMiniCartObserver(miniCartBlock) {
  // Listen to HCL cart events
  const unsubscribeAdded = onCartEvent('itemAdded', () => {
    console.log('[HCL Mini-Cart] Item added, updating cart');
    updateMiniCartDisplay(miniCartBlock);
  });

  const unsubscribeRemoved = onCartEvent('itemRemoved', () => {
    console.log('[HCL Mini-Cart] Item removed, updating cart');
    updateMiniCartDisplay(miniCartBlock);
  });

  const unsubscribeUpdated = onCartEvent('itemUpdated', () => {
    console.log('[HCL Mini-Cart] Item updated, refreshing cart');
    updateMiniCartDisplay(miniCartBlock);
  });

  // Initial load
  updateMiniCartDisplay(miniCartBlock);

  // Cleanup function
  window._hclMiniCartCleanup = () => {
    unsubscribeAdded();
    unsubscribeRemoved();
    unsubscribeUpdated();
  };
}

/**
 * Update mini-cart display with HCL cart data
 */
async function updateMiniCartDisplay(miniCartBlock) {
  try {
    // Get HCL cart data
    const cartData = await getHclCart();

    if (!cartData.success) {
      console.warn('[HCL Mini-Cart] Could not fetch cart:', cartData.error);
      return;
    }

    // Update cart count badge
    const badgeElement = miniCartBlock.querySelector('[class*="badge"], [class*="count"]');
    if (badgeElement) {
      badgeElement.textContent = cartData.cartTotals.itemCount;
    }

    // Update cart subtotal
    const subtotalElement = miniCartBlock.querySelector('[class*="subtotal"], [class*="total"]');
    if (subtotalElement) {
      subtotalElement.textContent = formatPrice(cartData.cartTotals.grandTotal);
    }

    // Update items list if visible
    const itemsContainer = miniCartBlock.querySelector('[class*="items"], [class*="cart-items"]');
    if (itemsContainer && isCartOpen(miniCartBlock)) {
      renderMiniCartItems(itemsContainer, cartData.items);
    }

    console.log('[HCL Mini-Cart] Cart updated:', {
      itemCount: cartData.cartTotals.itemCount,
      total: cartData.cartTotals.grandTotal,
    });
  } catch (error) {
    console.error('[HCL Mini-Cart] Error updating cart:', error);
  }
}

/**
 * Render cart items in mini-cart
 */
function renderMiniCartItems(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<p class="hcl-mini-cart__empty">Your cart is empty</p>';
    return;
  }

  const itemsHtml = items
    .map((item) => `
    <div class="hcl-mini-cart__item">
      <div class="hcl-mini-cart__item-info">
        <p class="hcl-mini-cart__item-name">${item.productName}</p>
        <p class="hcl-mini-cart__item-sku">${item.partNumber}</p>
      </div>
      <div class="hcl-mini-cart__item-details">
        <p class="hcl-mini-cart__item-qty">Qty: ${item.quantity}</p>
        <p class="hcl-mini-cart__item-price">${formatPrice(item.orderItemPrice)}</p>
      </div>
    </div>
  `)
    .join('');

  container.innerHTML = itemsHtml;
}

/**
 * Check if mini-cart is open/visible
 */
function isCartOpen(miniCartBlock) {
  const dropdown = miniCartBlock.querySelector('[class*="dropdown"], [class*="menu"]');
  if (!dropdown) return false;

  const isVisible = dropdown.getAttribute('aria-hidden') !== 'true'
    && dropdown.style.display !== 'none';

  return isVisible;
}

export default {
  initializeHclMiniCartIntegration,
  updateMiniCartDisplay,
};
