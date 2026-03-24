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

import { CheckoutSummaryItem } from './checkout-summary-item.js';
import { formatCurrency } from '../../../scripts/salesforce/utils.js';

export function renderSummaryDetails(cartData) {
  return `
    <div class="order-summary-row">
      <span class="order-summary-label">Subtotal</span>
      <span class="order-summary-value">${formatCurrency(cartData?.subtotal || 0)}</span>
    </div>
    <div class="order-summary-row">
      <span class="order-summary-label">Shipping</span>
      <span class="order-summary-value">${formatCurrency(cartData?.shippingTotal || 0)}</span>
    </div>
    <div class="order-summary-row">
      <span class="order-summary-label">Taxes</span>
      <span class="order-summary-value">${formatCurrency(cartData?.taxTotal || 0)}</span>
    </div>
    <div class="order-summary-row order-summary-total">
      <span class="order-summary-label">Total</span>
      <span class="order-summary-value">${formatCurrency(cartData?.total || 0)}</span>
    </div>
  `;
}

export function CheckoutSummary(cartData) {
  const component = document.createElement('div');
  component.className = 'order-summary';

  const header = document.createElement('h2');
  header.textContent = 'Order summary';
  component.appendChild(header);

  // Order items
  if (cartData && cartData.items && cartData.items.length > 0) {
    const itemsList = document.createElement('div');
    itemsList.className = 'order-items';
    cartData.items.forEach((item) => {
      itemsList.appendChild(CheckoutSummaryItem(item));
    });
    component.appendChild(itemsList);
  }

  // Summary details
  const summaryDetails = document.createElement('div');
  summaryDetails.className = 'order-summary-details';
  summaryDetails.innerHTML = renderSummaryDetails(cartData);
  component.appendChild(summaryDetails);

  const placeOrderBtn = document.createElement('button');
  placeOrderBtn.type = 'submit';
  placeOrderBtn.className = 'place-order-btn';
  placeOrderBtn.textContent = 'Place order';
  component.appendChild(placeOrderBtn);

  return component;
}
