/* eslint-disable no-console, no-unused-vars */
/**
 * HCL Commerce PLP Integration
 * Integrates HCL add-to-cart functionality with product listing pages (PLP)
 */

import {
  addToHclCart,
  createHclGuestSession,
  emitCartEvent,
} from './hcl-commerce-api.js';

/**
 * Initialize HCL PLP integration
 * Sets up add-to-cart for all products on the PLP
 */
export async function initializeHclPlpIntegration(plpBlock) {
  if (!plpBlock) {
    console.log('[HCL PLP] No PLP block provided');
    return;
  }

  console.log('[HCL PLP] Initializing HCL PLP integration');

  // Wait for drop-ins to initialize
  setTimeout(() => {
    setupPlpAddToCartButtons(plpBlock);
  }, 500);
}

/**
 * Find and override add-to-cart buttons for all products
 */
function setupPlpAddToCartButtons(plpBlock) {
  // Find all product cards/items
  const productCards = plpBlock.querySelectorAll('[class*="product"], [class*="item"], [data-product]');

  console.log(`[HCL PLP] Found ${productCards.length} product cards`);

  productCards.forEach((card, index) => {
    const addToCartBtn = card.querySelector(
      'button[class*="add"], button[class*="cart"], [data-test="add-to-cart"]',
    );

    if (addToCartBtn) {
      // Extract product info from card
      const partNumber = card.getAttribute('data-sku')
        || card.getAttribute('data-part-number')
        || card.querySelector('[data-sku]')?.textContent;

      const productName = card.getAttribute('data-product-name')
        || card.querySelector('[class*="name"], [class*="title"]')?.textContent
        || 'Product';

      if (partNumber) {
        // Override click handler
        addToCartBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await handlePlpAddToCart(
            addToCartBtn,
            partNumber.trim(),
            productName.trim(),
          );
        });

        console.log(`[HCL PLP] Setup button for product: ${productName}`);
      }
    }
  });
}

/**
 * Handle add-to-cart for PLP products
 */
async function handlePlpAddToCart(button, partNumber, productName) {
  try {
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Adding...';

    // Ensure session exists
    if (!sessionStorage.getItem('hcl_wctoken')) {
      await createHclGuestSession();
    }

    // Add to cart
    const result = await addToHclCart(partNumber, 1);

    if (result.success) {
      button.textContent = '✓ Added';
      button.classList.add('hcl-plp__success');

      emitCartEvent('itemAdded', {
        partNumber,
        name: productName,
        quantity: 1,
        source: 'plp',
      });

      // Reset after 2 seconds
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('hcl-plp__success');
        button.disabled = false;
      }, 2000);
    } else {
      throw new Error('Failed to add to cart');
    }
  } catch (error) {
    console.error('[HCL PLP] Error adding to cart:', error);
    button.textContent = '✗ Error';
    button.classList.add('hcl-plp__error');

    emitCartEvent('error', {
      action: 'plpAddToCart',
      product: partNumber,
      error: error.message,
    });

    // Reset after 3 seconds
    setTimeout(() => {
      button.disabled = false;
      button.textContent = 'Add to Cart';
      button.classList.remove('hcl-plp__error');
    }, 3000);
  }
}

export default {
  initializeHclPlpIntegration,
  setupPlpAddToCartButtons,
};
