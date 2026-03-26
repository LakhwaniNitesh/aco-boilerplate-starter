/**
 * HCL Commerce Integration for Product List Page (PLP)
 * Overrides the addToCart functionality to route products to HCL Commerce
 */

import HclSession from './hcl-commerce-api.js';

/**
 * Creates HCL-aware addToCart function for PLP
 * This function will be called by the PLP widget when "Add to Cart" is clicked
 * 
 * @returns {Function} addToCart handler function
 */
export function createHclAddToCartHandler() {
  return async (sku, options = {}, quantity = 1) => {
    try {
      console.log(`[HCL PLP] Adding to cart: SKU=${sku}, Qty=${quantity}`, options);

      // Ensure HCL session exists
      const session = new HclSession();
      if (!session.isValid()) {
        console.log('[HCL PLP] Session invalid, creating new session...');
        await session.createSession();
      }

      // Add product to HCL cart
      const result = await session.addToCart(sku, quantity);

      if (result.success) {
        console.log('[HCL PLP] Successfully added to HCL cart', result);
        
        // Emit custom event for other components to listen
        window.dispatchEvent(new CustomEvent('hcl:product-added-to-cart', {
          detail: { sku, quantity, product: result.product }
        }));

        // Show success message
        showAddToCartNotification(true, `Product added to cart!`);
        
        return result;
      } else {
        console.error('[HCL PLP] Failed to add to cart:', result);
        showAddToCartNotification(false, result.error || 'Failed to add product to cart');
        throw new Error(result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('[HCL PLP] Error adding to cart:', error);
      showAddToCartNotification(false, error.message || 'Error adding to cart');
      throw error;
    }
  };
}

/**
 * Show success/error notification
 * Creates a temporary alert message in the PLP
 * 
 * @param {boolean} isSuccess - Whether the operation was successful
 * @param {string} message - Message to display
 */
function showAddToCartNotification(isSuccess, message) {
  // Remove any existing notifications
  const existing = document.querySelector('.hcl-plp-notification');
  if (existing) {
    existing.remove();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = `hcl-plp-notification ${isSuccess ? 'success' : 'error'}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 20px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    ${isSuccess ? 'background-color: #4caf50; color: white;' : 'background-color: #f44336; color: white;'}
  `;

  document.body.appendChild(notification);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

/**
 * Inject CSS for notifications
 * Called during PLP initialization
 */
export function injectHclPlpStyles() {
  const styleId = 'hcl-plp-styles';
  
  // Check if styles already exist
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .hcl-plp-notification {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      font-weight: 500;
    }

    .hcl-plp-notification.success {
      border-left: 4px solid #45a049;
    }

    .hcl-plp-notification.error {
      border-left: 4px solid #da192c;
    }
  `;

  document.head.appendChild(style);
}

/**
 * Initialize HCL integration for PLP
 * Called by the product-list-page block during decoration
 * 
 * @param {Object} storeConfig - The store configuration object from PLP
 * @returns {Function} The addToCart handler
 */
export async function initializeHclPlpIntegration(storeConfig) {
  try {
    console.log('[HCL PLP] Initializing HCL integration for PLP...');

    // Inject styles
    injectHclPlpStyles();

    // Create HCL-aware addToCart function
    const hclAddToCart = createHclAddToCartHandler();

    // Return the handler so it can be used in the config
    return hclAddToCart;
  } catch (error) {
    console.error('[HCL PLP] Error during initialization:', error);
    throw error;
  }
}

export default {
  initializeHclPlpIntegration,
  createHclAddToCartHandler,
  injectHclPlpStyles,
};
