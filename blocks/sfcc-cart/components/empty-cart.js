import { EmptyCartIcon } from '../icons/empty-cart.js';

/**
 * Create empty cart element
 *
 * @returns {HTMLElement} Empty cart element
 */
export function EmptyCart() {
  const container = document.createElement('div');
  container.className = 'sfcc-cart-empty-cart';

  container.innerHTML = `
    ${EmptyCartIcon()}
    <p>Your cart is empt</p>
  `;

  return container;
}
