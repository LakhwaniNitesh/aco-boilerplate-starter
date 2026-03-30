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

function getStatusSteps(currentStatus) {
  const steps = [
    { id: 'placed', label: 'Order placed' },
    { id: 'processing', label: 'Processing' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'delivered', label: 'Delivered' },
  ];

  const currentIndex = steps.findIndex((step) => step.id === currentStatus);

  return steps.map((step, index) => ({
    ...step,
    isCompleted: index <= currentIndex,
    isCurrent: index === currentIndex,
  }));
}

export default function OrderItem(item, shippingAddress, orderDate, orderStatus) {
  const imageUrl = item.images.find((img) => img.roles?.includes('thumbnail'))?.url || item.images[0]?.url || '';
  const priceAmount = item.price?.final?.amount?.value || 0;
  const steps = getStatusSteps(orderStatus);

  const component = document.createElement('div');
  component.className = 'order-item';
  component.innerHTML = `
    <div class="order-item-content">
      <div class="order-item-image">
        <img src="${imageUrl}" alt="${item.name}" />
      </div>
      
      <div class="order-item-info">
        <h3 class="order-item-name">${item.name} × ${item.quantity}</h3>
        <div class="order-item-price">${formatCurrency(priceAmount)}</div>
        <div class="order-item-sku">${item.sku}</div>
        
        ${
  shippingAddress
    ? `
          <div class="order-item-shipping">
            <h4>Shipping address</h4>
            <div class="order-item-address">${formatAddress(shippingAddress)}</div>
          </div>
        `
    : ''
}
        
        <div class="order-item-status">
          <div class="order-item-status-tracker">
            ${steps
    .map(
      (step) => `
              <div class="order-item-status-step ${step.isCompleted ? 'completed' : ''} ${step.isCurrent ? 'current' : ''}">
                <div class="order-item-status-line"></div>
                <div class="order-item-status-label">${step.label}</div>
              </div>
            `,
    )
    .join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  return component;
}
