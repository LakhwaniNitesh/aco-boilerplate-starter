import { render as provider } from '@dropins/storefront-cart/render.js';
import MiniCart from '@dropins/storefront-cart/containers/MiniCart.js';

// Initializers
import '../../scripts/initializers/cart.js';

import { readBlockConfig } from '../../scripts/aem.js';
import { rootLink } from '../../scripts/scripts.js';

export default async function decorate(block) {
  console.log('[COMMERCE-MINI-CART] Loading HCL mini-cart implementation');
  
  try {
    // Dynamically import the HCL mini-cart decorator
    const hclMiniCartModule = await import('../../blocks/hcl-mini-cart/hcl-mini-cart.js');
    const hclMiniCartDecorate = hclMiniCartModule.default;
    
    // Use our custom HCL mini-cart implementation
    return await hclMiniCartDecorate(block);
  } catch (err) {
    console.error('[COMMERCE-MINI-CART] Error loading HCL mini-cart:', err);
    // Fallback to drop-in if HCL fails
    console.log('[COMMERCE-MINI-CART] Falling back to drop-in MiniCart');
    const {
      'start-shopping-url': startShoppingURL = '',
      'cart-url': cartURL = '',
      'checkout-url': checkoutURL = '',
    } = readBlockConfig(block);

    block.innerHTML = '';

    return provider.render(MiniCart, {
      routeEmptyCartCTA: startShoppingURL ? () => rootLink(startShoppingURL) : undefined,
      routeCart: cartURL ? () => rootLink(cartURL) : undefined,
      routeCheckout: checkoutURL ? () => rootLink(checkoutURL) : undefined,
      routeProduct: (product) => rootLink(`/products/${product.url.urlKey}/${product.topLevelSku}`),
    })(block);
  }
}
