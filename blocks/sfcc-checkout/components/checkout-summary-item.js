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

import { formatCurrency, getAttribute } from '../../../scripts/salesforce/utils.js';

export function CheckoutSummaryItem(item) {
  const component = document.createElement('div');
  component.className = 'order-item';

  const imageUrl =
    item.images?.find((img) => img.roles?.includes('thumbnail'))?.url ||
    item.images?.[0]?.url ||
    '/images/placeholder.jpg';

  const brand = getAttribute(item.attributes, 'brand');
  const model = getAttribute(item.attributes, 'model');
  const priceAmount = item.price?.final?.amount?.value || 0;

  const attributes = [];
  if (brand) attributes.push(brand);
  if (model) attributes.push(model);
  const attributesHtml =
    attributes.length > 0
      ? `<div class="order-item-attributes">${attributes.join(' | ')}</div>`
      : '';

  component.innerHTML = `
      <div class="order-item-image">
        <img src="${imageUrl}" alt="${item.name}" />
      </div>
      <div class="order-item-details">
        <div class="order-item-header">
          <h4 class="order-item-name">${item.name}</h4>
          <h4 class="order-item-name">x ${item.quantity}</h4>
        </div>
        ${attributesHtml}
        <span class="order-item-sku">${item.sku}</span>
        <div class="order-item-price">${formatCurrency(priceAmount)}</div>
      </div>
    `;

  return component;
}
