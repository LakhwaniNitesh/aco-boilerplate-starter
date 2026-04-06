import { render as provider } from '@dropins/storefront-cart/render.js';
import MiniCart from '@dropins/storefront-cart/containers/MiniCart.js';

// Initializers
import '../../scripts/initializers/cart.js';

import { readBlockConfig } from '../../scripts/aem.js';
import { rootLink } from '../../scripts/scripts.js';
import hclMiniCartDecorate from '../hcl-mini-cart/hcl-mini-cart.js';

export default async function decorate(block) {
  console.log('[COMMERCE-MINI-CART] Using HCL mini-cart decorator');
  // Use our custom HCL mini-cart implementation
  return hclMiniCartDecorate(block);
}
