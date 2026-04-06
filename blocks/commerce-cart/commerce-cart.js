import { events } from '@dropins/tools/event-bus.js';
import { render as provider } from '@dropins/storefront-cart/render.js';
import * as Cart from '@dropins/storefront-cart/api.js';

// Dropin Containers
import CartSummaryList from '@dropins/storefront-cart/containers/CartSummaryList.js';
import OrderSummary from '@dropins/storefront-cart/containers/OrderSummary.js';
import EstimateShipping from '@dropins/storefront-cart/containers/EstimateShipping.js';
import EmptyCart from '@dropins/storefront-cart/containers/EmptyCart.js';
import Coupons from '@dropins/storefront-cart/containers/Coupons.js';
import GiftCards from '@dropins/storefront-cart/containers/GiftCards.js';
import GiftOptions from '@dropins/storefront-cart/containers/GiftOptions.js';

// API
import { publishShoppingCartViewEvent } from '@dropins/storefront-cart/api.js';

// Initializers
import '../../scripts/initializers/cart.js';

import { readBlockConfig } from '../../scripts/aem.js';
import { rootLink } from '../../scripts/scripts.js';

// Import our cart system
import { getCartState, fetchCartFromHCL } from '../../scripts/simple-cart-state.js';

export default async function decorate(block) {
  // Configuration
  const {
    'hide-heading': hideHeading = 'false',
    'max-items': maxItems,
    'hide-attributes': hideAttributes = '',
    'enable-item-quantity-update': enableUpdateItemQuantity = 'false',
    'enable-item-remove': enableRemoveItem = 'true',
    'enable-estimate-shipping': enableEstimateShipping = 'false',
    'start-shopping-url': startShoppingURL = '',
    'checkout-url': checkoutURL = '',
  } = readBlockConfig(block);

  // Fetch cart from HCL Commerce
  let hclCart = { cartId: null, items: [], total: 0 };
  
  try {
    const getAccessToken = () => {
      try {
        return sessionStorage.getItem('hcl-access-token') || localStorage.getItem('hcl-access-token');
      } catch (e) {
        return null;
      }
    };

    const token = getAccessToken();
    if (token) {
      console.log('[CART] Syncing cart from HCL...');
      hclCart = await fetchCartFromHCL(token);
    } else {
      console.warn('[CART] No authentication token found, cart will be empty');
    }
  } catch (error) {
    console.error('[CART] Failed to fetch cart from HCL:', error.message);
    hclCart = getCartState();
  }

  console.log('[CART] Loading cart page with HCL cart:', hclCart);

  const isEmptyCart = !hclCart || !hclCart.items || hclCart.items.length === 0;

  // Layout
  const fragment = document.createRange().createContextualFragment(`
    <div class="cart__wrapper">
      <div class="cart__left-column">
        <div class="cart__list"></div>
      </div>
      <div class="cart__right-column">
        <div class="cart__order-summary"></div>
        <div class="cart__gift-options"></div>
      </div>
    </div>

    <div class="cart__empty-cart"></div>
  `);

  const $wrapper = fragment.querySelector('.cart__wrapper');
  const $list = fragment.querySelector('.cart__list');
  const $summary = fragment.querySelector('.cart__order-summary');
  const $emptyCart = fragment.querySelector('.cart__empty-cart');
  const $giftOptions = fragment.querySelector('.cart__gift-options');

  block.innerHTML = '';
  block.appendChild(fragment);

  // Toggle Empty Cart
  function toggleEmptyCart(state) {
    if (state) {
      $wrapper.setAttribute('hidden', '');
      $emptyCart.removeAttribute('hidden');
    } else {
      $wrapper.removeAttribute('hidden');
      $emptyCart.setAttribute('hidden', '');
    }
  }

  toggleEmptyCart(isEmptyCart);

  // If cart is not empty, render custom cart display
  if (!isEmptyCart) {
    renderHCLCart(block, hclCart, {
      startShoppingURL,
      checkoutURL,
      hideHeading,
    });
  }
}

/**
 * Render custom HCL cart display
 */
function renderHCLCart(block, cart, options) {
  const { hideHeading, startShoppingURL, checkoutURL } = options;

  // Find the list and summary containers
  const $list = block.querySelector('.cart__list');
  const $summary = block.querySelector('.cart__order-summary');

  if (!$list || !$summary) {
    console.warn('[CART] Cart containers not found');
    return;
  }

  // Render cart items
  const itemsHTML = cart.items
    .map((item) => `
      <div class="cart-item" data-sku="${item.sku}">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__details">
          <span class="cart-item__quantity">Qty: ${item.quantity}</span>
          <span class="cart-item__price">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
      </div>
    `)
    .join('');

  // Render order summary
  const summaryHTML = `
    <div class="order-summary">
      <div class="order-summary__row">
        <span>Subtotal:</span>
        <span>$${cart.total.toFixed(2)}</span>
      </div>
      <div class="order-summary__row">
        <span>Shipping:</span>
        <span>$0.00</span>
      </div>
      <div class="order-summary__row order-summary__total">
        <span>Total:</span>
        <span>$${cart.total.toFixed(2)}</span>
      </div>
      ${
        checkoutURL
          ? `<a href="${checkoutURL}" class="button button-primary">Proceed to Checkout</a>`
          : ''
      }
    </div>
  `;

  $list.innerHTML = itemsHTML;
  $summary.innerHTML = summaryHTML;

  console.log('[CART] Rendered HCL cart with', cart.items.length, 'items');
}
