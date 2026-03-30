/**
 * HCL Cart Initializer
 * Main entry point for HCL Commerce cart integration
 * Initializes PDP, PLP, and mini-cart integrations
 */

import { initializeHclPdpIntegration } from '../hcl-pdp-integration.js';
import { initializeHclPlpIntegration } from '../hcl-plp-integration.js';
import { initializeHclMiniCartIntegration } from '../hcl-mini-cart-integration.js';

/**
 * Initialize all HCL integrations
 * Call this from scripts.js after blocks are decorated
 */
export function initializeHclCart() {
  console.log('[HCL Cart] Initializing HCL Commerce cart integration');

  // Set up PDP integration
  const pdpBlock = document.querySelector('[class*="product-details"]');
  if (pdpBlock) {
    initializeHclPdpIntegration(pdpBlock);
  }

  // Set up PLP integration
  const plpBlock = document.querySelector('[class*="product-list"], [class*="plp"]');
  if (plpBlock) {
    initializeHclPlpIntegration(plpBlock);
  }

  // Set up mini-cart integration
  const miniCartBlock = document.querySelector('[class*="mini-cart"], [class*="cart"]');
  if (miniCartBlock) {
    initializeHclMiniCartIntegration(miniCartBlock);
  }

  console.log('[HCL Cart] Initialization complete');
}

export default { initializeHclCart };
