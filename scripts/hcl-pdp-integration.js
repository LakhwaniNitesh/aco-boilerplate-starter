/**
 * HCL Commerce Integration for Product Details Page
 * Adds HCL-specific cart functionality to the PDP
 */
/* eslint-disable no-console, no-unused-vars, import/no-unresolved */

import {
  addToHclCart,
  createHclGuestSession,
  onCartEvent,
  _formatPrice,
  _getSessionStatus,
} from '../../scripts/hcl-commerce-api.js';

/**
 * Initialize HCL Commerce integration on the PDP
 * Attach event listeners and set up cart functionality
 *
 * @param {HTMLElement} block - The block element
 * @param {Object} product - Product data from storefront
 * @returns {Promise<void>}
 */
export async function initializeHclPdpIntegration(block, product) {
  if (!product || !product.sku) {
    console.warn('[HCL PDP] Product data missing, skipping HCL integration');
    return;
  }

  console.log('[HCL PDP] Initializing integration for:', product.sku);

  // Find the add to cart button
  const addToCartButton = block.querySelector('.product-details__buttons__add-to-cart button');
  if (!addToCartButton) {
    console.warn('[HCL PDP] Add to cart button not found');
    return;
  }

  // Create alert container for HCL-specific messages
  const alertContainer = document.createElement('div');
  alertContainer.className = 'hcl-pdp-alert';
  block.insertBefore(alertContainer, block.firstChild);

  /**
   * Show alert message to user
   * @param {string} type - 'success' | 'error' | 'warning'
   * @param {string} message - Alert message
   * @param {number} duration - Duration to show (ms), 0 = persistent
   */
  const showAlert = (type, message, duration = 5000) => {
    const alert = document.createElement('div');
    alert.className = `hcl-alert hcl-alert--${type}`;
    alert.role = 'alert';
    let icon = '!';
    if (type === 'success') {
      icon = '✓';
    } else if (type === 'error') {
      icon = '✕';
    }
    alert.innerHTML = `
      <div class="hcl-alert__content">
        <span class="hcl-alert__icon">${icon}</span>
        <span class="hcl-alert__message">${escapeHtml(message)}</span>
        <button class="hcl-alert__close" aria-label="Close">×</button>
      </div>
    `;

    alert.querySelector('.hcl-alert__close').addEventListener('click', () => {
      alert.remove();
    });

    alertContainer.appendChild(alert);

    if (duration > 0) {
      setTimeout(() => alert.remove(), duration);
    }
  };

  /**
   * Handle add to cart for HCL
   * This function wraps the original add to cart and adds HCL logic
   */
  const handleHclAddToCart = async () => {
    try {
      // Show loading state
      addToCartButton.disabled = true;
      const originalText = addToCartButton.textContent;
      addToCartButton.textContent = 'Adding to HCL Cart...';

      console.log('[HCL PDP] Adding to cart:', product.sku);

      // Ensure HCL session exists
      console.log('[HCL PDP] Creating new HCL session...');
      await createHclGuestSession();

      // Get quantity from the page (look for quantity input)
      const quantityInput = block.querySelector('.product-details__quantity input');
      const quantity = quantityInput ? parseInt(quantityInput.value, 10) : 1;

      // Add to HCL cart using SKU as part number
      const response = await addToHclCart(product.sku, quantity);

      if (response.success) {
        showAlert(
          'success',
          `${product.name} added to cart! (Order: ${response.orderId})`,
          5000,
        );

        // Emit custom event for other components to listen
        const event = new CustomEvent('hcl:product-added-to-cart', {
          detail: {
            sku: product.sku,
            name: product.name,
            quantity,
            orderId: response.orderId,
            orderItemId: response.orderItemId,
          },
        });
        document.dispatchEvent(event);

        console.log('[HCL PDP] Product added successfully:', response);
      } else {
        showAlert('error', 'Failed to add product to cart. Please try again.');
      }
    } catch (error) {
      console.error('[HCL PDP] Error adding to cart:', error);
      showAlert('error', `Error: ${error.message || 'Failed to add to cart'}`);
    } finally {
      // Restore button state
      addToCartButton.disabled = false;
      addToCartButton.textContent = 'Add to Cart';
    }
  };

  // Store the original click handler
  const originalOnClick = addToCartButton.onclick;

  // Replace or wrap the click handler
  addToCartButton.addEventListener('click', async (e) => {
    // Prevent default behavior from the original button
    if (originalOnClick) {
      e.preventDefault();
    }

    // Call HCL integration
    await handleHclAddToCart();

    // Then call the original handler if it exists
    if (originalOnClick && typeof originalOnClick === 'function') {
      try {
        await originalOnClick.call(addToCartButton, e);
      } catch (err) {
        console.warn('[HCL PDP] Original onclick handler error:', err);
      }
    }
  });

  // Listen for HCL cart events and update UI
  const unsubscribe = onCartEvent('itemAdded', (detail) => {
    console.log('[HCL PDP] Cart event received:', detail);
    // UI will show the alert from handleHclAddToCart
  });

  // Cleanup listener when block is removed
  const observer = new MutationObserver(() => {
    if (!document.contains(block)) {
      unsubscribe();
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  console.log('[HCL PDP] Integration initialized successfully');
}

/**
 * Utility: Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Add HCL Commerce styling to the page
 */
export function injectHclStyles() {
  const styles = `
    /* HCL Commerce Alert Styles */
    .hcl-pdp-alert {
      margin-bottom: 1.5rem;
    }

    .hcl-alert {
      padding: 1rem;
      margin-bottom: 0.75rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .hcl-alert--success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .hcl-alert--error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .hcl-alert--warning {
      background-color: #fff3cd;
      color: #856404;
      border: 1px solid #ffeeba;
    }

    .hcl-alert__content {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 0.75rem;
    }

    .hcl-alert__icon {
      font-weight: bold;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .hcl-alert__message {
      flex: 1;
    }

    .hcl-alert__close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: inherit;
      opacity: 0.7;
      padding: 0;
      margin-left: auto;
      flex-shrink: 0;
    }

    .hcl-alert__close:hover {
      opacity: 1;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}
