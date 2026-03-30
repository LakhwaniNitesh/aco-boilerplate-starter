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
import VisaIcon from '../icons/visa.js';

/**
 * Format address for display
 */
function formatAddress(address) {
  if (!address) return '';
  const parts = [
    `${address.firstName} ${address.lastName}`,
    address.address1,
    address.address2,
    `${address.city}, ${address.state} ${address.postalCode}`,
  ].filter(Boolean);
  return parts.join('<br>');
}

export default function OrderSummary(order) {
  const component = document.createElement('div');
  component.className = 'order-summary';

  const billingAddress = order.paymentInfo?.billingAddress || order.shippingAddress;
  const { paymentInfo } = order;

  component.innerHTML = `
    <div class="order-summary-left">
      <div class="order-summary-section">
        <h3>Billing address</h3>
        <div class="order-summary-address">
          ${formatAddress(billingAddress)}
        </div>
      </div>

      <div class="order-summary-section">
        <h3>Payment information</h3>
        <div class="order-summary-payment">
          ${
  paymentInfo?.cardLast4
    ? `
            <div class="order-summary-payment-card">
              ${VisaIcon()}
            </div>
            <div>Ending with ${paymentInfo.cardLast4}</div>
            <div>Expires ${String(paymentInfo.cardExpirationMonth).padStart(2, '0')}/${String(paymentInfo.cardExpirationYear).slice(-2)}</div>
          `
    : '<div>Payment method not available</div>'
}
        </div>
      </div>
    </div>

    <div class="order-summary-right">
      <div class="order-summary-row">
        <span class="order-summary-label">Subtotal</span>
        <span class="order-summary-value">${formatCurrency(order.subtotal)}</span>
      </div>
      
      <div class="order-summary-row">
        <span class="order-summary-label">Shipping</span>
        <span class="order-summary-value">${formatCurrency(order.shippingTotal)}</span>
      </div>
      
      <div class="order-summary-row">
        <span class="order-summary-label">Tax</span>
        <span class="order-summary-value">${formatCurrency(order.taxTotal)}</span>
      </div>
      
      <div class="order-summary-row order-summary-total">
        <span class="order-summary-label">Order total</span>
        <span class="order-summary-value">${formatCurrency(order.total)}</span>
      </div>
    </div>
  `;

  return component;
}
