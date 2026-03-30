/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { formatCurrency } from '../../../scripts/salesforce/utils.js';
import { rootLink } from '../../../scripts/commerce.js';

export function CartSummary(cartData) {
  const component = document.createElement('div');
  component.className = 'cart-summary';

  component.innerHTML = `
    <h2>Order summary</h2>
    
    <div class="cart-summary-row">
      <span class="cart-summary-label">Subtotal</span>
      <span class="cart-summary-value">${formatCurrency(cartData.totals.grandTotal)}</span>
    </div>
    
    <div class="cart-summary-row">
      <span class="cart-summary-label">Shipping estimate</span>
      <span class="cart-summary-value">${formatCurrency(cartData.totals.shippingTotal)}</span>
    </div>
    
    <div class="cart-summary-row">
      <span class="cart-summary-label">Tax estimate</span>
      <span class="cart-summary-value">${formatCurrency(cartData.totals.taxTotal)}</span>
    </div>
    
    <div class="cart-summary-row cart-summary-total">
      <span class="cart-summary-label">Order total</span>
      <span class="cart-summary-value">${formatCurrency(cartData.totals.grandTotal)}</span>
    </div>
    
    <button class="cart-summary-checkout-btn">Checkout</button>
  `;

  // Navigate to checkout page on button click
  const checkoutBtn = component.querySelector('.cart-summary-checkout-btn');
  checkoutBtn.addEventListener('click', () => {
    window.location.href = rootLink('/checkout');
  });

  return component;
}
