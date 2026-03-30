/**
 * HCL Commerce PDP Integration
 * Integrates HCL add-to-cart functionality with the Adobe Commerce product details page (PDP)
 *
 * This module:
 * - Intercepts the PDP add-to-cart button clicks
 * - Calls HCL Commerce APIs instead of Adobe Commerce
 * - Displays appropriate loading/success/error states
 * - Emits events for mini-cart and other components to listen to
 */

import { addToHclCart, createHclGuestSession, emitCartEvent, onCartEvent } from './hcl-commerce-api.js';

/**
 * Initialize HCL PDP integration
 * Call this function after the PDP block has been decorated
 * @param {Element} pdpBlock - The PDP block element
 */
export async function initializeHclPdpIntegration(pdpBlock) {
  if (!pdpBlock) {
    console.warn('[HCL PDP] No PDP block provided');
    return;
  }

  // Wait a small amount of time for drop-ins to be rendered
  setTimeout(() => {
    setupAddToCartOverride(pdpBlock);
  }, 100);
}

/**
 * Set up the add-to-cart button override
 * Finds the add-to-cart button and replaces its click handler
 */
function setupAddToCartOverride(pdpBlock) {
  // Try to find add-to-cart button (varies by drop-in version)
  const addToCartButton = pdpBlock.querySelector(
    'button[class*="add-to-cart"], button[class*="AddToCart"], [data-test="add-to-cart"]'
  );

  if (!addToCartButton) {
    console.warn('[HCL PDP] Could not find add-to-cart button in PDP');
    return;
  }

  console.log('[HCL PDP] Found add-to-cart button, setting up override');

  // Store original click handler
  const originalHandler = addToCartButton.onclick;

  // Replace with HCL handler
  addToCartButton.onclick = null;
  addToCartButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleHclAddToCart(pdpBlock, addToCartButton);
  });
}

/**
 * Handle add-to-cart click for HCL
 * Gets product details from the page and adds to HCL cart
 */
async function handleHclAddToCart(pdpBlock, button) {
  try {
    // Disable button and show loading state
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Adding to Cart...';

    // Extract product information from PDP
    const productInfo = extractProductInfo(pdpBlock);

    if (!productInfo || !productInfo.partNumber) {
      throw new Error('Could not extract product information. Please try again.');
    }

    // Get quantity from input
    const quantity = getSelectedQuantity(pdpBlock) || 1;

    console.log('[HCL PDP] Adding to cart:', {
      partNumber: productInfo.partNumber,
      name: productInfo.name,
      quantity,
    });

    // Ensure HCL session exists
    if (!sessionStorage.getItem('hcl_wctoken')) {
      await createHclGuestSession();
    }

    // Add to HCL cart
    const result = await addToHclCart(productInfo.partNumber, quantity);

    if (result.success) {
      showSuccess(button, originalText, productInfo.name);
      emitCartEvent('hcl:pdpAddedToCart', {
        partNumber: productInfo.partNumber,
        name: productInfo.name,
        quantity,
        orderId: result.orderId,
      });
    } else {
      throw new Error('Failed to add product to cart');
    }
  } catch (error) {
    console.error('[HCL PDP] Error adding to cart:', error);
    showError(button, error.message);
    emitCartEvent('error', {
      action: 'pdpAddToCart',
      error: error.message,
    });
  } finally {
    // Re-enable button after 2 seconds
    setTimeout(() => {
      button.disabled = false;
    }, 2000);
  }
}

/**
 * Extract product information from PDP block
 * Looks for data attributes, text content, and common PDP element patterns
 */
function extractProductInfo(pdpBlock) {
  try {
    // Try to get from data attributes
    const partNumber =
      pdpBlock.getAttribute('data-part-number') ||
      pdpBlock.getAttribute('data-sku') ||
      pdpBlock.querySelector('[data-part-number]')?.textContent ||
      pdpBlock.querySelector('[data-sku]')?.textContent;

    const name =
      pdpBlock.getAttribute('data-product-name') ||
      pdpBlock.querySelector('h1')?.textContent ||
      pdpBlock.querySelector('[data-product-name]')?.textContent;

    const productId =
      pdpBlock.getAttribute('data-product-id') ||
      pdpBlock.querySelector('[data-product-id]')?.textContent;

    if (!partNumber) {
      console.warn('[HCL PDP] Part number not found in PDP');
      return null;
    }

    return {
      partNumber: partNumber.trim(),
      name: name ? name.trim() : 'Product',
      productId: productId ? productId.trim() : null,
    };
  } catch (error) {
    console.error('[HCL PDP] Error extracting product info:', error);
    return null;
  }
}

/**
 * Get selected quantity from quantity input
 */
function getSelectedQuantity(pdpBlock) {
  try {
    const quantityInput =
      pdpBlock.querySelector('input[name="quantity"]') ||
      pdpBlock.querySelector('input[type="number"]') ||
      pdpBlock.querySelector('[class*="quantity"] input');

    if (quantityInput) {
      const qty = parseInt(quantityInput.value, 10);
      return qty > 0 ? qty : 1;
    }

    return 1;
  } catch (error) {
    console.error('[HCL PDP] Error getting quantity:', error);
    return 1;
  }
}

/**
 * Show success state
 */
function showSuccess(button, originalText, productName) {
  button.textContent = '✓ Added to Cart';
  button.classList.add('hcl-pdp__success');

  // Show toast/notification if available
  if (typeof window !== 'undefined' && window.showNotification) {
    window.showNotification(`${productName} added to cart!`, 'success');
  }

  // Reset button after 3 seconds
  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('hcl-pdp__success');
  }, 3000);
}

/**
 * Show error state
 */
function showError(button, errorMessage) {
  button.textContent = '✗ Failed';
  button.classList.add('hcl-pdp__error');
  button.title = errorMessage;

  console.error('[HCL PDP] Error:', errorMessage);
}

/**
 * Alternative: Override drop-in AddToCart container behavior
 * For more advanced integration with drop-ins architecture
 */
export function overrideDropinAddToCart(pdpBlock) {
  // This is an alternative approach using drop-in events
  // Subscribe to drop-in add-to-cart events
  if (window.__ADOBE_COMMERCE__ && window.__ADOBE_COMMERCE__.addToCartEvent) {
    window.__ADOBE_COMMERCE__.addToCartEvent.subscribe((cartData) => {
      handleDropinAddToCart(cartData, pdpBlock);
    });
  }
}

/**
 * Handle add-to-cart from drop-in event
 */
async function handleDropinAddToCart(cartData, pdpBlock) {
  try {
    const partNumber = cartData.sku || cartData.partNumber;
    const quantity = cartData.quantity || 1;

    if (!partNumber) {
      throw new Error('No SKU/part number in cart data');
    }

    // Add to HCL instead of default behavior
    const result = await addToHclCart(partNumber, quantity);
    console.log('[HCL PDP] Added via drop-in event:', result);

    emitCartEvent('itemAdded', {
      partNumber,
      quantity,
      source: 'dropin',
    });
  } catch (error) {
    console.error('[HCL PDP] Error in dropin handler:', error);
    emitCartEvent('error', {
      action: 'dropinAddToCart',
      error: error.message,
    });
  }
}

export default {
  initializeHclPdpIntegration,
  setupAddToCartOverride,
  handleHclAddToCart,
  overrideDropinAddToCart,
};
