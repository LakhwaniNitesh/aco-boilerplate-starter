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

import { removeFromCart, updateCartQuantity } from '../../../scripts/salesforce/api.js';
import { debounce, formatCurrency, getAttribute } from '../../../scripts/salesforce/utils.js';
import { TrashIcon } from '../icons/trash.js';
import { CheckmarkIcon } from '../icons/checkmark.js';

const debouncedUpdateQuantity = debounce(async (itemId, quantity) => {
  await updateCartQuantity(itemId, quantity);
}, 500);

export function CartItem(item) {
  // Defensive: ensure `images` is treated as an array. Some upstream flows may set
  // `item.images` to a string or object; coerce into an array so `.find` works.
  const imgs = Array.isArray(item.images)
    ? item.images
    : item.images
      ? (typeof item.images === 'string' ? [{ url: item.images }] : [item.images])
      : [];

  // Helpful debug when images are missing
  // if (process && process.env && process.env.NODE_ENV !== 'production') {
  //   // eslint-disable-next-line no-console
  //   console.debug('CartItem images normalized', item.itemId, imgs);
  // }

  const imageUrl = imgs.find((img) => img.roles?.includes('thumbnail'))?.url || imgs[0]?.url || '';
  const brand = getAttribute(item.attributes, 'brand');
  const model = getAttribute(item.attributes, 'model');
  const priceAmount = item.price?.final?.amount?.value || 0;
  const component = document.createElement('div');
  component.className = 'cart-item';
  component.dataset.itemId = item.itemId;

  console.log('hi', item);
  component.innerHTML = `
    <div class="cart-item-image">
      <img src="${imageUrl}" alt="${item.name}" />
    </div>
    
    <div class="cart-item-details">
      <div class="cart-item-header">
        <div class="cart-item-info">
          <h3 class="cart-item-name">${item.name}</h3>
          <div class="cart-item-attributes">
            ${brand ? `<span class="cart-item-attribute">${brand}</span>` : ''}
            ${model ? `<span class="cart-item-attribute">${model}</span>` : ''}
          </div>
          <div class="cart-item-sku">${item.sku}</div>
          <div class="cart-item-price">${formatCurrency(priceAmount)}</div>
        </div>
        
        <button class="cart-item-remove" aria-label="Remove item">
          ${TrashIcon()}
        </button>
      </div>
      
      <div class="cart-item-footer">
        <div class="cart-item-stock ${item.inStock ? 'in-stock' : 'out-of-stock'}">
          ${CheckmarkIcon()}
          ${item.inStock ? 'In stock' : 'Out of stock'}
        </div>
        
        <div class="cart-item-quantity">
          <button class="quantity-btn" data-action="decrease">−</button>
          <input type="number" value="${item.quantity}" min="1" class="quantity-input" readonly />
          <button class="quantity-btn" data-action="increase">+</button>
        </div>
      </div>
    </div>
  `;

  // Remove item from cart on icon click
  const removeBtn = component.querySelector('.cart-item-remove');
  removeBtn.addEventListener('click', async () => {
    await removeFromCart(item.itemId);
  });

  const decreaseBtn = component.querySelector('[data-action="decrease"]');
  const increaseBtn = component.querySelector('[data-action="increase"]');
  const quantityInput = component.querySelector('.quantity-input');

  // Decrease quantity on button click
  decreaseBtn.addEventListener('click', () => {
    const currentQuantity = parseInt(quantityInput.value, 10);
    if (currentQuantity <= 1) return;
    quantityInput.value = currentQuantity - 1;
    debouncedUpdateQuantity(item.itemId, currentQuantity - 1);
  });

  // Increase quantity on button click
  increaseBtn.addEventListener('click', () => {
    const newQuantity = parseInt(quantityInput.value, 10) + 1;
    quantityInput.value = newQuantity;
    debouncedUpdateQuantity(item.itemId, newQuantity);
  });

  return component;
}
