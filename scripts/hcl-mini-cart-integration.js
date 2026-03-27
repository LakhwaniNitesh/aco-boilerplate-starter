/**
 * HCL Commerce Mini-Cart Integration
 * Displays real-time cart data from HCL Commerce
 */

import {
  getHclCart, onCartEvent, formatPrice, getSessionStatus,
} from '../../scripts/hcl-commerce-api.js';

/**
 * Initialize HCL mini-cart integration
 * Updates the mini-cart to show HCL Commerce cart data
 *
 * @param {HTMLElement} block - Mini-cart block element
 * @returns {Promise<void>}
 */
export async function initializeHclMiniCart(block) {
  console.log('[HCL Mini-Cart] Initializing...');

  const cartBadge = block.querySelector('.commerce-mini-cart__badge');
  const cartItemsContainer = block.querySelector('.commerce-mini-cart__items');
  const cartTotalElement = block.querySelector('.commerce-mini-cart__total');

  if (!cartBadge || !cartItemsContainer || !cartTotalElement) {
    console.warn('[HCL Mini-Cart] Required elements not found');
    return;
  }

  /**
   * Update mini-cart display with current HCL cart
   */
  const updateMiniCart = async () => {
    try {
      const cartData = await getHclCart();

      if (!cartData.success || !cartData.items || cartData.items.length === 0) {
        cartBadge.textContent = '0';
        cartItemsContainer.innerHTML = '<p class="commerce-mini-cart__empty">Cart is empty</p>';
        cartTotalElement.textContent = '$0.00';
        return;
      }

      // Update badge with item count
      cartBadge.textContent = cartData.cartTotals.itemCount;

      // Render cart items
      const itemsHtml = cartData.items
        .map((item) => {
          const itemTotal = formatPrice(parseFloat(item.orderItemPrice || 0));
          const unitPrice = formatPrice(parseFloat(item.unitPrice || 0));
          return `
        <div class="commerce-mini-cart__item">
          <div class="commerce-mini-cart__item-header">
            <span class="commerce-mini-cart__item-name">${escapeHtml(item.productName || item.partNumber)}</span>
            <span class="commerce-mini-cart__item-price">${itemTotal}</span>
          </div>
          <div class="commerce-mini-cart__item-details">
            <span class="commerce-mini-cart__item-qty">Qty: ${item.quantity}</span>
            <span class="commerce-mini-cart__item-unit-price">@ ${unitPrice} each</span>
          </div>
          <div class="commerce-mini-cart__item-status">
            <span class="commerce-mini-cart__item-status-badge ${getStatusClass(item.orderItemInventoryStatus)}">
              ${item.orderItemInventoryStatus}
            </span>
          </div>
        </div>
      `;
        })
        .join('');

      cartItemsContainer.innerHTML = itemsHtml;

      // Update total
      cartTotalElement.textContent = formatPrice(cartData.cartTotals.grandTotal);

      console.log('[HCL Mini-Cart] Updated with', cartData.items.length, 'items');
    } catch (error) {
      console.error('[HCL Mini-Cart] Error updating cart:', error);
      cartItemsContainer.innerHTML = '<p class="commerce-mini-cart__error">Error loading cart</p>';
    }
  };

  // Initial update
  await updateMiniCart();

  // Listen for HCL cart events
  const unsubscribe = onCartEvent('itemAdded', () => {
    console.log('[HCL Mini-Cart] Item added, updating...');
    updateMiniCart();
  });

  // Also listen for cart removal and updates
  onCartEvent('itemRemoved', () => {
    console.log('[HCL Mini-Cart] Item removed, updating...');
    updateMiniCart();
  });

  onCartEvent('cartUpdated', () => {
    updateMiniCart();
  });

  // Refresh cart periodically (every 30 seconds)
  const refreshInterval = setInterval(async () => {
    if (document.contains(block)) {
      await updateMiniCart();
    } else {
      clearInterval(refreshInterval);
      unsubscribe();
    }
  }, 30000);

  console.log('[HCL Mini-Cart] Initialization complete');
}

/**
 * Get CSS class for inventory status
 *
 * @param {string} status - Inventory status from HCL
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
  if (!status) return 'status-unknown';
  const statusLower = status.toLowerCase();
  if (statusLower.includes('available')) return 'status-available';
  if (statusLower.includes('backorder')) return 'status-backorder';
  if (statusLower.includes('unavailable')) return 'status-unavailable';
  return 'status-unknown';
}

/**
 * Escape HTML to prevent XSS
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add HCL mini-cart styles
 */
export function injectHclMiniCartStyles() {
  const styles = `
    /* HCL Mini-Cart Styling */
    .commerce-mini-cart__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 6px;
      background-color: #e74c3c;
      color: white;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: bold;
      position: absolute;
      top: -8px;
      right: -8px;
    }

    .commerce-mini-cart__toggle {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.5rem;
      padding: 0.5rem;
    }

    .commerce-mini-cart__dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      min-width: 350px;
      max-height: 500px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      margin-top: 0.5rem;
    }

    .commerce-mini-cart__dropdown[aria-hidden="true"] {
      display: none;
    }

    .commerce-mini-cart__header {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .commerce-mini-cart__header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .commerce-mini-cart__close {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0;
      color: #666;
    }

    .commerce-mini-cart__items {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem 0;
      max-height: 350px;
    }

    .commerce-mini-cart__empty,
    .commerce-mini-cart__error {
      padding: 2rem 1rem;
      text-align: center;
      color: #999;
      font-size: 0.9rem;
      margin: 0;
    }

    .commerce-mini-cart__error {
      color: #e74c3c;
    }

    .commerce-mini-cart__item {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f0f0f0;
    }

    .commerce-mini-cart__item:last-child {
      border-bottom: none;
    }

    .commerce-mini-cart__item-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
    }

    .commerce-mini-cart__item-name {
      font-weight: 500;
      font-size: 0.9rem;
      flex: 1;
      word-break: break-word;
    }

    .commerce-mini-cart__item-price {
      font-weight: 600;
      color: #2c3e50;
      margin-left: 0.5rem;
    }

    .commerce-mini-cart__item-details {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 0.5rem;
    }

    .commerce-mini-cart__item-status {
      margin-top: 0.5rem;
    }

    .commerce-mini-cart__item-status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-available {
      background-color: #d4edda;
      color: #155724;
    }

    .status-backorder {
      background-color: #fff3cd;
      color: #856404;
    }

    .status-unavailable {
      background-color: #f8d7da;
      color: #721c24;
    }

    .status-unknown {
      background-color: #e2e3e5;
      color: #383d41;
    }

    .commerce-mini-cart__footer {
      padding: 1rem;
      border-top: 1px solid #eee;
      background-color: #f9f9f9;
    }

    .commerce-mini-cart__footer p {
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
    }

    .commerce-mini-cart__total {
      font-weight: 700;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .commerce-mini-cart__view-cart {
      display: block;
      width: 100%;
      padding: 0.75rem;
      background-color: #007bff;
      color: white;
      text-align: center;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      transition: background-color 0.2s;
    }

    .commerce-mini-cart__view-cart:hover {
      background-color: #0056b3;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
