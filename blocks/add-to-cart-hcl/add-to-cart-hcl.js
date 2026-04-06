/**
 * Add to Cart HCL Block
 * Integrates with HCL Commerce cart service for product addition
 *
 * Block Configuration (from Word document):
 * - Product SKU (from block config or parent context)
 * - Button text (default: "Add to Cart")
 * - Button variant (primary, secondary, default: primary)
 * - Show loading state (default: true)
 * - Redirect to cart on success (default: false)
 *
 * Usage in product blocks:
 * <div class="add-to-cart-hcl">
 *   <div>SKU12345</div>
 *   <div>Add to Cart</div>
 * </div>
 */

import { readBlockConfig } from '../../scripts/aem.js';

// Dynamic import for cart manager to avoid circular dependencies
async function loadCartManager() {
  try {
    const { default: CartManager } = await import('../../scripts/cart-manager.js');
    return CartManager;
  } catch (error) {
    console.error('Failed to load cart manager:', error);
    return null;
  }
}

export default async function decorate(block) {
  const config = readBlockConfig(block);

  // Get SKU and product info from block content
  const skuElement = block.querySelector('div');
  const sku = config.sku || (skuElement?.textContent?.trim() || '');

  if (!sku) {
    block.classList.add('add-to-cart-error');
    block.innerHTML = '<p class="error-message">Product SKU is required</p>';
    return;
  }

  // Configuration with defaults
  const {
    'button-text': buttonText = 'Add to Cart',
    'button-variant': buttonVariant = 'primary',
    'show-loading': showLoading = 'true',
    'redirect-on-success': redirectOnSuccess = 'false',
    'success-message': successMessage = 'Added to cart!',
    'error-message': errorMsg = 'Failed to add to cart',
  } = config;

  // Create button element
  const button = document.createElement('button');
  button.className = `button ${buttonVariant}`;
  button.textContent = buttonText;
  button.dataset.sku = sku;
  button.type = 'button';

  // Create loading indicator (hidden by default)
  const loader = document.createElement('span');
  loader.className = 'loader';
  loader.textContent = '...';
  loader.style.display = 'none';

  // Create message container
  const message = document.createElement('div');
  message.className = 'message';
  message.style.display = 'none';

  // Clear block and add button + loaders
  block.classList.add('add-to-cart-hcl');
  block.innerHTML = '';
  block.appendChild(button);
  block.appendChild(loader);
  block.appendChild(message);

  // Load cart manager and attach event handler
  loadCartManager().then((CartManager) => {
    if (!CartManager) {
      button.disabled = true;
      message.className = 'message error';
      message.textContent = 'Cart system unavailable';
      message.style.display = 'block';
      return;
    }

    button.addEventListener('click', async (e) => {
      e.preventDefault();

      // Disable button and show loading state
      button.disabled = true;
      if (showLoading === 'true') {
        button.style.visibility = 'hidden';
        loader.style.display = 'inline';
      }

      // Hide previous message
      message.style.display = 'none';
      message.className = 'message';

      try {
        // Add to cart using HCL service
        const cartStore = CartManager.getInstance();
        const quantity = parseInt(
          block.parentElement?.querySelector('[data-quantity]')?.value || '1',
          10,
        );

        await cartStore.addToCart(sku, quantity);

        // Show success message
        message.className = 'message success';
        message.textContent = successMessage;
        message.style.display = 'block';

        // Reset button after 2 seconds
        setTimeout(() => {
          button.disabled = false;
          if (showLoading === 'true') {
            button.style.visibility = 'visible';
            loader.style.display = 'none';
          }
        }, 2000);

        // Optionally redirect to cart
        if (redirectOnSuccess === 'true') {
          setTimeout(() => {
            window.location.href = '/cart';
          }, 1000);
        }

        // Dispatch custom event for tracking
        block.dispatchEvent(
          new CustomEvent('addedToCart', {
            detail: { sku, quantity },
            bubbles: true,
            composed: true,
          }),
        );
      } catch (error) {
        // Show error message
        message.className = 'message error';
        message.textContent = `${errorMsg}: ${error.message || 'Unknown error'}`;
        message.style.display = 'block';

        // Re-enable button
        button.disabled = false;
        if (showLoading === 'true') {
          button.style.visibility = 'visible';
          loader.style.display = 'none';
        }

        // Log error for debugging
        console.error('Add to cart failed:', { sku, error });
      }
    });

    // Check authentication status and update button accordingly
    const checkAuthStatus = () => {
      const authService = CartManager.getAuthService?.();
      if (authService && !authService.isAuthenticated?.()) {
        button.disabled = true;
        button.title = 'Please login to add items to cart';
        button.classList.add('disabled');
      } else {
        button.disabled = false;
        button.title = '';
        button.classList.remove('disabled');
      }
    };

    // Check on load
    checkAuthStatus();

    // Subscribe to auth changes
    if (CartManager.onAuthChange) {
      CartManager.onAuthChange(checkAuthStatus);
    }
  });
}
